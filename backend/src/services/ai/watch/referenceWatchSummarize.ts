import {
  aiWatchSummarizeResultSchema,
  pricingReferencesWatchSummarizeResponseSchema,
  type AiWatchSummarizeResult,
  type PricingReferencesWatchSummarizeInput,
  type PricingReferencesWatchSummarizeResponse,
} from "../../../../../shared/schemas/ai.schema.ts";
import { httpError } from "../../../middleware/errorHandler.ts";
import type { AuthContext, AuthenticatedDbAccess, DbClient } from "../../../types.ts";
import { resolveAssistantAccess } from "../aiAccess.ts";
import {
  computeAiCost,
  estimateWatchReservation,
  persistAiOutcome,
  REFERENCE_WATCH_FEATURE,
  REFERENCE_WATCH_TIMEOUT_MS,
  reserveAiRequest,
  resolveAiRun,
  type AiReservation,
  type AiUsageRecord,
  type ResolvedAiRun,
} from "../aiRunContext.ts";
import type {
  AgentRuntime,
  StructuredRunResult,
  StructuredRunUsage,
} from "../runtime/agentRuntime.ts";
import { createAiSdkAgentRuntime } from "../runtime/aiSdkRuntime.ts";
import { buildReferenceWatchFacts } from "../../pricing/references/referenceWatchFacts.ts";
import type { ReferenceWatchFacts } from "../../pricing/references/referenceWatchFacts.schema.ts";
import { buildWatchPrompt, evaluateWatchOutput } from "./referenceWatchPrompt.ts";

const EMPTY_USAGE: StructuredRunUsage = {
  inputTokens: 0,
  outputTokens: 0,
  cachedInputTokens: 0,
  reasoningTokens: 0,
};

export type WatchDb = AuthenticatedDbAccess;

export type ReferenceWatchSummarizeDeps = {
  runtime: AgentRuntime;
  resolveAccess: typeof resolveAssistantAccess;
  resolveRun: typeof resolveAiRun;
  reserve: typeof reserveAiRequest;
  buildFacts: typeof buildReferenceWatchFacts;
  persistOutcome: typeof persistAiOutcome;
};

const defaultRuntime = createAiSdkAgentRuntime();

export const defaultReferenceWatchSummarizeDeps: ReferenceWatchSummarizeDeps = {
  runtime: defaultRuntime,
  resolveAccess: resolveAssistantAccess,
  resolveRun: resolveAiRun,
  reserve: reserveAiRequest,
  buildFacts: buildReferenceWatchFacts,
  persistOutcome: persistAiOutcome,
};

const readErrorCode = (error: unknown): string => {
  const code = typeof error === "object" && error !== null
    ? Reflect.get(error, "code")
    : undefined;
  return typeof code === "string" ? code : "AI_DIAGNOSTIC_ERROR";
};

const readErrorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : "L analyse par l IA a echoue.";

const readUsage = (error: unknown): StructuredRunUsage => {
  const usage = typeof error === "object" && error !== null
    ? Reflect.get(error, "usage")
    : undefined;
  if (
    typeof usage === "object" && usage !== null &&
    typeof Reflect.get(usage, "inputTokens") === "number"
  ) {
    return usage as StructuredRunUsage;
  }
  return EMPTY_USAGE;
};

const totalTokens = (usage: StructuredRunUsage): number =>
  usage.inputTokens + usage.outputTokens;

const asCachedResponse = (
  value: unknown,
): PricingReferencesWatchSummarizeResponse | null => {
  const parsed = pricingReferencesWatchSummarizeResponseSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
};

const cachedResponseMatchesFacts = (
  cached: PricingReferencesWatchSummarizeResponse,
  facts: ReferenceWatchFacts,
): boolean =>
  cached.run.run_id === facts.run.run_id &&
  cached.run.base_snapshot_id === facts.run.base_snapshot_id &&
  cached.run.target_snapshot_id === facts.run.target_snapshot_id;

export const createReferenceWatchSummarize = (
  deps: ReferenceWatchSummarizeDeps,
) =>
async (
  dbs: WatchDb,
  authContext: AuthContext,
  requestId: string,
  input: PricingReferencesWatchSummarizeInput,
): Promise<PricingReferencesWatchSummarizeResponse> => {
  const { access, run } = await dbs.withPrivilegedTransaction(async (db) => ({
    access: await deps.resolveAccess(db, authContext, REFERENCE_WATCH_FEATURE),
    run: await deps.resolveRun(db, REFERENCE_WATCH_FEATURE),
  }));
  if (!access.allowed) {
    throw httpError(
      403,
      "AUTH_FORBIDDEN",
      access.reason ?? "Acces non autorise",
    );
  }

  const { client_request_id, ...selector } = input;
  const facts = await dbs.withUserTransaction((db) =>
    deps.buildFacts(db, authContext, requestId, selector)
  );
  const estimate = estimateWatchReservation(run.model, facts.bounds.used_bytes);
  const reservation = await dbs.withPrivilegedTransaction((db) => deps.reserve(db, {
    feature: REFERENCE_WATCH_FEATURE,
    userId: authContext.userId,
    agencyId: authContext.activeAgencyId,
    clientRequestId: client_request_id,
    estimatedTokens: estimate.tokens,
    estimatedCost: estimate.cost,
  }));

  if (reservation.status === "success") {
    const cached = asCachedResponse(reservation.cachedResponse);
    if (cached && cachedResponseMatchesFacts(cached, facts)) return cached;
    if (cached) {
      throw httpError(
        409,
        "CONFLICT",
        "Cette cle d idempotence appartient a une autre analyse.",
      );
    }
    throw httpError(
      409,
      "CONFLICT",
      "La reservation idempotente existe sans reponse rejouable.",
    );
  }
  if (reservation.status === "blocked") {
    throw httpError(
      429,
      "AI_QUOTA_EXCEEDED",
      reservation.errorMessage ?? "Quota IA interne atteint.",
    );
  }
  if (reservation.status === "error") {
    throw httpError(
      502,
      "AI_DIAGNOSTIC_ERROR",
      reservation.errorMessage ?? "L analyse par l IA a echoue.",
    );
  }
  if (!reservation.isNew && reservation.status === "reserved") {
    throw httpError(
      409,
      "CONFLICT",
      "Une analyse identique est deja en cours.",
    );
  }

  return executeReservedRun(
    deps,
    dbs,
    authContext,
    requestId,
    client_request_id,
    run,
    facts,
    reservation,
  );
};

const validatedFactIds = (result: AiWatchSummarizeResult): string[] => {
  const ids: string[] = [];
  const seen = new Set<string>();
  const add = (value: string) => {
    if (seen.has(value)) return;
    seen.add(value);
    ids.push(value);
  };
  for (const id of result.summary_fact_ids) add(id);
  for (const item of result.priority_anomalies) {
    for (const id of item.evidence_fact_ids) add(id);
    for (const id of item.recommendation_fact_ids) add(id);
  }
  for (const item of result.recommendations) {
    for (const id of item.fact_ids) add(id);
  }
  return ids;
};

const executeReservedRun = async (
  deps: ReferenceWatchSummarizeDeps,
  dbs: WatchDb,
  authContext: AuthContext,
  requestId: string,
  clientRequestId: string,
  run: ResolvedAiRun,
  facts: ReferenceWatchFacts,
  reservation: AiReservation,
): Promise<PricingReferencesWatchSummarizeResponse> => {
  const prompt = buildWatchPrompt(
    run.prompt.body,
    run.prompt.allowedVariables,
    facts,
  );
  const startedAt = Date.now();

  let generated: StructuredRunResult<AiWatchSummarizeResult>;
  try {
    generated = await deps.runtime.runStructured({
      provider: run.model.provider,
      modelId: run.model.modelId,
      credentials: run.credentials,
      instructions: prompt.instructions,
      prompt: prompt.prompt,
      schema: aiWatchSummarizeResultSchema,
      timeoutMs: REFERENCE_WATCH_TIMEOUT_MS,
      maxOutputTokens: run.model.maxOutputTokens,
      temperature: run.model.temperature,
    });
    generated = {
      ...generated,
      output: evaluateWatchOutput(generated.output, facts),
    };
  } catch (error) {
    const usage = readUsage(error);
    const cost = computeAiCost(run.model, usage);
    await dbs.withPrivilegedTransaction((db) => persistRunOutcome(deps, db, {
      requestId,
      authContext,
      run,
      facts,
      reservationId: reservation.id,
      usage,
      costAmount: cost.amount,
      currency: cost.currency,
      status: "error",
      errorCode: readErrorCode(error),
      errorMessage: readErrorMessage(error),
      latencyMs: Date.now() - startedAt,
      response: null,
      metadata: {
        vertical: "reference_watch",
        run_id: facts.run.run_id,
        client_request_id: clientRequestId,
      },
    }));
    throw error;
  }

  const cost = computeAiCost(run.model, generated.usage);
  const response = pricingReferencesWatchSummarizeResponseSchema.parse({
    ok: true,
    request_id: requestId,
    result: generated.output,
    usage: {
      provider: run.model.provider,
      model_id: run.model.modelId,
      input_tokens: generated.usage.inputTokens,
      output_tokens: generated.usage.outputTokens,
      cached_input_tokens: generated.usage.cachedInputTokens,
      reasoning_tokens: generated.usage.reasoningTokens,
    },
    cost,
    prompt_version_id: run.prompt.versionId,
    model_config_id: run.model.id,
    feature: REFERENCE_WATCH_FEATURE,
    run: {
      run_id: facts.run.run_id,
      base_snapshot_id: facts.run.base_snapshot_id,
      target_snapshot_id: facts.run.target_snapshot_id,
      truncated: facts.bounds.truncated,
      used_bytes: facts.bounds.used_bytes,
    },
  });
  await dbs.withPrivilegedTransaction((db) => persistRunOutcome(deps, db, {
    requestId,
    authContext,
    run,
    facts,
    reservationId: reservation.id,
    usage: generated.usage,
    costAmount: cost.amount,
    currency: cost.currency,
    status: "success",
    errorCode: null,
    errorMessage: null,
    latencyMs: generated.latencyMs,
    response,
    metadata: {
      vertical: "reference_watch",
      finish_reason: generated.finishReason,
      run_id: facts.run.run_id,
      truncated: facts.bounds.truncated,
      client_request_id: clientRequestId,
      fact_id: validatedFactIds(generated.output),
    },
  }));
  return response;
};

const persistRunOutcome = async (
  deps: ReferenceWatchSummarizeDeps,
  serviceDb: DbClient,
  input: {
    requestId: string;
    authContext: AuthContext;
    run: ResolvedAiRun;
    facts: ReferenceWatchFacts;
    reservationId: string;
    usage: StructuredRunUsage;
    costAmount: number | null;
    currency: string;
    status: "success" | "error";
    errorCode: string | null;
    errorMessage: string | null;
    latencyMs: number;
    response: PricingReferencesWatchSummarizeResponse | null;
    metadata: Record<string, unknown>;
  },
): Promise<void> => {
  const usageRecord: AiUsageRecord = {
    requestId: input.requestId,
    feature: REFERENCE_WATCH_FEATURE,
    provider: input.run.model.provider,
    modelId: input.run.model.modelId,
    modelConfigId: input.run.model.id,
    promptVersionId: input.run.prompt.versionId,
    userId: input.authContext.userId,
    agencyId: input.authContext.activeAgencyId,
    usage: input.usage,
    costAmount: input.costAmount,
    currency: input.currency,
    status: input.status,
    errorCode: input.errorCode,
    errorMessage: input.errorMessage,
    latencyMs: input.latencyMs,
    metadata: input.metadata,
  };
  await deps.persistOutcome(serviceDb, {
    usage: usageRecord,
    finalization: {
      reservationId: input.reservationId,
      status: input.status,
      actualTokens: totalTokens(input.usage),
      actualCost: input.costAmount,
      response: input.response,
      errorCode: input.errorCode,
      errorMessage: input.errorMessage,
    },
  });
};

export const summarizeReferenceWatch = createReferenceWatchSummarize(
  defaultReferenceWatchSummarizeDeps,
);

export type { ReferenceWatchFacts };
