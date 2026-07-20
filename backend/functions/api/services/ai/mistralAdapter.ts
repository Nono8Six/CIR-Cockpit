import { z } from "zod/v4";

import type { ErrorCode } from "../../../../../shared/errors/types.ts";
import { type HttpError, httpError } from "../../middleware/errorHandler.ts";

export const MISTRAL_API_BASE_URL = "https://api.mistral.ai/v1";
export const MAX_PUBLIC_RETRY_AFTER_MS = 300_000;

export type MistralMessage = {
  role: "system" | "user" | "assistant" | "tool";
  content: string | null;
  tool_calls?: MistralToolCall[];
  tool_call_id?: string;
  name?: string;
};

export type MistralToolDefinition = {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
    strict?: boolean;
  };
};

export type MistralToolCall = {
  id: string;
  type: "function";
  function: { name: string; arguments: string };
};

export type MistralModelConfig = {
  model_id: string;
  temperature: string | number;
  max_output_tokens: number;
};

export type MistralCorrelation = {
  requestId: string;
  clientRequestId: string;
  assistantRunId: string;
};

export type MistralDiagnostic = {
  stage: "preflight" | "before_send" | "fetch" | "http" | "parse" | "backoff";
  provider: "mistral";
  requestedModel: string;
  servedModel: string | null;
  externalStatus: number | null;
  providerType: string | null;
  providerCode: string | null;
  providerParam: string | null;
  providerRequestId: string | null;
  assistantRunId: string;
  attemptId: string;
  cause: string;
  attemptNumber?: number;
  latencyMs?: number;
  retryPerformed?: boolean;
  retryReason?: string;
};

export type MistralToolResponse = {
  text: string;
  inputTokens: number;
  outputTokens: number;
  cachedInputTokens: number;
  reasoningTokens: number;
  providerCostAmount: null;
  generationId: string;
  modelId: string;
  provider: "mistral";
  finishReason: "tool_calls" | "stop" | "length" | "content_filter" | "error";
  nativeFinishReason: string;
  content: string | null;
  toolCalls: MistralToolCall[];
  attemptId: string;
  retryCount: number;
  usageEstimated: boolean;
  attemptLatencyMs: number;
};

export type MistralAdapterDependencies = {
  fetch: typeof fetch;
  now: () => number;
  random: () => number;
  sleep: (delayMs: number, signal: AbortSignal) => Promise<void>;
  createId: () => string;
};

type FailureCategory =
  | "auth"
  | "billing"
  | "rate_limit"
  | "contract"
  | "unavailable"
  | "timeout"
  | "empty"
  | "transport_unsafe"
  | "aborted";

type MistralFailure = {
  category: FailureCategory;
  status: number | null;
  hasHttpResponse: boolean;
  retryAfterMs?: number;
  diagnostic: MistralDiagnostic;
};

type MistralHttpError = HttpError & { mistralFailure?: MistralFailure };

export type MistralRetryInput = {
  category: FailureCategory;
  externalStatus: number | null;
  hasHttpResponse: boolean;
  attempt: number;
  remainingMs: number;
  knownCostOrTokens: boolean;
  retryAfterMs?: number;
  signalAborted: boolean;
};

export type MistralRetryDecision = {
  retry: boolean;
  delayMs: number;
  reason: string;
};

const defaultSleep = (delayMs: number, signal: AbortSignal): Promise<void> =>
  new Promise((resolve, reject) => {
    if (signal.aborted) {
      reject(new DOMException("Operation aborted", "AbortError"));
      return;
    }
    const timer = setTimeout(() => {
      signal.removeEventListener("abort", onAbort);
      resolve();
    }, delayMs);
    const onAbort = () => {
      clearTimeout(timer);
      signal.removeEventListener("abort", onAbort);
      reject(new DOMException("Operation aborted", "AbortError"));
    };
    signal.addEventListener("abort", onAbort, { once: true });
  });

const defaultDependencies: MistralAdapterDependencies = {
  fetch,
  now: Date.now,
  random: Math.random,
  sleep: defaultSleep,
  createId: () => crypto.randomUUID(),
};

const inFlightClientRequests = new Set<string>();

const errorBodySchema = z.strictObject({
  object: z.string().optional(),
  message: z.string().optional(),
  type: z.string().optional(),
  param: z.string().nullable().optional(),
  code: z.string().nullable().optional(),
});

const usefulResponseSchema = z.strictObject({
  id: z.string().trim().min(1),
  model: z.string().trim().min(1),
  finish_reason: z.enum([
    "stop",
    "length",
    "model_length",
    "tool_calls",
    "content_filter",
    "error",
  ]),
  content: z.string().nullable(),
  tool_calls: z.array(z.strictObject({
    id: z.string().trim().min(1),
    type: z.literal("function"),
    function: z.strictObject({
      name: z.string().trim().min(1),
      arguments: z.string(),
    }),
  })).max(1),
  prompt_tokens: z.number().int().nonnegative().optional(),
  completion_tokens: z.number().int().nonnegative().optional(),
  cached_tokens: z.number().int().nonnegative().optional(),
});

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const stringField = (value: unknown, key: string): string | null =>
  isRecord(value) && typeof value[key] === "string" ? value[key] : null;

const recordField = (
  value: unknown,
  key: string,
): Record<string, unknown> | null =>
  isRecord(value) && isRecord(value[key])
    ? value[key] as Record<string, unknown>
    : null;

const nonNegativeInteger = (value: unknown): number | undefined =>
  typeof value === "number" && Number.isInteger(value) && value >= 0
    ? value
    : undefined;

const correlationHeader = (headers: Headers): string | null =>
  headers.get("x-request-id") ?? headers.get("x-mistral-request-id") ??
    headers.get("request-id");

const estimateTokens = (text: string): number =>
  text.length === 0 ? 0 : Math.max(1, Math.round(text.length / 4));

const estimateInputTokens = (messages: MistralMessage[]): number =>
  estimateTokens(messages.map((message) => message.content ?? "").join("\n"));

const diagnostic = (
  input: Omit<MistralDiagnostic, "provider">,
): MistralDiagnostic => ({ provider: "mistral", ...input });

const adapterError = (
  status: number,
  code: ErrorCode,
  message: string,
  failure: MistralFailure,
): MistralHttpError =>
  Object.assign(
    httpError(status, code, message, undefined, {
      retryAfterMs: failure.retryAfterMs,
    }),
    { mistralFailure: failure },
  );

export const getMistralDiagnostic = (
  error: unknown,
): MistralDiagnostic | null =>
  error instanceof Error &&
    isRecord(error) &&
    isRecord(error.mistralFailure) &&
    isRecord(error.mistralFailure.diagnostic)
    ? error.mistralFailure.diagnostic as MistralDiagnostic
    : null;

export const parseMistralRetryAfter = (
  value: string | null,
  nowMs: number,
): number | undefined => {
  if (value === null || value.trim() === "") return undefined;
  const trimmed = value.trim();
  const seconds = Number(trimmed);
  const delay = Number.isFinite(seconds) && seconds >= 0
    ? Math.round(seconds * 1000)
    : Number.isNaN(Date.parse(trimmed))
    ? Number.NaN
    : Math.max(0, Date.parse(trimmed) - nowMs);
  return Number.isFinite(delay) && Number.isInteger(delay) && delay >= 0 &&
      delay <= MAX_PUBLIC_RETRY_AFTER_MS
    ? delay
    : undefined;
};

export const decideMistralRetry = (
  input: MistralRetryInput,
  random: () => number,
): MistralRetryDecision => {
  if (input.attempt >= 1) {
    return { retry: false, delayMs: 0, reason: "max_attempts" };
  }
  if (input.signalAborted) {
    return { retry: false, delayMs: 0, reason: "aborted" };
  }
  if (input.knownCostOrTokens) {
    return { retry: false, delayMs: 0, reason: "usage_already_known" };
  }
  const retryable = input.category === "rate_limit" ||
    (input.category === "unavailable" && input.hasHttpResponse &&
      [500, 502, 503].includes(input.externalStatus ?? 0));
  if (!retryable) return { retry: false, delayMs: 0, reason: "non_retryable" };
  const fallbackBase = input.category === "rate_limit" ? 1000 : 500;
  const jitter = Math.floor(Math.max(0, Math.min(1, random())) * 250);
  const delayMs = input.retryAfterMs ?? fallbackBase + jitter;
  if (delayMs >= input.remainingMs) {
    return { retry: false, delayMs: 0, reason: "budget_exhausted" };
  }
  return { retry: true, delayMs, reason: "transient" };
};

const projectContent = (content: unknown): string | null => {
  if (content === null || content === undefined) return null;
  if (typeof content === "string") return content.trim() || null;
  if (!Array.isArray(content)) return null;
  const parts: string[] = [];
  for (const part of content) {
    if (
      !isRecord(part) || part.type !== "text" || typeof part.text !== "string"
    ) {
      return null;
    }
    if (part.text.trim()) parts.push(part.text.trim());
  }
  return parts.length > 0 ? parts.join("\n") : null;
};

const projectToolCalls = (value: unknown): unknown[] | null => {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value)) return null;
  return value.map((call) => {
    const fn = recordField(call, "function");
    return {
      id: stringField(call, "id"),
      type: stringField(call, "type"),
      function: {
        name: stringField(fn, "name"),
        arguments: stringField(fn, "arguments"),
      },
    };
  });
};

const parseSuccessBody = (
  body: string,
  model: MistralModelConfig,
  messages: MistralMessage[],
  correlation: MistralCorrelation,
  attemptId: string,
  providerRequestId: string | null,
  retryCount: number,
): MistralToolResponse => {
  if (body.trim() === "") {
    throw adapterError(
      502,
      "AI_PROVIDER_EMPTY_RESPONSE",
      "Le fournisseur IA n a pas termine la reponse.",
      {
        category: "empty",
        status: 200,
        hasHttpResponse: true,
        diagnostic: diagnostic({
          stage: "parse",
          requestedModel: model.model_id,
          servedModel: null,
          externalStatus: 200,
          providerType: null,
          providerCode: null,
          providerParam: null,
          providerRequestId,
          assistantRunId: correlation.assistantRunId,
          attemptId,
          cause: "empty_body",
        }),
      },
    );
  }
  let raw: unknown;
  try {
    raw = JSON.parse(body);
  } catch {
    throw adapterError(
      502,
      "AI_PROVIDER_CONTRACT_INVALID",
      "La reponse du fournisseur IA est invalide.",
      {
        category: "contract",
        status: 200,
        hasHttpResponse: true,
        diagnostic: diagnostic({
          stage: "parse",
          requestedModel: model.model_id,
          servedModel: null,
          externalStatus: 200,
          providerType: null,
          providerCode: null,
          providerParam: null,
          providerRequestId,
          assistantRunId: correlation.assistantRunId,
          attemptId,
          cause: "malformed_json",
        }),
      },
    );
  }
  const choices = isRecord(raw) && Array.isArray(raw.choices)
    ? raw.choices
    : null;
  if (choices?.length === 0) {
    throw adapterError(
      502,
      "AI_PROVIDER_EMPTY_RESPONSE",
      "Le fournisseur IA n a pas termine la reponse.",
      {
        category: "empty",
        status: 200,
        hasHttpResponse: true,
        diagnostic: diagnostic({
          stage: "parse",
          requestedModel: model.model_id,
          servedModel: stringField(raw, "model"),
          externalStatus: 200,
          providerType: null,
          providerCode: null,
          providerParam: null,
          providerRequestId,
          assistantRunId: correlation.assistantRunId,
          attemptId,
          cause: "empty_choices",
        }),
      },
    );
  }
  const choice = choices?.[0];
  const message = recordField(choice, "message");
  const usage = recordField(raw, "usage");
  const content = message && "content" in message
    ? projectContent(message.content)
    : null;
  const toolCalls = message ? projectToolCalls(message.tool_calls) : null;
  const projected = {
    id: stringField(raw, "id"),
    model: stringField(raw, "model"),
    finish_reason: stringField(choice, "finish_reason"),
    content,
    tool_calls: toolCalls,
    prompt_tokens: nonNegativeInteger(usage?.prompt_tokens),
    completion_tokens: nonNegativeInteger(usage?.completion_tokens),
    cached_tokens: nonNegativeInteger(
      recordField(usage, "prompt_tokens_details")?.cached_tokens,
    ),
  };
  const parsed = usefulResponseSchema.safeParse(projected);
  if (
    !parsed.success || !message || toolCalls === null ||
    (message && "content" in message && message.content !== null &&
      content === null &&
      !(typeof message.content === "string" && message.content.trim() === ""))
  ) {
    throw adapterError(
      502,
      "AI_PROVIDER_CONTRACT_INVALID",
      "La reponse du fournisseur IA est invalide.",
      {
        category: "contract",
        status: 200,
        hasHttpResponse: true,
        diagnostic: diagnostic({
          stage: "parse",
          requestedModel: model.model_id,
          servedModel: stringField(raw, "model"),
          externalStatus: 200,
          providerType: null,
          providerCode: null,
          providerParam: null,
          providerRequestId,
          assistantRunId: correlation.assistantRunId,
          attemptId,
          cause: "invalid_response_shape",
        }),
      },
    );
  }
  const result = parsed.data;
  if (result.model !== model.model_id) {
    throw adapterError(
      502,
      "AI_PROVIDER_CONTRACT_INVALID",
      "Le modele servi ne correspond pas au modele demande.",
      {
        category: "contract",
        status: 200,
        hasHttpResponse: true,
        diagnostic: diagnostic({
          stage: "parse",
          requestedModel: model.model_id,
          servedModel: result.model,
          externalStatus: 200,
          providerType: null,
          providerCode: "served_model_mismatch",
          providerParam: "model",
          providerRequestId,
          assistantRunId: correlation.assistantRunId,
          attemptId,
          cause: "served_model_mismatch",
        }),
      },
    );
  }
  if (
    result.finish_reason === "content_filter" ||
    result.finish_reason === "error"
  ) {
    throw adapterError(
      502,
      "AI_RESPONSE_INVALID",
      "La reponse IA est invalide.",
      {
        category: "contract",
        status: 200,
        hasHttpResponse: true,
        diagnostic: diagnostic({
          stage: "parse",
          requestedModel: model.model_id,
          servedModel: result.model,
          externalStatus: 200,
          providerType: null,
          providerCode: result.finish_reason,
          providerParam: "finish_reason",
          providerRequestId,
          assistantRunId: correlation.assistantRunId,
          attemptId,
          cause: "unusable_finish_reason",
        }),
      },
    );
  }
  if (
    (result.finish_reason === "tool_calls") !== (result.tool_calls.length > 0)
  ) {
    throw adapterError(
      502,
      "AI_PROVIDER_CONTRACT_INVALID",
      "La reponse du fournisseur IA est invalide.",
      {
        category: "contract",
        status: 200,
        hasHttpResponse: true,
        diagnostic: diagnostic({
          stage: "parse",
          requestedModel: model.model_id,
          servedModel: result.model,
          externalStatus: 200,
          providerType: null,
          providerCode: "finish_reason_mismatch",
          providerParam: "finish_reason",
          providerRequestId,
          assistantRunId: correlation.assistantRunId,
          attemptId,
          cause: "finish_reason_mismatch",
        }),
      },
    );
  }
  for (const call of result.tool_calls) {
    if (new TextEncoder().encode(call.function.arguments).length > 16_384) {
      throw adapterError(
        400,
        "AI_TOOL_ARGUMENTS_INVALID",
        "Les arguments de l outil IA sont invalides.",
        {
          category: "contract",
          status: 200,
          hasHttpResponse: true,
          diagnostic: diagnostic({
            stage: "parse",
            requestedModel: model.model_id,
            servedModel: result.model,
            externalStatus: 200,
            providerType: null,
            providerCode: "tool_arguments_too_large",
            providerParam: "tool_calls.function.arguments",
            providerRequestId,
            assistantRunId: correlation.assistantRunId,
            attemptId,
            cause: "tool_arguments_too_large",
          }),
        },
      );
    }
    try {
      const args = JSON.parse(call.function.arguments);
      if (!isRecord(args)) throw new TypeError("arguments_not_object");
    } catch {
      throw adapterError(
        400,
        "AI_TOOL_ARGUMENTS_INVALID",
        "Les arguments de l outil IA sont invalides.",
        {
          category: "contract",
          status: 200,
          hasHttpResponse: true,
          diagnostic: diagnostic({
            stage: "parse",
            requestedModel: model.model_id,
            servedModel: result.model,
            externalStatus: 200,
            providerType: null,
            providerCode: "invalid_tool_arguments",
            providerParam: "tool_calls.function.arguments",
            providerRequestId,
            assistantRunId: correlation.assistantRunId,
            attemptId,
            cause: "invalid_tool_arguments",
          }),
        },
      );
    }
  }
  if (result.tool_calls.length === 0 && !result.content) {
    throw adapterError(
      502,
      "AI_PROVIDER_EMPTY_RESPONSE",
      "Le fournisseur IA n a pas termine la reponse.",
      {
        category: "empty",
        status: 200,
        hasHttpResponse: true,
        diagnostic: diagnostic({
          stage: "parse",
          requestedModel: model.model_id,
          servedModel: result.model,
          externalStatus: 200,
          providerType: null,
          providerCode: "empty_message",
          providerParam: null,
          providerRequestId,
          assistantRunId: correlation.assistantRunId,
          attemptId,
          cause: "empty_message",
        }),
      },
    );
  }
  const usageEstimated = result.prompt_tokens === undefined ||
    result.completion_tokens === undefined;
  const outputText = result.content ??
    result.tool_calls.map((call) => call.function.arguments).join("\n");
  return {
    text: result.content ?? "",
    content: result.content,
    toolCalls: result.tool_calls,
    generationId: result.id,
    modelId: result.model,
    provider: "mistral",
    finishReason: result.tool_calls.length > 0
      ? "tool_calls"
      : result.finish_reason === "model_length"
      ? "length"
      : result.finish_reason,
    nativeFinishReason: result.finish_reason,
    inputTokens: result.prompt_tokens ?? estimateInputTokens(messages),
    outputTokens: result.completion_tokens ?? estimateTokens(outputText),
    cachedInputTokens: result.cached_tokens ?? 0,
    reasoningTokens: 0,
    providerCostAmount: null,
    attemptId,
    retryCount,
    usageEstimated,
    attemptLatencyMs: 0,
  };
};

const httpFailure = async (
  response: Response,
  model: MistralModelConfig,
  correlation: MistralCorrelation,
  attemptId: string,
  nowMs: number,
): Promise<MistralHttpError> => {
  const body = await response.text();
  let parsedBody: z.infer<typeof errorBodySchema> | null = null;
  try {
    const parsed = errorBodySchema.safeParse(JSON.parse(body));
    parsedBody = parsed.success ? parsed.data : null;
  } catch {
    parsedBody = null;
  }
  const status = response.status;
  const retryAfterMs = parseMistralRetryAfter(
    response.headers.get("retry-after"),
    nowMs,
  );
  const common = {
    status,
    hasHttpResponse: true,
    retryAfterMs,
    diagnostic: diagnostic({
      stage: "http" as const,
      requestedModel: model.model_id,
      servedModel: null,
      externalStatus: status,
      providerType: parsedBody?.type ?? null,
      providerCode: parsedBody?.code ?? null,
      providerParam: parsedBody?.param ?? null,
      providerRequestId: correlationHeader(response.headers),
      assistantRunId: correlation.assistantRunId,
      attemptId,
      cause: `http_${status}`,
    }),
  };
  if (status === 401 || status === 403) {
    return adapterError(
      502,
      "AI_PROVIDER_AUTH_FAILED",
      "Authentification du fournisseur IA refusee.",
      { category: "auth", ...common },
    );
  }
  if (status === 402) {
    return adapterError(
      502,
      "AI_PROVIDER_BILLING_REQUIRED",
      "Le compte fournisseur IA requiert une intervention administrateur.",
      { category: "billing", ...common },
    );
  }
  if (status === 429) {
    return adapterError(
      429,
      "AI_PROVIDER_RATE_LIMITED",
      "Quota fournisseur IA atteint. Reessayez plus tard.",
      { category: "rate_limit", ...common },
    );
  }
  if (
    [400, 404, 409, 422].includes(status) || (status >= 400 && status < 500)
  ) {
    return adapterError(
      502,
      "AI_PROVIDER_CONTRACT_INVALID",
      "La requete au fournisseur IA est invalide.",
      { category: "contract", ...common },
    );
  }
  if (status === 504) {
    return adapterError(
      504,
      "AI_TIMEOUT",
      "L assistant IA a depasse le delai autorise.",
      { category: "timeout", ...common },
    );
  }
  return adapterError(
    503,
    "AI_PROVIDER_UNAVAILABLE",
    "Fournisseur IA indisponible.",
    { category: "unavailable", ...common },
  );
};

export const prepareMistralModelsPreflight = async (
  apiKey: string,
  signal: AbortSignal,
  fetchImpl: typeof fetch = fetch,
  preflightCorrelation: Partial<MistralCorrelation> = {},
): Promise<{ modelIds: string[] }> => {
  const response = await fetchImpl(`${MISTRAL_API_BASE_URL}/models`, {
    method: "GET",
    headers: { Authorization: `Bearer ${apiKey}`, Accept: "application/json" },
    signal,
  });
  if (!response.ok) {
    throw await httpFailure(
      response,
      { model_id: "models_preflight", temperature: 0, max_output_tokens: 0 },
      {
        requestId: preflightCorrelation.requestId ?? "preflight",
        clientRequestId: preflightCorrelation.clientRequestId ?? "preflight",
        assistantRunId: preflightCorrelation.assistantRunId ?? "preflight",
      },
      crypto.randomUUID(),
      Date.now(),
    );
  }
  let body: unknown;
  try {
    body = JSON.parse(await response.text());
  } catch {
    throw httpError(
      502,
      "AI_PROVIDER_CONTRACT_INVALID",
      "La liste des modeles du fournisseur IA est invalide.",
    );
  }
  const data = isRecord(body) && Array.isArray(body.data) ? body.data : null;
  const modelIds = data?.map((entry) => stringField(entry, "id")) ?? [];
  if (!data || modelIds.some((id) => id === null)) {
    throw httpError(
      502,
      "AI_PROVIDER_CONTRACT_INVALID",
      "La liste des modeles du fournisseur IA est invalide.",
    );
  }
  return { modelIds: modelIds as string[] };
};

export const callMistralWithTools = async (
  model: MistralModelConfig,
  messages: MistralMessage[],
  tools: MistralToolDefinition[],
  toolChoice: "auto" | "none" | "any",
  apiKey: string,
  signal: AbortSignal,
  correlation: MistralCorrelation,
  deadlineMs: number,
  dependencies: Partial<MistralAdapterDependencies> = {},
): Promise<MistralToolResponse> => {
  const deps = { ...defaultDependencies, ...dependencies };
  if (inFlightClientRequests.has(correlation.clientRequestId)) {
    throw httpError(
      409,
      "CONFLICT",
      "Une requete assistant identique est deja en cours.",
    );
  }
  inFlightClientRequests.add(correlation.clientRequestId);
  try {
    for (let attempt = 0; attempt < 2; attempt += 1) {
      const attemptId = deps.createId();
      const attemptStartedAt = deps.now();
      if (signal.aborted) {
        throw adapterError(
          504,
          "AI_TIMEOUT",
          "L assistant IA a depasse le delai autorise.",
          {
            category: "aborted",
            status: null,
            hasHttpResponse: false,
            diagnostic: diagnostic({
              stage: "before_send",
              requestedModel: model.model_id,
              servedModel: null,
              externalStatus: null,
              providerType: null,
              providerCode: null,
              providerParam: null,
              providerRequestId: null,
              assistantRunId: correlation.assistantRunId,
              attemptId,
              cause: "aborted_before_send",
            }),
          },
        );
      }
      try {
        let response: Response;
        try {
          response = await deps.fetch(
            `${MISTRAL_API_BASE_URL}/chat/completions`,
            {
              method: "POST",
              headers: {
                Authorization: `Bearer ${apiKey}`,
                "Content-Type": "application/json",
                Accept: "application/json",
              },
              signal,
              body: JSON.stringify({
                model: model.model_id,
                messages,
                tools,
                tool_choice: toolChoice,
                parallel_tool_calls: false,
                temperature: Number(model.temperature),
                max_tokens: model.max_output_tokens,
              }),
            },
          );
        } catch (cause) {
          const aborted = signal.aborted ||
            (cause instanceof DOMException && cause.name === "AbortError");
          throw adapterError(
            aborted ? 504 : 503,
            aborted ? "AI_TIMEOUT" : "AI_PROVIDER_UNAVAILABLE",
            aborted
              ? "L assistant IA a depasse le delai autorise."
              : "Fournisseur IA indisponible.",
            {
              category: aborted ? "timeout" : "transport_unsafe",
              status: null,
              hasHttpResponse: false,
              diagnostic: diagnostic({
                stage: "fetch",
                requestedModel: model.model_id,
                servedModel: null,
                externalStatus: null,
                providerType: null,
                providerCode: null,
                providerParam: null,
                providerRequestId: null,
                assistantRunId: correlation.assistantRunId,
                attemptId,
                cause: aborted
                  ? "abort_after_send_possible"
                  : "transport_without_response",
              }),
            },
          );
        }
        if (!response.ok) {
          throw await httpFailure(
            response,
            model,
            correlation,
            attemptId,
            deps.now(),
          );
        }
        const body = await response.text();
        const parsed = parseSuccessBody(
          body,
          model,
          messages,
          correlation,
          attemptId,
          correlationHeader(response.headers),
          attempt,
        );
        return {
          ...parsed,
          attemptLatencyMs: Math.max(0, deps.now() - attemptStartedAt),
        };
      } catch (caught) {
        const failure = caught instanceof Error && isRecord(caught) &&
            isRecord(caught.mistralFailure)
          ? caught.mistralFailure as MistralFailure
          : null;
        if (!failure) throw caught;
        const decision = decideMistralRetry({
          category: failure.category,
          externalStatus: failure.status,
          hasHttpResponse: failure.hasHttpResponse,
          attempt,
          remainingMs: Math.max(0, deadlineMs - deps.now()),
          knownCostOrTokens: false,
          retryAfterMs: failure.retryAfterMs,
          signalAborted: signal.aborted,
        }, deps.random);
        failure.diagnostic.attemptNumber = attempt + 1;
        failure.diagnostic.latencyMs = Math.max(
          0,
          deps.now() - attemptStartedAt,
        );
        failure.diagnostic.retryPerformed = decision.retry;
        failure.diagnostic.retryReason = decision.reason;
        if (!decision.retry) throw caught;
        try {
          await deps.sleep(decision.delayMs, signal);
        } catch {
          throw adapterError(
            504,
            "AI_TIMEOUT",
            "L assistant IA a depasse le delai autorise.",
            {
              category: "aborted",
              status: null,
              hasHttpResponse: false,
              diagnostic: diagnostic({
                ...failure.diagnostic,
                stage: "backoff",
                attemptId,
                cause: "aborted_during_backoff",
              }),
            },
          );
        }
      }
    }
    throw httpError(
      503,
      "AI_PROVIDER_UNAVAILABLE",
      "Fournisseur IA indisponible.",
    );
  } finally {
    inFlightClientRequests.delete(correlation.clientRequestId);
  }
};
