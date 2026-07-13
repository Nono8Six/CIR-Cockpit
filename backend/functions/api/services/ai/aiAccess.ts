import { and, eq, sql } from "drizzle-orm";

import {
  agencies,
  agency_members,
  ai_feature_grants,
  audit_logs,
  profiles,
} from "../../../../drizzle/schema.ts";
import type {
  AiFeature,
  AiFeatureGrantDeleteInput,
  AiFeatureGrantSaveInput,
  AiFeatureGrantScope,
  AiFeatureGrantsListInput,
  AiMembersAccessOverviewInput,
  AiUsageByMemberInput,
} from "../../../../../shared/schemas/ai.schema.ts";
import {
  aiFeatureGrantMutationResponseSchema,
  aiFeatureGrantsListResponseSchema,
  aiMembersAccessOverviewResponseSchema,
  aiUsageByMemberResponseSchema,
} from "../../../../../shared/schemas/ai.schema.ts";
import { httpError } from "../../middleware/errorHandler.ts";
import type { AuthContext, DbClient } from "../../types.ts";

export const DEFAULT_ASSISTANT_ACCESS = false;

export type AssistantAccessGrant = {
  scope: AiFeatureGrantScope;
  agency_id: string | null;
  user_id: string | null;
  allowed: boolean;
};

export type AssistantAccessResolution = {
  allowed: boolean;
  reason: string | null;
  origin: "superadmin" | "user" | "agency" | "global" | "default";
};

export const resolveAssistantAccessFromGrants = (
  authContext: AuthContext,
  grants: AssistantAccessGrant[],
): AssistantAccessResolution => {
  if (authContext.isSuperAdmin) {
    return { allowed: true, reason: null, origin: "superadmin" };
  }
  const userGrant = grants.find((grant) =>
    grant.scope === "user" && grant.user_id === authContext.userId
  );
  if (userGrant) {
    return {
      allowed: userGrant.allowed,
      reason: userGrant.allowed ? null : "Acces non autorise",
      origin: "user",
    };
  }
  const agencyGrant = authContext.activeAgencyId
    ? grants.find((grant) =>
      grant.scope === "agency" &&
      grant.agency_id === authContext.activeAgencyId
    )
    : undefined;
  if (agencyGrant) {
    return {
      allowed: agencyGrant.allowed,
      reason: agencyGrant.allowed ? null : "Acces non autorise",
      origin: "agency",
    };
  }
  const globalGrant = grants.find((grant) => grant.scope === "global");
  if (globalGrant) {
    return {
      allowed: globalGrant.allowed,
      reason: globalGrant.allowed ? null : "Acces non autorise",
      origin: "global",
    };
  }
  return {
    allowed: DEFAULT_ASSISTANT_ACCESS,
    reason: DEFAULT_ASSISTANT_ACCESS ? null : "Acces non autorise",
    origin: "default",
  };
};

export const resolveAssistantAccess = async (
  db: DbClient,
  authContext: AuthContext,
  feature: AiFeature,
): Promise<AssistantAccessResolution> => {
  let rows: AssistantAccessResolution[];
  try {
    rows = await db.execute<AssistantAccessResolution>(sql`
      select * from private.resolve_ai_feature_access(
        ${feature}, ${authContext.userId}::uuid, ${authContext.activeAgencyId}::uuid
      )
    `);
  } catch {
    throw httpError(
      500,
      "DB_READ_FAILED",
      "Impossible de verifier l acces a l assistant IA.",
    );
  }
  const resolution = rows[0];
  if (!resolution) {
    throw httpError(
      500,
      "DB_READ_FAILED",
      "Resolution de l acces IA impossible.",
    );
  }
  return resolution;
};

type EnrichedGrantRow = {
  id: string;
  feature: AiFeature;
  scope: AiFeatureGrantScope;
  target_id: string | null;
  target_label: string | null;
  target_email: string | null;
  allowed: boolean;
  created_by_name: string | null;
  updated_by_name: string | null;
  created_at: string;
  updated_at: string;
};

const displayNameSql = (prefix: string) =>
  sql.raw(
    `coalesce(${prefix}.display_name, nullif(trim(concat_ws(' ', ${prefix}.first_name, ${prefix}.last_name)), ''), ${prefix}.email)`,
  );

const getEnrichedGrantRows = (
  db: DbClient,
  feature?: AiFeature,
): Promise<EnrichedGrantRow[]> =>
  db.execute<EnrichedGrantRow>(sql`
  select g.id, g.feature, g.scope,
    case when g.scope = 'agency' then g.agency_id when g.scope = 'user' then g.user_id else null end as target_id,
    case when g.scope = 'agency' then a.name when g.scope = 'user' then ${
    displayNameSql("p")
  } else null end as target_label,
    case when g.scope = 'user' then p.email else null end as target_email,
    g.allowed,
    ${displayNameSql("creator")} as created_by_name,
    ${displayNameSql("updater")} as updated_by_name,
    g.created_at, g.updated_at
  from public.ai_feature_grants g
  left join public.agencies a on a.id = g.agency_id
  left join public.profiles p on p.id = g.user_id
  left join public.profiles creator on creator.id = g.created_by
  left join public.profiles updater on updater.id = g.updated_by
  where (${feature ?? null}::text is null or g.feature = ${feature ?? null})
  order by g.feature, case g.scope when 'global' then 1 when 'agency' then 2 else 3 end,
    target_label nulls first
`);

const toGrantContract = (row: EnrichedGrantRow) => ({
  id: row.id,
  feature: row.feature,
  scope: row.scope,
  target: row.target_id && row.target_label
    ? { id: row.target_id, label: row.target_label, email: row.target_email }
    : null,
  allowed: row.allowed,
  created_by_name: row.created_by_name,
  updated_by_name: row.updated_by_name,
  created_at: row.created_at,
  updated_at: row.updated_at,
});

export const listAiFeatureGrants = async (
  db: DbClient,
  _callerId: string,
  requestId: string,
  input: AiFeatureGrantsListInput,
) =>
  aiFeatureGrantsListResponseSchema.parse({
    ok: true,
    request_id: requestId,
    grants: (await getEnrichedGrantRows(db, input.feature)).map(
      toGrantContract,
    ),
  });

const targetCondition = (
  input: AiFeatureGrantSaveInput | AiFeatureGrantDeleteInput,
) =>
  input.scope === "global"
    ? eq(ai_feature_grants.scope, "global")
    : input.scope === "agency"
    ? and(
      eq(ai_feature_grants.scope, "agency"),
      eq(ai_feature_grants.agency_id, input.agency_id!),
    )
    : and(
      eq(ai_feature_grants.scope, "user"),
      eq(ai_feature_grants.user_id, input.user_id!),
    );

const ensureGrantTargetExists = async (
  db: DbClient,
  input: AiFeatureGrantSaveInput,
) => {
  if (input.scope === "agency") {
    const [target] = await db.select({ id: agencies.id }).from(agencies)
      .where(eq(agencies.id, input.agency_id!)).limit(1);
    if (!target) throw httpError(404, "NOT_FOUND", "Agence introuvable.");
  }
  if (input.scope === "user") {
    const [target] = await db.select({ id: profiles.id }).from(profiles)
      .where(eq(profiles.id, input.user_id!)).limit(1);
    if (!target) throw httpError(404, "NOT_FOUND", "Membre introuvable.");
  }
};

export const saveAiFeatureGrant = async (
  db: DbClient,
  callerId: string,
  requestId: string,
  input: AiFeatureGrantSaveInput,
) => {
  await ensureGrantTargetExists(db, input);
  let grantId = "";
  await db.transaction(async (tx) => {
    await tx.execute(
      sql`select pg_advisory_xact_lock(hashtextextended(${`ai-grant:${input.feature}:${input.scope}:${
        input.agency_id ?? input.user_id ?? "global"
      }`}, 0))`,
    );
    const [existing] = await tx.select({ id: ai_feature_grants.id }).from(
      ai_feature_grants,
    )
      .where(
        and(
          eq(ai_feature_grants.feature, input.feature),
          targetCondition(input),
        ),
      ).limit(1);
    const [saved] = existing
      ? await tx.update(ai_feature_grants).set({
        allowed: input.allowed,
        updated_by: callerId,
        updated_at: new Date().toISOString(),
      }).where(eq(ai_feature_grants.id, existing.id)).returning({
        id: ai_feature_grants.id,
      })
      : await tx.insert(ai_feature_grants).values({
        feature: input.feature,
        scope: input.scope,
        agency_id: input.agency_id ?? null,
        user_id: input.user_id ?? null,
        allowed: input.allowed,
        created_by: callerId,
        updated_by: callerId,
      }).returning({ id: ai_feature_grants.id });
    if (!saved) {
      throw httpError(
        500,
        "DB_WRITE_FAILED",
        "Enregistrement de l acces IA impossible.",
      );
    }
    grantId = saved.id;
    await tx.insert(audit_logs).values({
      action: existing
        ? "ai_feature_grant.updated"
        : "ai_feature_grant.created",
      actor_id: callerId,
      actor_is_super_admin: true,
      agency_id: input.agency_id ?? null,
      entity_table: "ai_feature_grants",
      entity_id: saved.id,
      metadata: {
        feature: input.feature,
        scope: input.scope,
        allowed: input.allowed,
        target_name_resolved_by_admin_api: true,
      },
    });
  });
  const row = (await getEnrichedGrantRows(db, input.feature)).find((grant) =>
    grant.id === grantId
  );
  if (!row) {
    throw httpError(
      500,
      "DB_READ_FAILED",
      "Acces IA enregistre mais illisible.",
    );
  }
  return aiFeatureGrantMutationResponseSchema.parse({
    ok: true,
    request_id: requestId,
    grant: toGrantContract(row),
  });
};

export const deleteAiFeatureGrant = async (
  db: DbClient,
  callerId: string,
  requestId: string,
  input: AiFeatureGrantDeleteInput,
) => {
  await db.transaction(async (tx) => {
    const [deleted] = await tx.delete(ai_feature_grants).where(and(
      eq(ai_feature_grants.feature, input.feature),
      targetCondition(input),
    )).returning({
      id: ai_feature_grants.id,
      allowed: ai_feature_grants.allowed,
    });
    if (!deleted) throw httpError(404, "NOT_FOUND", "Acces IA introuvable.");
    await tx.insert(audit_logs).values({
      action: "ai_feature_grant.deleted",
      actor_id: callerId,
      actor_is_super_admin: true,
      agency_id: input.agency_id ?? null,
      entity_table: "ai_feature_grants",
      entity_id: deleted.id,
      metadata: {
        feature: input.feature,
        scope: input.scope,
        previous_allowed: deleted.allowed,
      },
    });
  });
  return aiFeatureGrantMutationResponseSchema.parse({
    ok: true,
    request_id: requestId,
    grant: null,
  });
};

export const getAiMembersAccessOverview = async (
  db: DbClient,
  _callerId: string,
  requestId: string,
  input: AiMembersAccessOverviewInput,
) => {
  const [memberships, grants] = await Promise.all([
    db.select({
      user_id: profiles.id,
      display_name: profiles.display_name,
      first_name: profiles.first_name,
      last_name: profiles.last_name,
      email: profiles.email,
      role: profiles.role,
      agency_id: agency_members.agency_id,
      agency_name: agencies.name,
    }).from(agency_members)
      .innerJoin(profiles, eq(agency_members.user_id, profiles.id))
      .innerJoin(agencies, eq(agency_members.agency_id, agencies.id))
      .where(
        and(
          eq(profiles.is_system, false),
          sql`${profiles.archived_at} is null`,
        ),
      ),
    db.select({
      scope: ai_feature_grants.scope,
      agency_id: ai_feature_grants.agency_id,
      user_id: ai_feature_grants.user_id,
      allowed: ai_feature_grants.allowed,
    }).from(ai_feature_grants).where(
      eq(ai_feature_grants.feature, input.feature),
    ),
  ]);
  const members = memberships.map((member) => {
    const resolution = resolveAssistantAccessFromGrants({
      userId: member.user_id,
      role: member.role,
      agencyIds: [member.agency_id],
      activeAgencyId: member.agency_id,
      isSuperAdmin: member.role === "super_admin",
    }, grants);
    return {
      user_id: member.user_id,
      display_name: member.display_name ??
        ([member.first_name, member.last_name].filter(Boolean).join(" ") ||
          member.email),
      email: member.email,
      role: member.role,
      agency_id: member.agency_id,
      agency_name: member.agency_name,
      allowed: resolution.allowed,
      origin: resolution.origin === "superadmin" ? "user" : resolution.origin,
    };
  });
  return aiMembersAccessOverviewResponseSchema.parse({
    ok: true,
    request_id: requestId,
    members,
  });
};

export const getAiUsageByMember = async (
  db: DbClient,
  _callerId: string,
  requestId: string,
  input: AiUsageByMemberInput,
) => {
  const periodEnd = new Date();
  const periodStart = new Date(periodEnd.getTime() - input.days * 86_400_000);
  const rows = await db.execute<Record<string, unknown>>(sql`
    select e.user_id,
      coalesce(p.display_name, nullif(trim(concat_ws(' ', p.first_name, p.last_name)), ''), p.email) as display_name,
      p.email, e.feature, count(*)::int as calls,
      coalesce(sum(e.input_tokens), 0)::int as input_tokens,
      coalesce(sum(e.output_tokens), 0)::int as output_tokens,
      coalesce(sum(e.input_tokens + e.output_tokens + e.cached_input_tokens + e.reasoning_tokens), 0)::int as total_tokens,
      coalesce(sum(e.cost_amount), 0)::float8 as cost_amount,
      e.currency
    from public.ai_usage_events e
    inner join public.profiles p on p.id = e.user_id
    where e.created_at >= ${periodStart.toISOString()}
      and (${input.feature ?? null}::text is null or e.feature = ${
    input.feature ?? null
  })
    group by e.user_id, p.display_name, p.first_name, p.last_name, p.email, e.feature, e.currency
    order by display_name, e.feature
  `);
  return aiUsageByMemberResponseSchema.parse({
    ok: true,
    request_id: requestId,
    period_start: periodStart.toISOString(),
    period_end: periodEnd.toISOString(),
    members: rows,
  });
};
