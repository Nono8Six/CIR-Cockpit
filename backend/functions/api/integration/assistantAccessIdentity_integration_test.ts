import { assertEquals, assertRejects } from 'std/assert';
import postgres from 'postgres';

import { getDbClient, resetDbClientForTests } from '../../../drizzle/index.ts';
import { resolveModelAndPromptForFeature } from '../services/ai/aiGovernance.ts';
import {
  buildDeterministicToolAnswer,
  getAssistantStatus,
} from '../services/ai/assistantBroker.ts';
import { executeAssistantTool } from '../services/ai/assistantTools.ts';
import type { AuthContext } from '../types.ts';

const enabled = Deno.env.get('RUN_AI_DB_EVALS') === '1';
const databaseUrl = Deno.env.get('DATABASE_URL')?.trim() ?? '';

Deno.test({
  name: 'E4 resout Flash et Pro sans modifier le modele par defaut',
  ignore: !enabled || databaseUrl.length === 0,
  fn: async () => {
    const db = getDbClient();
    assertEquals(Boolean(db), true);
    if (!db) return;
    const sql = postgres(databaseUrl, { max: 1, prepare: false });
    try {
      const [flash, pro] = await Promise.all([
        resolveModelAndPromptForFeature(
          db,
          'assistant.referentiels',
          undefined,
          undefined,
          false,
          { preferredModelId: 'deepseek/deepseek-v4-flash' },
        ),
        resolveModelAndPromptForFeature(
          db,
          'assistant.referentiels',
          undefined,
          undefined,
          false,
          { preferredModelId: 'deepseek/deepseek-v4-pro' },
        ),
      ]);
      assertEquals(flash?.model.model_id, 'deepseek/deepseek-v4-flash');
      assertEquals(pro?.model.model_id, 'deepseek/deepseek-v4-pro');
      assertEquals(flash?.model.is_default, false);
      assertEquals(pro?.model.is_default, false);

      const [superAdmin] = await sql<{ id: string }[]>`
        select id from public.profiles
        where role = 'super_admin' and archived_at is null and is_system = false
        limit 1
      `;
      assertEquals(Boolean(superAdmin), true);
      if (!superAdmin) return;
      const status = await getAssistantStatus(
        db,
        {
          userId: superAdmin.id,
          role: 'super_admin',
          agencyIds: [],
          activeAgencyId: null,
          isSuperAdmin: true,
        },
        crypto.randomUUID(),
        {},
      );
      assertEquals(status, {
        enabled: true,
        model_id: 'deepseek/deepseek-v4-flash',
        reason: null,
      });
    } finally {
      await sql.end({ timeout: 5 });
      await resetDbClientForTests();
    }
  },
});

Deno.test({
  name:
    'assistant access resolves backend identities without relying on auth.uid',
  ignore: !enabled || databaseUrl.length === 0,
  fn: async () => {
    const sql = postgres(databaseUrl, { max: 2, prepare: false });
    try {
      const [superAdmin] = await sql<{ id: string }[]>`
        select id from public.profiles
        where role = 'super_admin' and archived_at is null and is_system = false
        limit 1
      `;
      if (superAdmin) {
        const [resolution] = await sql<{
          allowed: boolean;
          reason: string | null;
          origin: string;
        }[]>`
          select * from private.resolve_ai_feature_access(
            'assistant.referentiels', ${superAdmin.id}::uuid, null
          )
        `;
        assertEquals(resolution, {
          allowed: true,
          reason: null,
          origin: 'superadmin',
        });
      }

      const [member] = await sql<{ user_id: string; agency_id: string }[]>`
        select m.user_id, m.agency_id
        from public.agency_members m
        join public.profiles p on p.id = m.user_id
        where p.role <> 'super_admin' and p.archived_at is null and p.is_system = false
        limit 1
      `;
      if (member) {
        const [resolution] = await sql<{
          allowed: boolean;
          reason: string | null;
          origin: string;
        }[]>`
          select * from private.resolve_ai_feature_access(
            'assistant.referentiels', ${member.user_id}::uuid, ${member.agency_id}::uuid
          )
        `;
        assertEquals(typeof resolution.allowed, 'boolean');
        assertEquals(
          ['user', 'agency', 'global', 'default'].includes(resolution.origin),
          true,
        );
      }

      const identities = await sql<{ id: string }[]>`
        select id from public.profiles
        where archived_at is null and is_system = false
        order by id limit 2
      `;
      if (identities.length === 2) {
        await assertRejects(
          () =>
            sql.begin(async (tx) => {
              await tx.unsafe(
                "select set_config('request.jwt.claims', $1, true)",
                [JSON.stringify({
                  sub: identities[0].id,
                  role: 'authenticated',
                })],
              );
              await tx.unsafe(
                "select * from private.resolve_ai_feature_access('assistant.referentiels', $1::uuid, null)",
                [identities[1].id],
              );
            }),
          Error,
          'Identite d acces IA invalide.',
        );
      }
    } finally {
      await sql.end({ timeout: 5 });
    }
  },
});

Deno.test({
  name:
    'P6 search_schema and bounded FEST ranking isolate two identities and agencies',
  ignore: !enabled || databaseUrl.length === 0,
  fn: async () => {
    const sql = postgres(databaseUrl, { max: 1, prepare: false });
    try {
      const memberships = await sql<{
        user_id: string;
        agency_id: string;
        role: AuthContext['role'];
      }[]>`
        select m.user_id, m.agency_id, p.role
        from public.agency_members m
        join public.profiles p on p.id = m.user_id
        where p.archived_at is null and p.is_system = false
        order by m.agency_id, m.user_id
      `;
      const first = memberships[0];
      const second = memberships.find((membership) =>
        membership.user_id !== first?.user_id &&
        membership.agency_id !== first?.agency_id
      );
      const db = getDbClient();
      assertEquals(Boolean(db), true);
      assertEquals(Boolean(first), true);
      assertEquals(Boolean(second), true);
      if (!db || !first || !second) return;

      const rankedOutputs: unknown[] = [];
      const thresholdOutputs: unknown[] = [];
      const diffSummaryOutputs: unknown[] = [];
      const anomalySummaryOutputs: unknown[] = [];
      for (const [index, membership] of [first, second].entries()) {
        const authContext: AuthContext = {
          userId: membership.user_id,
          role: membership.role,
          agencyIds: [membership.agency_id],
          activeAgencyId: membership.agency_id,
          isSuperAdmin: membership.role === 'super_admin',
        };
        const search = await executeAssistantTool(
          db,
          authContext,
          `p6-schema-search-${index}`,
          'search_schema',
          { terms: ['remise', 'achat'] },
          { surface: 'pricing.references' },
        );
        const tables = Array.isArray(search.output.table_names)
          ? search.output.table_names as string[]
          : [];
        assertEquals(typeof search.output.snapshot_id, 'string');
        assertEquals(
          tables.includes('pricing_segment_purchase_grids'),
          true,
        );
        assertEquals(
          tables.some((name) =>
            name === 'ai_v_purchase_terms' ||
            name === 'ai_v_purchase_terms_active'
          ),
          true,
        );

        const ranking = await executeAssistantTool(
          db,
          authContext,
          `p6-fest-top3-${index}`,
          'rank_purchase_terms',
          { marque: 'FEST', limit: 3 },
          { surface: 'pricing.references' },
        );
        const data = ranking.output.data as Record<string, unknown>;
        assertEquals(ranking.output.ok, true);
        assertEquals(data.marque, 'FEST');
        assertEquals(data.metric, 'remise_ha_pct');
        assertEquals((data.rows as unknown[]).length, 3);
        rankedOutputs.push(data);

        const threshold = await executeAssistantTool(
          db,
          authContext,
          `p6-remise-threshold-${index}`,
          'aggregate_diffs',
          {
            group_by: 'changed_column',
            measure: 'remise',
            direction: 'baisse',
            threshold_pct: 20,
            limit: 20,
          },
          { surface: 'pricing.references' },
        );
        const thresholdData = threshold.output.data as Record<string, unknown>;
        assertEquals(threshold.output.ok, true);
        assertEquals(thresholdData.threshold_pct, 20);
        assertEquals(typeof thresholdData.target_snapshot_id, 'string');
        assertEquals(typeof thresholdData.base_snapshot_id, 'string');
        const groups = thresholdData.groups as Array<Record<string, unknown>>;
        assertEquals(
          groups.every((group) =>
            typeof group.max_delta_pct === 'number' &&
            Math.abs(group.max_delta_pct) > 20
          ),
          true,
        );
        thresholdOutputs.push(thresholdData);

        const diffSummary = await executeAssistantTool(
          db,
          authContext,
          `post-e4-diff-summary-${index}`,
          'get_diff_summary',
          {},
          { surface: 'pricing.references' },
        );
        const diffAnswer = buildDeterministicToolAnswer(
          'get_diff_summary',
          diffSummary.output,
        );
        assertEquals(diffSummary.output.ok, true);
        assertEquals(diffAnswer?.includes('2 553 changements'), true);
        assertEquals(diffAnswer?.includes('2 551 financiers'), true);
        diffSummaryOutputs.push(diffSummary.output);

        const anomalySummary = await executeAssistantTool(
          db,
          authContext,
          `post-e4-anomaly-summary-${index}`,
          'get_anomalies_summary',
          {},
          { surface: 'pricing.references' },
        );
        const anomalyAnswer = buildDeterministicToolAnswer(
          'get_anomalies_summary',
          anomalySummary.output,
        );
        assertEquals(anomalySummary.output.ok, true);
        assertEquals(anomalyAnswer?.includes('603 anomalies'), true);
        assertEquals(
          anomalyAnswer?.includes('101 lignes ont une grille achat incomplète'),
          true,
        );
        assertEquals(
          anomalyAnswer?.includes("500 lignes n'ont pas de codification CIR validée"),
          true,
        );
        anomalySummaryOutputs.push(anomalySummary.output);
      }
      assertEquals(rankedOutputs[1], rankedOutputs[0]);
      assertEquals(thresholdOutputs[1], thresholdOutputs[0]);
      assertEquals(diffSummaryOutputs[1], diffSummaryOutputs[0]);
      assertEquals(anomalySummaryOutputs[1], anomalySummaryOutputs[0]);
    } finally {
      await sql.end({ timeout: 5 });
      await resetDbClientForTests();
    }
  },
});

Deno.test({
  name: 'P5B ai_v views preserve RLS for two authenticated identities',
  ignore: !enabled || databaseUrl.length === 0,
  fn: async () => {
    const sql = postgres(databaseUrl, { max: 2, prepare: false });
    try {
      const identities = await sql<{ id: string }[]>`
        select id from public.profiles
        where archived_at is null and is_system = false
        order by id
        limit 2
      `;
      assertEquals(identities.length, 2);

      for (const identity of identities) {
        const [counts] = await sql.begin(async (tx) => {
          await tx.unsafe(
            "select set_config('request.jwt.claims', $1, true)",
            [JSON.stringify({ sub: identity.id, role: 'authenticated' })],
          );
          await tx.unsafe('set local role authenticated');
          return await tx.unsafe<{
            base_segments: number;
            view_segments: number;
            base_terms: number;
            view_terms: number;
          }[]>(`
            select
              (select count(*)::int
               from public.pricing_supplier_segments s
               join public.pricing_reference_snapshots snap
                 on snap.id = s.snapshot_id and snap.is_active) as base_segments,
              (select count(*)::int
               from public.ai_v_segments_active) as view_segments,
              (select count(*)::int
               from public.pricing_supplier_segments s
               join public.pricing_segment_purchase_grids g
                 on g.segment_id = s.id and g.snapshot_id = s.snapshot_id
               join public.pricing_reference_snapshots snap
                 on snap.id = s.snapshot_id and snap.is_active) as base_terms,
              (select count(*)::int
               from public.ai_v_purchase_terms_active) as view_terms
          `);
        });
        assertEquals(counts.view_segments, counts.base_segments);
        assertEquals(counts.view_terms, counts.base_terms);
      }

      await assertRejects(
        () =>
          sql.begin(async (tx) => {
            await tx.unsafe('set local role anon');
            await tx.unsafe(
              'select count(*) from public.ai_v_purchase_terms_active',
            );
          }),
        Error,
        'permission denied',
      );
    } finally {
      await sql.end({ timeout: 5 });
    }
  },
});
