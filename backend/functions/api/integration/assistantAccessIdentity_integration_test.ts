import { assertEquals, assertRejects } from "std/assert";
import postgres from "postgres";

import { getDbClient, resetDbClientForTests } from "../../../drizzle/index.ts";
import { executeAssistantTool } from "../services/ai/assistantTools.ts";

const enabled = Deno.env.get("RUN_AI_DB_EVALS") === "1";
const databaseUrl = Deno.env.get("DATABASE_URL")?.trim() ?? "";

Deno.test({
  name:
    "assistant access resolves backend identities without relying on auth.uid",
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
          origin: "superadmin",
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
        assertEquals(typeof resolution.allowed, "boolean");
        assertEquals(
          ["user", "agency", "global", "default"].includes(resolution.origin),
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
                  role: "authenticated",
                })],
              );
              await tx.unsafe(
                "select * from private.resolve_ai_feature_access('assistant.referentiels', $1::uuid, null)",
                [identities[1].id],
              );
            }),
          Error,
          "Identite d acces IA invalide.",
        );
      }
    } finally {
      await sql.end({ timeout: 5 });
    }
  },
});

Deno.test({
  name:
    "P5B search_schema finds purchase terms and executes numeric FEST top 3",
  ignore: !enabled || databaseUrl.length === 0,
  fn: async () => {
    const sql = postgres(databaseUrl, { max: 1, prepare: false });
    try {
      const [identity] = await sql<{ id: string }[]>`
        select id from public.profiles
        where archived_at is null and is_system = false
        order by id
        limit 1
      `;
      const db = getDbClient();
      if (!identity || !db) throw new Error("Contexte DB P5B indisponible.");
      const authContext = {
        userId: identity.id,
        role: "super_admin" as const,
        agencyIds: [],
        activeAgencyId: null,
        isSuperAdmin: true,
      };
      const search = await executeAssistantTool(
        db,
        authContext,
        "p5b-schema-search",
        "search_schema",
        { terms: ["remise", "achat"] },
        { surface: "pricing.references" },
      );
      const tables = Array.isArray(search.output.tables)
        ? search.output.tables as Array<Record<string, unknown>>
        : [];
      const top3 = tables.slice(0, 3).map((table) => table.name);
      assertEquals(
        top3.includes("pricing_segment_purchase_grids"),
        true,
      );
      assertEquals(
        top3.some((name) =>
          name === "ai_v_purchase_terms" ||
          name === "ai_v_purchase_terms_active"
        ),
        true,
      );

      const result = await executeAssistantTool(
        db,
        authContext,
        "p5b-fest-top3",
        "execute_readonly_sql",
        {
          purpose: "Classer les trois CAT_FAB FEST par remise d achat",
          sql:
            "select cat_fab, max(remise_ha_pct) as remise_max from public.ai_v_purchase_terms_active where marque = 'FEST' group by cat_fab order by 2 desc limit 3",
        },
        { surface: "pricing.references" },
      );
      assertEquals(result.output.ok, true);
      assertEquals(Array.isArray(result.output.rows), true);
      assertEquals((result.output.rows as unknown[]).length, 3);
    } finally {
      await sql.end({ timeout: 5 });
      await resetDbClientForTests();
    }
  },
});

Deno.test({
  name: "P5B ai_v views preserve RLS for two authenticated identities",
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
            [JSON.stringify({ sub: identity.id, role: "authenticated" })],
          );
          await tx.unsafe("set local role authenticated");
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
            await tx.unsafe("set local role anon");
            await tx.unsafe(
              "select count(*) from public.ai_v_purchase_terms_active",
            );
          }),
        Error,
        "permission denied",
      );
    } finally {
      await sql.end({ timeout: 5 });
    }
  },
});
