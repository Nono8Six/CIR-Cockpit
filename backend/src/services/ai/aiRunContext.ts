import { and, eq, isNull, sql } from "drizzle-orm";

import {
  ai_feature_model_assignments,
  ai_model_configs,
  ai_prompt_templates,
  ai_prompt_versions,
  ai_provider_configs,
  ai_quota_policies,
  ai_request_reservations,
  ai_usage_events,
} from "../../../drizzle/schema.ts";
import type {
  AiFeature,
  AiProvider,
  AiUsageStatus,
} from "../../../../shared/schemas/ai.schema.ts";
import { httpError } from "../../middleware/errorHandler.ts";
import type { AuthContext, DbClient } from "../../types.ts";
import { decryptSecret, type ModelRow, type ProviderRow } from "./aiGovernance.ts";
import type { StructuredRunUsage } from "./runtime/agentRuntime.ts";
import {
  assertDirectProvider,
  assertDirectProviderEndpoint,
} from "./runtime/providerRegistry.ts";

export const REFERENCE_WATCH_FEATURE = "pricing.references.diagnose" as const;
export const REFERENCE_WATCH_TIMEOUT_MS = 90_000;
const AI_IDEMPOTENCY_TTL_MS = 15 * 60 * 1_000;

export type ResolvedAiModel = {
  id: string;
  provider: AiProvider;
  modelId: string;
  maxOutputTokens: number;
  temperature: number;
  currency: string;
  inputPricePerMillion: number | null;
  outputPricePerMillion: number | null;
  cachedInputPricePerMillion: number | null;
  reasoningPricePerMillion: number | null;
};

export type ResolvedAiPrompt = {
  versionId: string;
  body: string;
  allowedVariables: string[];
};

export type ResolvedAiRun = {
  feature: AiFeature;
  provider: ProviderRow;
  model: ResolvedAiModel;
  credentials: { apiKey: string; baseUrl: string | null };
  prompt: ResolvedAiPrompt;
};

export type AiUsageRecord = {
  requestId: string;
  feature: AiFeature;
  provider: AiProvider;
  modelId: string;
  modelConfigId: string | null;
  promptVersionId: string | null;
  userId: string | null;
  agencyId: string | null;
  usage: StructuredRunUsage;
  costAmount: number | null;
  currency: string;
  status: AiUsageStatus;
  errorCode: string | null;
  errorMessage: string | null;
  latencyMs: number | null;
  metadata?: Record<string, unknown>;
};

export type AiCost = {
  amount: number | null;
  currency: string;
  priced: boolean;
};

const toNumberOrNull = (
  value: string | number | null | undefined,
): number | null => {
  if (value === null || value === undefined) return null;
  const next = typeof value === "number" ? value : Number(value);
  return Number.isFinite(next) ? next : null;
};

const toResolvedModel = (row: ModelRow): ResolvedAiModel => ({
  id: row.id,
  provider: row.provider,
  modelId: row.model_id,
  maxOutputTokens: row.max_output_tokens,
  temperature: toNumberOrNull(row.temperature) ?? 0.2,
  currency: row.currency,
  inputPricePerMillion: toNumberOrNull(row.input_price_per_million),
  outputPricePerMillion: toNumberOrNull(row.output_price_per_million),
  cachedInputPricePerMillion: toNumberOrNull(row.cached_input_price_per_million),
  reasoningPricePerMillion: toNumberOrNull(row.reasoning_price_per_million),
});

export const computeAiCost = (
  model: Pick<
    ResolvedAiModel,
    | "currency"
    | "inputPricePerMillion"
    | "outputPricePerMillion"
    | "cachedInputPricePerMillion"
    | "reasoningPricePerMillion"
  >,
  usage: StructuredRunUsage,
): AiCost => {
  const uncachedInput = Math.max(usage.inputTokens - usage.cachedInputTokens, 0);
  const priced = [
    model.inputPricePerMillion,
    model.outputPricePerMillion,
  ].every((value) => value !== null);
  if (!priced) {
    return { amount: null, currency: model.currency, priced: false };
  }
  const cachedPrice = model.cachedInputPricePerMillion ??
    model.inputPricePerMillion ?? 0;
  const reasoningTokens = Math.min(
    usage.reasoningTokens,
    usage.outputTokens,
  );
  const billedOutput = model.reasoningPricePerMillion === null
    ? usage.outputTokens
    : Math.max(usage.outputTokens - reasoningTokens, 0);
  const reasoningPrice = model.reasoningPricePerMillion ?? 0;
  const amount =
    (uncachedInput * (model.inputPricePerMillion ?? 0) +
      usage.cachedInputTokens * cachedPrice +
      billedOutput * (model.outputPricePerMillion ?? 0) +
      (model.reasoningPricePerMillion === null ? 0 : reasoningTokens) *
        reasoningPrice) / 1_000_000;
  return {
    amount: Number(amount.toFixed(8)),
    currency: model.currency,
    priced: true,
  };
};

export type QuotaUsageSnapshot = {
  daily_calls: number;
  monthly_calls: number;
  daily_tokens: number;
  monthly_tokens: number;
  daily_cost: number;
  monthly_cost: number;
};

export const quotaExceededMessage = (
  policy: {
    daily_call_limit: number | null;
    monthly_call_limit: number | null;
    daily_token_limit: number | null;
    monthly_token_limit: number | null;
    daily_cost_limit: number | null;
    monthly_cost_limit: number | null;
  },
  usage: QuotaUsageSnapshot,
): string | null => {
  if (
    policy.daily_call_limit !== null &&
    usage.daily_calls >= policy.daily_call_limit
  ) {
    return "Quota quotidien d appels IA atteint.";
  }
  if (
    policy.monthly_call_limit !== null &&
    usage.monthly_calls >= policy.monthly_call_limit
  ) {
    return "Quota mensuel d appels IA atteint.";
  }
  if (
    policy.daily_token_limit !== null &&
    usage.daily_tokens >= policy.daily_token_limit
  ) {
    return "Quota quotidien de tokens IA atteint.";
  }
  if (
    policy.monthly_token_limit !== null &&
    usage.monthly_tokens >= policy.monthly_token_limit
  ) {
    return "Quota mensuel de tokens IA atteint.";
  }
  if (
    policy.daily_cost_limit !== null &&
    usage.daily_cost >= policy.daily_cost_limit
  ) {
    return "Quota quotidien de cout IA atteint.";
  }
  if (
    policy.monthly_cost_limit !== null &&
    usage.monthly_cost >= policy.monthly_cost_limit
  ) {
    return "Quota mensuel de cout IA atteint.";
  }
  return null;
};

const emptyUsage = (): QuotaUsageSnapshot => ({
  daily_calls: 0,
  monthly_calls: 0,
  daily_tokens: 0,
  monthly_tokens: 0,
  daily_cost: 0,
  monthly_cost: 0,
});

const loadQuotaUsage = async (
  db: DbClient,
  feature: AiFeature,
  scope: "global" | "agency" | "user",
  agencyId: string | null,
  userId: string | null,
): Promise<QuotaUsageSnapshot> => {
  const [row] = await db.execute<QuotaUsageSnapshot>(sql`
    select
      count(*) filter (where created_at >= date_trunc('day', now()))::int as daily_calls,
      count(*) filter (where created_at >= date_trunc('month', now()))::int as monthly_calls,
      coalesce(sum(input_tokens + output_tokens)
        filter (where created_at >= date_trunc('day', now())), 0)::int as daily_tokens,
      coalesce(sum(input_tokens + output_tokens)
        filter (where created_at >= date_trunc('month', now())), 0)::int as monthly_tokens,
      coalesce(sum(cost_amount) filter (where created_at >= date_trunc('day', now())), 0)::float8 as daily_cost,
      coalesce(sum(cost_amount) filter (where created_at >= date_trunc('month', now())), 0)::float8 as monthly_cost
    from public.ai_usage_events
    where status <> 'blocked'
      and feature = ${feature}
      and (
        ${scope} = 'global'
        or (${scope} = 'agency' and agency_id = ${agencyId}::uuid)
        or (${scope} = 'user' and user_id = ${userId}::uuid)
      )
  `);
  return row ?? emptyUsage();
};

export const assertQuotaAvailable = async (
  db: DbClient,
  authContext: AuthContext,
  feature: AiFeature,
): Promise<void> => {
  const policies = await db
    .select()
    .from(ai_quota_policies)
    .where(eq(ai_quota_policies.enabled, true));
  const applicable = policies.filter((policy) => {
    if (policy.feature !== null && policy.feature !== feature) return false;
    if (policy.scope === "global") return true;
    if (
      policy.scope === "agency" &&
      policy.agency_id === authContext.activeAgencyId
    ) return true;
    return policy.scope === "user" && policy.user_id === authContext.userId;
  });

  for (const policy of applicable) {
    const usage = await loadQuotaUsage(
      db,
      feature,
      policy.scope,
      policy.agency_id,
      policy.user_id,
    );
    const message = quotaExceededMessage({
      daily_call_limit: policy.daily_call_limit,
      monthly_call_limit: policy.monthly_call_limit,
      daily_token_limit: policy.daily_token_limit,
      monthly_token_limit: policy.monthly_token_limit,
      daily_cost_limit: toNumberOrNull(policy.daily_cost_limit),
      monthly_cost_limit: toNumberOrNull(policy.monthly_cost_limit),
    }, usage);
    if (message) throw httpError(429, "AI_QUOTA_EXCEEDED", message);
  }
};

const requireEnabledProvider = async (
  db: DbClient,
  provider: AiProvider,
): Promise<ProviderRow> => {
  const [row] = await db
    .select()
    .from(ai_provider_configs)
    .where(eq(ai_provider_configs.provider, provider))
    .limit(1);
  if (!row || !row.enabled || !row.encrypted_api_key) {
    throw httpError(
      400,
      "AI_CONFIG_MISSING",
      "Fournisseur IA direct inactif ou sans cle.",
    );
  }
  return row;
};

const resolveAssignedOrDefaultModel = async (
  db: DbClient,
  feature: AiFeature,
): Promise<ModelRow> => {
  const [assignment] = await db
    .select()
    .from(ai_feature_model_assignments)
    .where(eq(ai_feature_model_assignments.feature, feature))
    .limit(1);

  if (assignment) {
    const [assigned] = await db
      .select()
      .from(ai_model_configs)
      .where(eq(ai_model_configs.id, assignment.model_config_id))
      .limit(1);
    if (!assigned || !assigned.enabled) {
      throw httpError(
        400,
        "AI_CONFIG_MISSING",
        "Modele assigne a la capacite IA introuvable ou inactif.",
      );
    }
    assertDirectProvider(assigned.provider);
    return assigned;
  }

  const candidates = await db
    .select()
    .from(ai_model_configs)
    .where(eq(ai_model_configs.enabled, true));
  const direct = candidates.filter((row) => {
    try {
      assertDirectProvider(row.provider);
      return true;
    } catch {
      return false;
    }
  });
  const selected = direct.find((row) => row.is_default) ?? direct[0];
  if (!selected) {
    throw httpError(
      400,
      "AI_CONFIG_MISSING",
      "Aucun modele direct n est configure pour cette capacite IA.",
    );
  }
  return selected;
};

const resolvePublishedPrompt = async (
  db: DbClient,
  feature: AiFeature,
): Promise<ResolvedAiPrompt> => {
  const [template] = await db
    .select()
    .from(ai_prompt_templates)
    .where(
      and(
        eq(ai_prompt_templates.feature, feature),
        isNull(ai_prompt_templates.archived_at),
      ),
    )
    .limit(1);
  if (!template) {
    throw httpError(
      400,
      "AI_CONFIG_MISSING",
      "Aucun template de prompt publie n est disponible pour cette capacite.",
    );
  }
  const [version] = await db
    .select()
    .from(ai_prompt_versions)
    .where(
      and(
        eq(ai_prompt_versions.template_id, template.id),
        eq(ai_prompt_versions.status, "published"),
      ),
    )
    .limit(1);
  if (!version) {
    throw httpError(
      400,
      "AI_CONFIG_MISSING",
      "Publiez une version de prompt avant d executer cette capacite.",
    );
  }
  return {
    versionId: version.id,
    body: version.body,
    allowedVariables: template.allowed_variables,
  };
};

export const resolveAiRun = async (
  db: DbClient,
  feature: AiFeature,
): Promise<ResolvedAiRun> => {
  const modelRow = await resolveAssignedOrDefaultModel(db, feature);
  const provider = await requireEnabledProvider(db, modelRow.provider);
  const directProvider = assertDirectProvider(provider.provider);
  assertDirectProviderEndpoint(directProvider, provider.base_url);
  const prompt = await resolvePublishedPrompt(db, feature);
  return {
    feature,
    provider,
    model: toResolvedModel(modelRow),
    credentials: {
      apiKey: await decryptSecret(provider.encrypted_api_key ?? ""),
      baseUrl: null,
    },
    prompt,
  };
};

export type AiReservation = {
  id: string;
  status: "reserved" | "success" | "error" | "blocked";
  isNew: boolean;
  cachedResponse: unknown;
  errorCode: string | null;
  errorMessage: string | null;
};

type ReservationRow = {
  reservation_id: string;
  admission_status: AiReservation["status"];
  is_new: boolean;
  cached_response: unknown;
  cached_error_code: string | null;
  cached_error_message: string | null;
};

export const estimateWatchReservation = (
  model: ResolvedAiModel,
  usedBytes: number,
): { tokens: number; cost: number } => {
  const inputTokens = Math.max(1, Math.ceil(usedBytes / 4));
  const tokens = inputTokens + model.maxOutputTokens;
  const cost = computeAiCost(model, {
    inputTokens,
    outputTokens: model.maxOutputTokens,
    cachedInputTokens: 0,
    reasoningTokens: 0,
  });
  return { tokens, cost: cost.amount ?? 0 };
};

export const reserveAiRequest = async (
  db: DbClient,
  input: {
    feature: AiFeature;
    userId: string;
    agencyId: string | null;
    clientRequestId: string;
    estimatedTokens: number;
    estimatedCost: number;
  },
): Promise<AiReservation> => {
  let rows: ReservationRow[];
  try {
    rows = await db.execute<ReservationRow>(sql`
      select reservation_id, admission_status, is_new,
        cached_response, cached_error_code, cached_error_message
      from private.reserve_ai_assistant_request(
        ${input.feature},
        ${input.userId}::uuid,
        ${input.agencyId}::uuid,
        ${input.clientRequestId}::uuid,
        ${input.estimatedTokens},
        ${input.estimatedCost}
      )
    `);
  } catch {
    throw httpError(
      500,
      "DB_WRITE_FAILED",
      "Impossible de reserver le quota IA.",
    );
  }
  const row = rows[0];
  if (!row) {
    throw httpError(
      500,
      "DB_WRITE_FAILED",
      "Reservation IA sans resultat.",
    );
  }
  return {
    id: row.reservation_id,
    status: row.admission_status,
    isNew: row.is_new,
    cachedResponse: row.cached_response,
    errorCode: row.cached_error_code,
    errorMessage: row.cached_error_message,
  };
};

export type AiReservationFinalization = {
  reservationId: string;
  status: "success" | "error";
  actualTokens: number;
  actualCost: number | null;
  response: Record<string, unknown> | null;
  errorCode: string | null;
  errorMessage: string | null;
};

export const persistAiOutcome = async (
  db: DbClient,
  input: {
    usage: AiUsageRecord;
    finalization: AiReservationFinalization;
  },
): Promise<void> => {
  try {
    await db.transaction(async (tx) => {
      const record = input.usage;
      await tx.insert(ai_usage_events).values({
        request_id: record.requestId,
        feature: record.feature,
        provider: record.provider,
        model_id: record.modelId,
        model_config_id: record.modelConfigId,
        prompt_version_id: record.promptVersionId,
        user_id: record.userId,
        agency_id: record.agencyId,
        input_tokens: record.usage.inputTokens,
        output_tokens: record.usage.outputTokens,
        cached_input_tokens: record.usage.cachedInputTokens,
        reasoning_tokens: record.usage.reasoningTokens,
        cost_amount: record.costAmount === null
          ? null
          : String(record.costAmount),
        currency: record.currency,
        cache_hit: record.status === "cache_hit",
        status: record.status,
        error_code: record.errorCode,
        error_message: record.errorMessage,
        latency_ms: record.latencyMs,
        metadata: record.metadata ?? {},
      });

      const finalization = input.finalization;
      const updated = await tx
        .update(ai_request_reservations)
        .set({
          status: finalization.status,
          actual_tokens: finalization.actualTokens,
          actual_cost_amount: finalization.actualCost === null
            ? null
            : String(finalization.actualCost),
          response: finalization.response,
          error_code: finalization.errorCode,
          error_message: finalization.errorMessage,
          expires_at: new Date(Date.now() + AI_IDEMPOTENCY_TTL_MS).toISOString(),
          updated_at: new Date().toISOString(),
        })
        .where(
          and(
            eq(ai_request_reservations.id, finalization.reservationId),
            eq(ai_request_reservations.status, "reserved"),
          ),
        )
        .returning({ id: ai_request_reservations.id });

      if (updated.length !== 1) {
        throw httpError(
          409,
          "CONFLICT",
          "La reservation IA n est plus finalisable.",
        );
      }
    });
  } catch (error) {
    if (
      typeof error === "object" && error !== null &&
      Reflect.get(error, "code") === "CONFLICT"
    ) {
      throw error;
    }
    throw httpError(
      500,
      "DB_WRITE_FAILED",
      "Impossible d enregistrer le resultat IA.",
    );
  }
};
