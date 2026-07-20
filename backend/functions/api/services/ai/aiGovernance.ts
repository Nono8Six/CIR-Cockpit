import { and, desc, eq, sql } from "drizzle-orm";
import { z } from "zod/v4";

import {
  ai_model_configs,
  ai_prompt_templates,
  ai_prompt_versions,
  ai_provider_configs,
  ai_quota_policies,
  ai_response_cache,
  ai_usage_events,
  pricing_reference_imports,
} from "../../../../drizzle/schema.ts";
import {
  type AiDiagnosisResult,
  aiDiagnosisResultSchema,
  type AiFeature,
  aiModelConfigSchema,
  type AiPromptsDeleteInput,
  type AiPromptsListInput,
  type AiPromptsPublishInput,
  type AiPromptsRestoreInput,
  type AiPromptsSaveDraftInput,
  type AiPromptsSetArchivedInput,
  aiPromptVersionSchema,
  aiPromptWithVersionsSchema,
  type AiProvider,
  type AiProviderConfig,
  aiProviderConfigSchema,
  aiQuotaPolicySchema,
  type AiSettingsCreateQuotaInput,
  aiSettingsCreateQuotaResponseSchema,
  type AiSettingsDeleteModelInput,
  aiSettingsDeleteModelResponseSchema,
  type AiSettingsDeleteQuotaInput,
  aiSettingsDeleteQuotaResponseSchema,
  aiSettingsGetResponseSchema,
  type AiSettingsSaveModelInput,
  aiSettingsSaveModelResponseSchema,
  type AiSettingsSaveProviderInput,
  aiSettingsSaveProviderResponseSchema,
  type AiSettingsSaveQuotaInput,
  aiSettingsSaveQuotaResponseSchema,
  type AiSettingsTestProviderInput,
  aiSettingsTestProviderResponseSchema,
  aiUsageEventSchema,
  type AiUsageListInput,
  aiUsageListResponseSchema,
  type AiUsageSummaryInput,
  aiUsageSummaryResponseSchema,
} from "../../../../../shared/schemas/ai.schema.ts";
import {
  type PricingReferenceDiagnoseInput,
  type PricingReferenceDiagnoseResponse,
  pricingReferenceDiagnoseResponseSchema,
  type PricingReferenceFileKind,
  type PricingReferenceHealthReport,
  pricingReferenceHealthReportSchema,
} from "../../../../../shared/schemas/pricing/references.schema.ts";
import { httpError } from "../../middleware/errorHandler.ts";
import type { AuthContext, DbClient } from "../../types.ts";
import {
  callMistralWithTools,
  MISTRAL_API_BASE_URL,
  type MistralAdapterDependencies,
  prepareMistralModelsPreflight,
} from "./mistralAdapter.ts";

const CACHE_TTL_MS = 1000 * 60 * 60 * 24;

export type ProviderRow = typeof ai_provider_configs.$inferSelect;
export type ModelRow = typeof ai_model_configs.$inferSelect;
type PromptTemplateRow = typeof ai_prompt_templates.$inferSelect;
export type PromptVersionRow = typeof ai_prompt_versions.$inferSelect;
type QuotaUsage = {
  daily_calls: number;
  monthly_calls: number;
  daily_tokens: number;
  monthly_tokens: number;
  daily_cost: number;
  monthly_cost: number;
};

type PromptUsageRow = {
  template_id: string;
  calls: number;
  successful_calls: number;
  failed_calls: number;
  calls_last_30_days: number;
  total_tokens: number;
  cost_amount: number;
  last_used_at: string | null;
};

const PROTECTED_PROMPT_FEATURES = new Set<AiFeature>([
  "assistant.referentiels",
]);

export const getPromptTemplateDeletionConflict = (
  template: Pick<PromptTemplateRow, "feature" | "archived_at">,
  usageCalls: number,
): string | null => {
  if (PROTECTED_PROMPT_FEATURES.has(template.feature)) {
    return "Le template de l assistant actif ne peut pas etre supprime.";
  }
  if (!template.archived_at) {
    return "Archivez le template avant de le supprimer.";
  }
  if (usageCalls > 0) {
    return "Ce template possede un historique d utilisation et ne peut pas etre supprime definitivement.";
  }
  return null;
};

export type ProviderUsage = {
  text: string;
  inputTokens: number;
  outputTokens: number;
  cachedInputTokens: number;
  reasoningTokens: number;
  providerCostAmount?: number | null;
};

export type OpenRouterToolCall = {
  id: string;
  type: "function";
  function: { name: string; arguments: string };
};
export type OpenRouterMessage = {
  role: "system" | "user" | "assistant" | "tool";
  content: string | null;
  tool_calls?: OpenRouterToolCall[];
  tool_call_id?: string;
  name?: string;
};
export type OpenRouterToolDefinition = {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
    strict?: boolean;
  };
};

export type OpenRouterProviderPreferences = {
  require_parameters: true;
  zdr: true;
  data_collection: "deny";
  allow_fallbacks: boolean;
  order?: string[];
  sort?: "price";
  max_price?: {
    prompt?: number;
    completion?: number;
  };
};

export type OpenRouterEndpointPreflight = {
  modelId: string;
  endpoints: Array<{
    name: string;
    providerName: string;
    tag: string;
    supportsTools: boolean;
    promptPricePerMillion: number | null;
    completionPricePerMillion: number | null;
    eligible: boolean;
    rejectionReasons: string[];
  }>;
  eligibleProviderTags: string[];
};

type ModelPriceInput = {
  input_price_per_million: string | number | null;
  output_price_per_million: string | number | null;
};

const positivePrice = (
  value: string | number | null | undefined,
): number | null => {
  if (
    value === null || value === undefined ||
    (typeof value === "string" && value.trim() === "")
  ) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
};

const booleanEnv = (
  value: string | undefined,
  fallback: boolean,
): boolean => {
  if (value === undefined || value.trim() === "") return fallback;
  return !["0", "false", "non", "no"].includes(value.trim().toLowerCase());
};

export const buildOpenRouterProviderPreferences = (
  model: ModelPriceInput,
  env: Record<string, string | undefined> = Deno.env.toObject(),
): OpenRouterProviderPreferences => {
  const order = (env.AI_OPENROUTER_PROVIDER_ORDER ?? "")
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter((value, index, values) =>
      value.length > 0 && values.indexOf(value) === index
    )
    .slice(0, 20);
  const promptPrice = positivePrice(
    env.AI_OPENROUTER_MAX_PROMPT_PRICE_PER_MILLION ??
      model.input_price_per_million,
  );
  const completionPrice = positivePrice(
    env.AI_OPENROUTER_MAX_COMPLETION_PRICE_PER_MILLION ??
      model.output_price_per_million,
  );
  const maxPrice = promptPrice === null && completionPrice === null
    ? undefined
    : {
      ...(promptPrice === null ? {} : { prompt: promptPrice }),
      ...(completionPrice === null ? {} : { completion: completionPrice }),
    };
  return {
    require_parameters: true,
    zdr: true,
    data_collection: "deny",
    allow_fallbacks: booleanEnv(
      env.AI_OPENROUTER_ALLOW_FALLBACKS,
      order.length === 0,
    ),
    ...(order.length > 0 ? { order } : { sort: "price" as const }),
    ...(maxPrice ? { max_price: maxPrice } : {}),
  };
};

const endpointProjectionSchema = z.strictObject({
  name: z.string().trim().min(1),
  provider_name: z.string().trim().min(1),
  tag: z.string().trim().min(1),
  supported_parameters: z.array(z.string()),
  prompt_price: z.number().nonnegative().nullable(),
  completion_price: z.number().nonnegative().nullable(),
});

export const preflightOpenRouterModelEndpoints = async (
  provider: Pick<ProviderRow, "provider" | "base_url">,
  model: ModelPriceInput & Pick<ModelRow, "model_id">,
  apiKey: string,
  fetchImpl: typeof fetch = fetch,
  env: Record<string, string | undefined> = Deno.env.toObject(),
): Promise<OpenRouterEndpointPreflight> => {
  const urlBase = provider.base_url ?? providerBaseUrl(provider.provider);
  const response = await fetchImpl(
    `${urlBase}/models/${model.model_id}/endpoints`,
    { method: "GET", headers: providerConnectionHeaders(apiKey) },
  );
  if (!response.ok) {
    throw providerHttpError(
      provider.provider,
      response.status,
      await readProviderErrorBody(response),
    );
  }
  const raw = await readProviderJson(response);
  const data = readRecord(raw, "data");
  const rawEndpoints = data && Array.isArray(data.endpoints)
    ? data.endpoints
    : null;
  if (!rawEndpoints) {
    throw httpError(
      502,
      "AI_RESPONSE_INVALID",
      "La liste des endpoints OpenRouter est invalide.",
    );
  }
  const preferences = buildOpenRouterProviderPreferences(model, env);
  const projected = rawEndpoints.map((value) => {
    const endpoint = isRecord(value) ? value : {};
    const pricing = readRecord(endpoint, "pricing");
    const perMillion = (field: "prompt" | "completion"): number | null => {
      const rawPrice = pricing?.[field];
      const parsed = typeof rawPrice === "number"
        ? rawPrice
        : typeof rawPrice === "string"
        ? Number(rawPrice)
        : Number.NaN;
      return Number.isFinite(parsed) && parsed >= 0 ? parsed * 1_000_000 : null;
    };
    return endpointProjectionSchema.safeParse({
      name: endpoint.name,
      provider_name: endpoint.provider_name,
      tag: endpoint.tag,
      supported_parameters: endpoint.supported_parameters,
      prompt_price: perMillion("prompt"),
      completion_price: perMillion("completion"),
    });
  });
  if (projected.some((entry) => !entry.success)) {
    throw httpError(
      502,
      "AI_RESPONSE_INVALID",
      "Un endpoint OpenRouter ne respecte pas le contrat attendu.",
    );
  }
  const endpoints = projected.map((entry) => {
    const endpoint = entry.data!;
    const rejectionReasons: string[] = [];
    if (!endpoint.supported_parameters.includes("tools")) {
      rejectionReasons.push("tools_non_supportes");
    }
    if (
      preferences.max_price?.prompt !== undefined &&
      (endpoint.prompt_price === null ||
        endpoint.prompt_price > preferences.max_price.prompt)
    ) {
      rejectionReasons.push("prix_prompt_superieur_au_plafond");
    }
    if (
      preferences.max_price?.completion !== undefined &&
      (endpoint.completion_price === null ||
        endpoint.completion_price > preferences.max_price.completion)
    ) {
      rejectionReasons.push("prix_completion_superieur_au_plafond");
    }
    return {
      name: endpoint.name,
      providerName: endpoint.provider_name,
      tag: endpoint.tag.toLowerCase(),
      supportsTools: endpoint.supported_parameters.includes("tools"),
      promptPricePerMillion: endpoint.prompt_price,
      completionPricePerMillion: endpoint.completion_price,
      eligible: rejectionReasons.length === 0,
      rejectionReasons,
    };
  });
  return {
    modelId: model.model_id,
    endpoints,
    eligibleProviderTags: endpoints.filter((endpoint) => endpoint.eligible)
      .map((endpoint) => endpoint.tag),
  };
};
export type OpenRouterToolResponse = ProviderUsage & {
  generationId: string;
  modelId: string;
  provider: string | null;
  finishReason: "tool_calls" | "stop" | "length" | "content_filter" | "error";
  nativeFinishReason: string | null;
  content: string | null;
  toolCalls: OpenRouterToolCall[];
  attemptId?: string;
  retryCount?: number;
  usageEstimated?: boolean;
  attemptLatencyMs?: number;
};

const openRouterFinishReasonSchema = z.enum([
  "tool_calls",
  "stop",
  "length",
  "content_filter",
  "error",
]);
const openRouterToolCallSchema = z.strictObject({
  id: z.string().trim().min(1),
  type: z.literal("function"),
  function: z.strictObject({
    name: z.string().trim().min(1),
    arguments: z.string(),
  }),
});
const openRouterUsefulResponseSchema = z.strictObject({
  id: z.string().trim().min(1),
  model: z.string().trim().min(1),
  provider: z.string().nullable(),
  choices: z
    .array(
      z.strictObject({
        finish_reason: openRouterFinishReasonSchema,
        native_finish_reason: z.string().nullable(),
        message: z.strictObject({
          role: z.literal("assistant"),
          content: z.string().nullable(),
          tool_calls: z.array(openRouterToolCallSchema),
        }),
      }),
    )
    .length(1),
  usage: z.strictObject({
    prompt_tokens: z.number().int().nonnegative(),
    completion_tokens: z.number().int().nonnegative(),
    cached_tokens: z.number().int().nonnegative(),
    reasoning_tokens: z.number().int().nonnegative(),
    cost: z.number().nonnegative().nullable(),
  }),
});

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

const base64FromBytes = (bytes: Uint8Array): string => {
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary);
};

const bytesFromBase64 = (value: string): Uint8Array =>
  Uint8Array.from(atob(value), (char) => char.charCodeAt(0));

const toArrayBuffer = (bytes: Uint8Array): ArrayBuffer =>
  bytes.buffer.slice(
    bytes.byteOffset,
    bytes.byteOffset + bytes.byteLength,
  ) as ArrayBuffer;

const toHex = (bytes: Uint8Array): string =>
  [...bytes].map((byte) => byte.toString(16).padStart(2, "0")).join("");

const hashText = async (value: string): Promise<string> =>
  toHex(
    new Uint8Array(
      await crypto.subtle.digest("SHA-256", textEncoder.encode(value)),
    ),
  );

const getEncryptionKey = async (): Promise<CryptoKey> => {
  const secret = Deno.env.get("AI_SECRET_ENCRYPTION_KEY")?.trim();
  if (!secret || secret.length < 32) {
    throw httpError(
      500,
      "AI_SECRET_NOT_CONFIGURED",
      "Configurez AI_SECRET_ENCRYPTION_KEY avec une valeur secrete de 32 caracteres minimum.",
    );
  }

  const digest = await crypto.subtle.digest(
    "SHA-256",
    textEncoder.encode(secret),
  );
  return await crypto.subtle.importKey("raw", digest, "AES-GCM", false, [
    "encrypt",
    "decrypt",
  ]);
};

const encryptSecret = async (value: string): Promise<string> => {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await getEncryptionKey();
  const ciphertext = new Uint8Array(
    await crypto.subtle.encrypt(
      { name: "AES-GCM", iv },
      key,
      textEncoder.encode(value),
    ),
  );
  return `${base64FromBytes(iv)}.${base64FromBytes(ciphertext)}`;
};

export const decryptSecret = async (encrypted: string): Promise<string> => {
  const [ivText, ciphertextText] = encrypted.split(".");
  if (!ivText || !ciphertextText) {
    throw httpError(
      500,
      "AI_SECRET_NOT_CONFIGURED",
      "Secret fournisseur IA indisponible.",
    );
  }
  try {
    const key = await getEncryptionKey();
    const iv = bytesFromBase64(ivText);
    const ciphertext = bytesFromBase64(ciphertextText);
    const plaintext = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: toArrayBuffer(iv) },
      key,
      toArrayBuffer(ciphertext),
    );
    return textDecoder.decode(plaintext);
  } catch (error) {
    if (
      error instanceof Error && Reflect.get(error, "code") ===
        "AI_SECRET_NOT_CONFIGURED"
    ) throw error;
    throw httpError(
      500,
      "AI_SECRET_NOT_CONFIGURED",
      "Secret fournisseur IA indisponible.",
    );
  }
};

const toNumberOrNull = (
  value: string | number | null | undefined,
): number | null => {
  if (value === null || value === undefined) return null;
  const next = typeof value === "number" ? value : Number(value);
  return Number.isFinite(next) ? next : null;
};

const parseOrThrow = <T>(
  schema: {
    safeParse: (value: unknown) =>
      | { success: true; data: T }
      | {
        success: false;
        error: { issues: Array<{ message: string }> };
      };
  },
  value: unknown,
  message: string,
): T => {
  const parsed = schema.safeParse(value);
  if (!parsed.success) {
    throw httpError(
      500,
      "DB_READ_FAILED",
      message,
      parsed.error.issues.map((issue) => issue.message).join(" | "),
    );
  }
  return parsed.data;
};

const toProviderConfig = (row: ProviderRow): AiProviderConfig =>
  parseOrThrow(
    aiProviderConfigSchema,
    {
      id: row.id,
      provider: row.provider,
      label: row.label,
      enabled: row.enabled,
      has_api_key: Boolean(row.encrypted_api_key),
      api_key_last4: row.api_key_last4,
      base_url: row.base_url,
      organization_id: row.organization_id,
      last_test_status: row.last_test_status,
      last_test_at: row.last_test_at,
      last_error_code: row.last_error_code,
      last_error_message: row.last_error_message,
      created_at: row.created_at,
      updated_at: row.updated_at,
    },
    "Configuration fournisseur IA invalide.",
  );

const toModelConfig = (row: ModelRow) =>
  parseOrThrow(
    aiModelConfigSchema,
    {
      id: row.id,
      provider_config_id: row.provider_config_id,
      provider: row.provider,
      model_id: row.model_id,
      label: row.label,
      enabled: row.enabled,
      is_default: row.is_default,
      currency: row.currency,
      input_price_per_million: toNumberOrNull(row.input_price_per_million),
      output_price_per_million: toNumberOrNull(row.output_price_per_million),
      cached_input_price_per_million: toNumberOrNull(
        row.cached_input_price_per_million,
      ),
      reasoning_price_per_million: toNumberOrNull(
        row.reasoning_price_per_million,
      ),
      price_effective_at: row.price_effective_at,
      max_output_tokens: row.max_output_tokens,
      temperature: toNumberOrNull(row.temperature) ?? 0.2,
      created_at: row.created_at,
      updated_at: row.updated_at,
    },
    "Configuration modele IA invalide.",
  );

const toQuotaPolicy = (row: typeof ai_quota_policies.$inferSelect) =>
  parseOrThrow(
    aiQuotaPolicySchema,
    {
      id: row.id,
      scope: row.scope,
      agency_id: row.agency_id,
      user_id: row.user_id,
      feature: row.feature,
      enabled: row.enabled,
      daily_call_limit: row.daily_call_limit,
      monthly_call_limit: row.monthly_call_limit,
      daily_token_limit: row.daily_token_limit,
      monthly_token_limit: row.monthly_token_limit,
      daily_cost_limit: toNumberOrNull(row.daily_cost_limit),
      monthly_cost_limit: toNumberOrNull(row.monthly_cost_limit),
      currency: row.currency,
      created_at: row.created_at,
      updated_at: row.updated_at,
    },
    "Politique de quota IA invalide.",
  );

const toPromptVersion = (row: PromptVersionRow) =>
  parseOrThrow(aiPromptVersionSchema, row, "Version de prompt IA invalide.");

const diagnoseFeatureForFileType = (
  fileType: PricingReferenceFileKind,
): AiFeature =>
  fileType === "classification"
    ? "pricing.references.diagnose.classification"
    : "pricing.references.diagnose.segments";

const getPromptRows = async (db: DbClient, feature?: AiFeature) => {
  const [templates, versions, usageRows] = await Promise.all([
    db
      .select()
      .from(ai_prompt_templates)
      .where(feature ? eq(ai_prompt_templates.feature, feature) : undefined)
      .orderBy(ai_prompt_templates.archived_at, ai_prompt_templates.feature),
    db
      .select()
      .from(ai_prompt_versions)
      .orderBy(
        ai_prompt_versions.template_id,
        desc(ai_prompt_versions.version),
      ),
    db.execute<PromptUsageRow>(sql`
      select
        t.id as template_id,
        count(e.id)::int as calls,
        count(e.id) filter (where e.status in ('success', 'cache_hit'))::int as successful_calls,
        count(e.id) filter (where e.status in ('error', 'blocked'))::int as failed_calls,
        count(e.id) filter (where e.created_at >= now() - interval '30 days')::int as calls_last_30_days,
        coalesce(sum(
          e.input_tokens + e.output_tokens + e.cached_input_tokens + e.reasoning_tokens
        ), 0)::float8 as total_tokens,
        coalesce(sum(e.cost_amount), 0)::float8 as cost_amount,
        max(e.created_at)::text as last_used_at
      from public.ai_prompt_templates t
      left join public.ai_prompt_versions v on v.template_id = t.id
      left join public.ai_usage_events e on e.prompt_version_id = v.id
      group by t.id
    `),
  ]);
  const usageByTemplate = new Map(
    usageRows.map((row) => [row.template_id, row]),
  );

  return templates.map((template) => {
    const templateVersions = versions.filter((version) =>
      version.template_id === template.id
    ).map(toPromptVersion);
    const usage = usageByTemplate.get(template.id);
    return parseOrThrow(
      aiPromptWithVersionsSchema,
      {
        id: template.id,
        feature: template.feature,
        label: template.label,
        description: template.description,
        allowed_variables: template.allowed_variables,
        archived_at: template.archived_at,
        archived_by: template.archived_by,
        created_at: template.created_at,
        updated_at: template.updated_at,
        versions: templateVersions,
        published_version: templateVersions.find((version) =>
          version.status === "published"
        ) ?? null,
        draft_version: templateVersions.find((version) =>
          version.status === "draft"
        ) ?? null,
        usage: {
          calls: Number(usage?.calls ?? 0),
          successful_calls: Number(usage?.successful_calls ?? 0),
          failed_calls: Number(usage?.failed_calls ?? 0),
          calls_last_30_days: Number(usage?.calls_last_30_days ?? 0),
          total_tokens: Number(usage?.total_tokens ?? 0),
          cost_amount: Number(usage?.cost_amount ?? 0),
          currency: "USD",
          last_used_at: usage?.last_used_at ?? null,
        },
      },
      "Prompt IA invalide.",
    );
  });
};

export const getAiSettings = async (
  db: DbClient,
  _callerId: string,
  requestId: string,
  _input: Record<string, never>,
) => {
  const [providers, models, quotas] = await Promise.all([
    db
      .select()
      .from(ai_provider_configs)
      .orderBy(ai_provider_configs.provider),
    db
      .select()
      .from(ai_model_configs)
      .orderBy(ai_model_configs.provider, ai_model_configs.label),
    db.select().from(ai_quota_policies).orderBy(
      ai_quota_policies.scope,
      ai_quota_policies.feature,
    ),
  ]);

  return parseOrThrow(
    aiSettingsGetResponseSchema,
    {
      ok: true,
      request_id: requestId,
      providers: providers.map(toProviderConfig),
      models: models.map(toModelConfig),
      quotas: quotas.map(toQuotaPolicy),
    },
    "Parametres IA invalides.",
  );
};

export const saveAiProvider = async (
  db: DbClient,
  callerId: string,
  requestId: string,
  input: AiSettingsSaveProviderInput,
) => {
  const existing = await getProviderRow(db, input.provider);
  const key = input.api_key?.trim();
  const encrypted_api_key = key
    ? await encryptSecret(key)
    : (existing?.encrypted_api_key ?? null);
  const api_key_hash = key
    ? await hashText(key)
    : (existing?.api_key_hash ?? null);
  const api_key_last4 = key ? key.slice(-4) : (existing?.api_key_last4 ?? null);
  const [row] = await db
    .insert(ai_provider_configs)
    .values({
      id: existing?.id ?? crypto.randomUUID(),
      provider: input.provider,
      label: existing?.label ?? providerLabel(input.provider),
      enabled: input.enabled,
      encrypted_api_key,
      api_key_hash,
      api_key_last4,
      base_url: input.base_url ?? null,
      organization_id: input.organization_id ?? null,
      updated_by: callerId,
      created_by: existing?.created_by ?? callerId,
      updated_at: new Date().toISOString(),
    })
    .onConflictDoUpdate({
      target: ai_provider_configs.provider,
      set: {
        enabled: input.enabled,
        encrypted_api_key,
        api_key_hash,
        api_key_last4,
        base_url: input.base_url ?? null,
        organization_id: input.organization_id ?? null,
        updated_by: callerId,
        updated_at: new Date().toISOString(),
      },
    })
    .returning();

  return parseOrThrow(
    aiSettingsSaveProviderResponseSchema,
    { ok: true, request_id: requestId, provider: toProviderConfig(row) },
    "Reponse de sauvegarde fournisseur IA invalide.",
  );
};

export const saveAiModel = async (
  db: DbClient,
  callerId: string,
  requestId: string,
  input: AiSettingsSaveModelInput,
) => {
  const provider = await getProviderRow(db, input.provider);
  if (!provider) {
    throw httpError(404, "AI_CONFIG_MISSING", "Fournisseur IA introuvable.");
  }

  let saved: ModelRow | undefined;
  await db.transaction(async (tx) => {
    if (input.is_default) {
      await tx
        .update(ai_model_configs)
        .set({
          is_default: false,
          updated_by: callerId,
          updated_at: new Date().toISOString(),
        })
        .where(eq(ai_model_configs.provider, input.provider));
    }

    const [existing] = await tx
      .select()
      .from(ai_model_configs)
      .where(
        and(
          eq(ai_model_configs.provider, input.provider),
          eq(ai_model_configs.model_id, input.model_id),
        ),
      )
      .limit(1);

    const values = {
      provider_config_id: provider.id,
      provider: input.provider,
      model_id: input.model_id,
      label: input.label,
      enabled: input.enabled,
      is_default: input.is_default,
      currency: input.currency,
      input_price_per_million: input.input_price_per_million === null
        ? null
        : String(input.input_price_per_million),
      output_price_per_million: input.output_price_per_million === null
        ? null
        : String(input.output_price_per_million),
      cached_input_price_per_million:
        input.cached_input_price_per_million === null
          ? null
          : String(input.cached_input_price_per_million),
      reasoning_price_per_million: input.reasoning_price_per_million === null
        ? null
        : String(input.reasoning_price_per_million),
      price_effective_at: input.price_effective_at ?? null,
      max_output_tokens: input.max_output_tokens,
      temperature: String(input.temperature),
      updated_by: callerId,
      updated_at: new Date().toISOString(),
    };

    if (existing) {
      const [row] = await tx
        .update(ai_model_configs)
        .set(values)
        .where(eq(ai_model_configs.id, existing.id))
        .returning();
      saved = row;
      return;
    }

    const [row] = await tx
      .insert(ai_model_configs)
      .values({
        id: crypto.randomUUID(),
        ...values,
        created_by: callerId,
      })
      .returning();
    saved = row;
  });

  return parseOrThrow(
    aiSettingsSaveModelResponseSchema,
    {
      ok: true,
      request_id: requestId,
      model: toModelConfig(saved as ModelRow),
    },
    "Reponse sauvegarde modele IA invalide.",
  );
};

export const deleteAiModel = async (
  db: DbClient,
  _callerId: string,
  requestId: string,
  input: AiSettingsDeleteModelInput,
) => {
  const [existing] = await db.select().from(ai_model_configs).where(
    eq(ai_model_configs.id, input.id),
  ).limit(1);
  if (!existing) {
    throw httpError(404, "AI_CONFIG_MISSING", "Modele IA introuvable.");
  }
  if (existing.is_default) {
    throw httpError(
      409,
      "AI_CONFIG_MISSING",
      "Definissez un autre modele par defaut avant la suppression.",
    );
  }
  const [deleted] = await db.delete(ai_model_configs).where(
    eq(ai_model_configs.id, input.id),
  ).returning({ id: ai_model_configs.id });
  return parseOrThrow(aiSettingsDeleteModelResponseSchema, {
    ok: true,
    request_id: requestId,
    deleted_id: deleted.id,
  }, "Reponse suppression modele IA invalide.");
};

export const createAiQuota = async (
  db: DbClient,
  callerId: string,
  requestId: string,
  input: AiSettingsCreateQuotaInput,
) => {
  const [row] = await db.insert(ai_quota_policies).values({
    id: crypto.randomUUID(),
    scope: input.scope,
    agency_id: input.agency_id ?? null,
    user_id: input.user_id ?? null,
    feature: input.feature,
    enabled: input.enabled,
    daily_call_limit: input.daily_call_limit,
    monthly_call_limit: input.monthly_call_limit,
    daily_token_limit: input.daily_token_limit,
    monthly_token_limit: input.monthly_token_limit,
    daily_cost_limit: input.daily_cost_limit === null
      ? null
      : String(input.daily_cost_limit),
    monthly_cost_limit: input.monthly_cost_limit === null
      ? null
      : String(input.monthly_cost_limit),
    currency: input.currency,
    created_by: callerId,
    updated_by: callerId,
  }).returning();
  return parseOrThrow(aiSettingsCreateQuotaResponseSchema, {
    ok: true,
    request_id: requestId,
    quota: toQuotaPolicy(row),
  }, "Reponse creation quota IA invalide.");
};

export const saveAiQuota = async (
  db: DbClient,
  callerId: string,
  requestId: string,
  input: AiSettingsSaveQuotaInput,
) => {
  const [row] = await db
    .update(ai_quota_policies)
    .set({
      enabled: input.enabled,
      daily_call_limit: input.daily_call_limit,
      monthly_call_limit: input.monthly_call_limit,
      daily_token_limit: input.daily_token_limit,
      monthly_token_limit: input.monthly_token_limit,
      daily_cost_limit: input.daily_cost_limit === null
        ? null
        : String(input.daily_cost_limit),
      monthly_cost_limit: input.monthly_cost_limit === null
        ? null
        : String(input.monthly_cost_limit),
      currency: input.currency,
      updated_by: callerId,
      updated_at: new Date().toISOString(),
    })
    .where(eq(ai_quota_policies.id, input.id))
    .returning();

  if (!row) {
    throw httpError(
      404,
      "AI_CONFIG_MISSING",
      "Politique de quota IA introuvable.",
    );
  }

  return parseOrThrow(
    aiSettingsSaveQuotaResponseSchema,
    { ok: true, request_id: requestId, quota: toQuotaPolicy(row) },
    "Reponse sauvegarde quota IA invalide.",
  );
};

export const deleteAiQuota = async (
  db: DbClient,
  _callerId: string,
  requestId: string,
  input: AiSettingsDeleteQuotaInput,
) => {
  const [deleted] = await db.delete(ai_quota_policies).where(
    eq(ai_quota_policies.id, input.id),
  ).returning({ id: ai_quota_policies.id });
  if (!deleted) {
    throw httpError(
      404,
      "AI_CONFIG_MISSING",
      "Politique de quota IA introuvable.",
    );
  }
  return parseOrThrow(aiSettingsDeleteQuotaResponseSchema, {
    ok: true,
    request_id: requestId,
    deleted_id: deleted.id,
  }, "Reponse suppression quota IA invalide.");
};

export const testAiProvider = async (
  db: DbClient,
  callerId: string,
  requestId: string,
  input: AiSettingsTestProviderInput,
) => {
  const provider = await getProviderRow(db, input.provider);
  if (!provider) {
    throw httpError(404, "AI_CONFIG_MISSING", "Fournisseur IA introuvable.");
  }

  const key = input.api_key?.trim() ||
    (provider.encrypted_api_key
      ? await decryptSecret(provider.encrypted_api_key)
      : "");
  if (!key) {
    throw httpError(
      400,
      "AI_CONFIG_MISSING",
      "Enregistrez une cle API avant le test.",
    );
  }

  let status: "success" | "failed" = "success";
  let message = "Connexion fournisseur validee.";
  try {
    await testProviderConnection(provider.provider, key, provider.base_url);
  } catch (error) {
    status = "failed";
    message = error instanceof Error
      ? error.message
      : "Test fournisseur impossible.";
  }

  await db
    .update(ai_provider_configs)
    .set({
      last_test_status: status,
      last_test_at: new Date().toISOString(),
      last_error_code: status === "failed" ? "AI_PROVIDER_UNAVAILABLE" : null,
      last_error_message: status === "failed" ? message : null,
      updated_by: callerId,
      updated_at: new Date().toISOString(),
    })
    .where(eq(ai_provider_configs.id, provider.id));

  return parseOrThrow(
    aiSettingsTestProviderResponseSchema,
    {
      ok: true,
      request_id: requestId,
      provider: input.provider,
      status,
      message,
    },
    "Reponse de test fournisseur IA invalide.",
  );
};

export const listAiPrompts = async (
  db: DbClient,
  _callerId: string,
  requestId: string,
  input: AiPromptsListInput,
) => ({
  ok: true as const,
  request_id: requestId,
  prompts: await getPromptRows(db, input.feature),
});

const requirePromptTemplate = async (db: DbClient, templateId: string) => {
  const [template] = await db
    .select()
    .from(ai_prompt_templates)
    .where(eq(ai_prompt_templates.id, templateId))
    .limit(1);
  if (!template) {
    throw httpError(
      404,
      "AI_CONFIG_MISSING",
      "Template de prompt IA introuvable.",
    );
  }
  return template;
};

const requireEditablePromptTemplate = async (
  db: DbClient,
  templateId: string,
) => {
  const template = await requirePromptTemplate(db, templateId);
  if (template.archived_at) {
    throw httpError(
      409,
      "CONFLICT",
      "Restaurez ce template avant de le modifier.",
    );
  }
  return template;
};

export const setAiPromptTemplateArchived = async (
  db: DbClient,
  callerId: string,
  requestId: string,
  input: AiPromptsSetArchivedInput,
) => {
  const template = await requirePromptTemplate(db, input.template_id);
  if (input.archived && PROTECTED_PROMPT_FEATURES.has(template.feature)) {
    throw httpError(
      409,
      "CONFLICT",
      "Le template de l assistant actif ne peut pas etre archive.",
    );
  }
  const archivedAt = input.archived ? new Date().toISOString() : null;
  await db
    .update(ai_prompt_templates)
    .set({
      archived_at: archivedAt,
      archived_by: input.archived ? callerId : null,
      updated_by: callerId,
      updated_at: new Date().toISOString(),
    })
    .where(eq(ai_prompt_templates.id, input.template_id));
  return {
    ok: true as const,
    request_id: requestId,
    template_id: input.template_id,
    archived_at: archivedAt,
  };
};

export const deleteAiPromptTemplate = async (
  db: DbClient,
  _callerId: string,
  requestId: string,
  input: AiPromptsDeleteInput,
) => {
  const template = await requirePromptTemplate(db, input.template_id);
  const [{ calls }] = await db.execute<{ calls: number }>(sql`
    select count(e.id)::int as calls
    from public.ai_prompt_versions v
    join public.ai_usage_events e on e.prompt_version_id = v.id
    where v.template_id = ${input.template_id}
  `);
  const conflict = getPromptTemplateDeletionConflict(template, Number(calls));
  if (conflict) throw httpError(409, "CONFLICT", conflict);
  await db.delete(ai_prompt_templates).where(
    eq(ai_prompt_templates.id, input.template_id),
  );
  return {
    ok: true as const,
    request_id: requestId,
    deleted_id: input.template_id,
  };
};

export const saveAiPromptDraft = async (
  db: DbClient,
  callerId: string,
  requestId: string,
  input: AiPromptsSaveDraftInput,
) => {
  await requireEditablePromptTemplate(db, input.template_id);

  const [existingDraft] = await db
    .select()
    .from(ai_prompt_versions)
    .where(
      and(
        eq(ai_prompt_versions.template_id, input.template_id),
        eq(ai_prompt_versions.status, "draft"),
      ),
    )
    .limit(1);

  if (existingDraft) {
    const [row] = await db
      .update(ai_prompt_versions)
      .set({ body: input.body, change_note: input.change_note ?? null })
      .where(eq(ai_prompt_versions.id, existingDraft.id))
      .returning();
    return {
      ok: true as const,
      request_id: requestId,
      version: toPromptVersion(row),
    };
  }

  const [{ next_version }] = await db.execute<{ next_version: number }>(sql`
    select coalesce(max(version), 0)::int + 1 as next_version
    from public.ai_prompt_versions
    where template_id = ${input.template_id}
  `);
  const [row] = await db
    .insert(ai_prompt_versions)
    .values({
      template_id: input.template_id,
      version: next_version,
      status: "draft",
      body: input.body,
      change_note: input.change_note ?? null,
      created_by: callerId,
    })
    .returning();

  return {
    ok: true as const,
    request_id: requestId,
    version: toPromptVersion(row),
  };
};

export const publishAiPrompt = async (
  db: DbClient,
  callerId: string,
  requestId: string,
  input: AiPromptsPublishInput,
) => {
  const [target] = await db
    .select()
    .from(ai_prompt_versions)
    .where(eq(ai_prompt_versions.id, input.version_id))
    .limit(1);
  if (!target) {
    throw httpError(
      404,
      "AI_CONFIG_MISSING",
      "Version de prompt IA introuvable.",
    );
  }
  await requireEditablePromptTemplate(db, target.template_id);

  let published: PromptVersionRow | undefined;
  await db.transaction(async (tx) => {
    await tx
      .update(ai_prompt_versions)
      .set({ status: "archived" })
      .where(
        and(
          eq(ai_prompt_versions.template_id, target.template_id),
          eq(ai_prompt_versions.status, "published"),
        ),
      );
    const [row] = await tx
      .update(ai_prompt_versions)
      .set({
        status: "published",
        published_by: callerId,
        published_at: new Date().toISOString(),
      })
      .where(eq(ai_prompt_versions.id, target.id))
      .returning();
    published = row;
  });

  return {
    ok: true as const,
    request_id: requestId,
    version: toPromptVersion(published as PromptVersionRow),
  };
};

export const restoreAiPrompt = async (
  db: DbClient,
  callerId: string,
  requestId: string,
  input: AiPromptsRestoreInput,
) => {
  const [source] = await db
    .select()
    .from(ai_prompt_versions)
    .where(eq(ai_prompt_versions.id, input.version_id))
    .limit(1);
  if (!source) {
    throw httpError(
      404,
      "AI_CONFIG_MISSING",
      "Version de prompt IA introuvable.",
    );
  }
  await requireEditablePromptTemplate(db, source.template_id);
  const [{ next_version }] = await db.execute<{ next_version: number }>(sql`
    select coalesce(max(version), 0)::int + 1 as next_version
    from public.ai_prompt_versions
    where template_id = ${source.template_id}
  `);
  const [row] = await db
    .insert(ai_prompt_versions)
    .values({
      template_id: source.template_id,
      version: next_version,
      status: "draft",
      body: source.body,
      change_note: `Restauration de la version ${source.version}`,
      created_by: callerId,
    })
    .returning();

  return {
    ok: true as const,
    request_id: requestId,
    version: toPromptVersion(row),
  };
};

export const getAiUsageSummary = async (
  db: DbClient,
  _callerId: string,
  requestId: string,
  input: AiUsageSummaryInput,
) => {
  const periodEnd = new Date();
  const periodStart = new Date(
    periodEnd.getTime() - input.days * 24 * 60 * 60 * 1000,
  );
  const [row] = await db.execute<{
    calls: number;
    successful_calls: number;
    failed_calls: number;
    cache_hits: number;
    input_tokens: number;
    output_tokens: number;
    cached_input_tokens: number;
    reasoning_tokens: number;
    cost_amount: number;
  }>(sql`
    select
      count(*)::int as calls,
      count(*) filter (where status in ('success', 'cache_hit'))::int as successful_calls,
      count(*) filter (where status = 'error')::int as failed_calls,
      count(*) filter (where cache_hit)::int as cache_hits,
      coalesce(sum(input_tokens), 0)::int as input_tokens,
      coalesce(sum(output_tokens), 0)::int as output_tokens,
      coalesce(sum(cached_input_tokens), 0)::int as cached_input_tokens,
      coalesce(sum(reasoning_tokens), 0)::int as reasoning_tokens,
      coalesce(sum(cost_amount), 0)::float8 as cost_amount
    from public.ai_usage_events
    where created_at >= ${periodStart.toISOString()}
      and (${input.feature ?? null}::text is null or feature = ${
    input.feature ?? null
  })
  `);
  const dailyRows = await db.execute<{
    date: string;
    calls: number;
    errors: number;
    cache_hits: number;
    input_tokens: number;
    output_tokens: number;
    cost_amount: number;
  }>(sql`
    select
      to_char(day::date, 'YYYY-MM-DD') as date,
      coalesce(count(e.id), 0)::int as calls,
      coalesce(count(e.id) filter (where e.status = 'error'), 0)::int as errors,
      coalesce(count(e.id) filter (where e.cache_hit), 0)::int as cache_hits,
      coalesce(sum(e.input_tokens), 0)::int as input_tokens,
      coalesce(sum(e.output_tokens), 0)::int as output_tokens,
      coalesce(sum(e.cost_amount), 0)::float8 as cost_amount
    from generate_series(${periodStart.toISOString()}::timestamptz, ${periodEnd.toISOString()}::timestamptz, interval '1 day') as day
    left join public.ai_usage_events e
      on e.created_at >= day
      and e.created_at < day + interval '1 day'
      and (${input.feature ?? null}::text is null or e.feature = ${
    input.feature ?? null
  })
    group by day
    order by day
  `);
  const budgetAlerts = await db.execute<{
    quota_id: string;
    scope: "global" | "agency" | "user";
    feature: AiFeature | null;
    period: "day" | "month";
    cost_amount: number;
    cost_limit: number;
    ratio: number;
    level: "approaching" | "reached";
    currency: string;
  }>(sql`
    with quota_usage as (
      select q.id as quota_id, q.scope, q.feature, q.currency,
        q.daily_cost_limit::float8 as daily_limit,
        q.monthly_cost_limit::float8 as monthly_limit,
        coalesce(sum(e.cost_amount) filter (
          where e.created_at >= date_trunc('day', now())
        ), 0)::float8 as daily_cost,
        coalesce(sum(e.cost_amount) filter (
          where e.created_at >= date_trunc('month', now())
        ), 0)::float8 as monthly_cost
      from public.ai_quota_policies q
      left join public.ai_usage_events e on e.status <> 'blocked'
        and (q.feature is null or e.feature = q.feature)
        and (q.scope = 'global'
          or (q.scope = 'agency' and e.agency_id = q.agency_id)
          or (q.scope = 'user' and e.user_id = q.user_id))
        and e.created_at >= date_trunc('month', now())
      where q.enabled = true
      group by q.id
    ), alerts as (
      select quota_id, scope, feature, currency, 'day'::text as period,
        daily_cost as cost_amount, daily_limit as cost_limit
      from quota_usage where daily_limit > 0 and daily_cost / daily_limit >= 0.8
      union all
      select quota_id, scope, feature, currency, 'month'::text as period,
        monthly_cost as cost_amount, monthly_limit as cost_limit
      from quota_usage where monthly_limit > 0 and monthly_cost / monthly_limit >= 0.8
    )
    select quota_id, scope, feature, period, cost_amount, cost_limit,
      (cost_amount / cost_limit)::float8 as ratio,
      case when cost_amount >= cost_limit then 'reached' else 'approaching' end as level,
      currency
    from alerts
    order by ratio desc, quota_id
  `);

  return parseOrThrow(
    aiUsageSummaryResponseSchema,
    {
      ok: true,
      request_id: requestId,
      summary: {
        ...row,
        currency: "USD",
        period_start: periodStart.toISOString(),
        period_end: periodEnd.toISOString(),
        budget_alerts: budgetAlerts,
        daily: dailyRows,
      },
    },
    "Synthese usage IA invalide.",
  );
};

export const listAiUsageEvents = async (
  db: DbClient,
  _callerId: string,
  requestId: string,
  input: AiUsageListInput,
) => {
  const offset = (input.page - 1) * input.page_size;
  const rows = await db.execute<Record<string, unknown>>(sql`
    select id, request_id, feature, provider, model_id, model_config_id, prompt_version_id, user_id, agency_id,
      input_tokens, output_tokens, cached_input_tokens, reasoning_tokens, cost_amount::float8 as cost_amount,
      currency, cache_hit, status, error_code, error_message, latency_ms, created_at
    from public.ai_usage_events
    where (${input.feature ?? null}::text is null or feature = ${
    input.feature ?? null
  })
    order by created_at desc
    limit ${input.page_size}
    offset ${offset}
  `);
  const [totalRow] = await db.execute<{ total: number }>(sql`
    select count(*)::int as total
    from public.ai_usage_events
    where (${input.feature ?? null}::text is null or feature = ${
    input.feature ?? null
  })
  `);
  return parseOrThrow(
    aiUsageListResponseSchema,
    {
      ok: true,
      request_id: requestId,
      events: rows.map((row) =>
        parseOrThrow(aiUsageEventSchema, row, "Evenement usage IA invalide.")
      ),
      page: input.page,
      page_size: input.page_size,
      total: totalRow?.total ?? 0,
    },
    "Liste usage IA invalide.",
  );
};

export const runPricingReferenceDiagnosis = async (
  db: DbClient,
  authContext: AuthContext,
  requestId: string,
  input: PricingReferenceDiagnoseInput,
): Promise<PricingReferenceDiagnoseResponse> => {
  const started = performance.now();
  const report = await getHealthReport(db, input.import_id);
  if (!report) {
    return unavailable("Aucun rapport referentiel analyse n est disponible.");
  }

  const resolved = await resolveModelAndPrompt(db, input);
  if (!resolved) {
    return unavailable("Aucun fournisseur IA actif avec cle API serveur.");
  }

  const featureKey = diagnoseFeatureForFileType(input.file_type);

  try {
    await enforceAiQuota(db, authContext, featureKey);
  } catch (error) {
    await recordBlockedUsage(
      db,
      requestId,
      authContext,
      featureKey,
      resolved.model,
      resolved.prompt,
      error,
      Math.round(performance.now() - started),
    );
    throw error;
  }
  const userPrompt = buildPricingReferenceUserPrompt(input.file_type, report);
  const inputHash = await hashText(
    JSON.stringify({
      file_type: input.file_type,
      generated_at: report.generated_at,
      prompt_version_id: resolved.prompt.id,
      model_config_id: resolved.model.id,
      userPrompt,
    }),
  );
  const cacheKey = await hashText(`${featureKey}:${inputHash}`);
  const cached = await getCachedDiagnosis(db, cacheKey);
  if (cached) {
    await recordUsage(db, {
      requestId,
      authContext,
      feature: featureKey,
      model: resolved.model,
      prompt: resolved.prompt,
      usage: cached.usage,
      costAmount: 0,
      cacheHit: true,
      status: "cache_hit",
      latencyMs: Math.round(performance.now() - started),
    });
    return buildDiagnosisResponse(
      cached.response,
      cached.usage,
      resolved.model,
      { hit: true, key: cacheKey },
      0,
    );
  }

  const apiKey = await decryptSecret(resolved.provider.encrypted_api_key ?? "");
  try {
    const providerResponse = await callProvider(
      resolved.provider,
      resolved.model,
      resolved.prompt.body,
      userPrompt,
      apiKey,
    );
    const result = parseProviderResult(providerResponse.text);
    const cost = computeCost(resolved.model, providerResponse);
    await db.insert(ai_response_cache).values({
      feature: featureKey,
      cache_key: cacheKey,
      provider: resolved.provider.provider,
      model_id: resolved.model.model_id,
      prompt_version_id: resolved.prompt.id,
      input_hash: inputHash,
      response: result,
      usage: {
        input_tokens: providerResponse.inputTokens,
        output_tokens: providerResponse.outputTokens,
        cached_input_tokens: providerResponse.cachedInputTokens,
        reasoning_tokens: providerResponse.reasoningTokens,
      },
      expires_at: new Date(Date.now() + CACHE_TTL_MS).toISOString(),
    });
    await recordUsage(db, {
      requestId,
      authContext,
      feature: featureKey,
      model: resolved.model,
      prompt: resolved.prompt,
      usage: providerResponse,
      costAmount: cost,
      cacheHit: false,
      status: "success",
      latencyMs: Math.round(performance.now() - started),
    });
    return buildDiagnosisResponse(
      result,
      providerResponse,
      resolved.model,
      {
        hit: false,
        key: cacheKey,
      },
      cost,
    );
  } catch (error) {
    await recordErrorUsage(
      db,
      requestId,
      authContext,
      featureKey,
      resolved.model,
      resolved.prompt,
      error,
      Math.round(performance.now() - started),
    );
    throw error;
  }
};

const unavailable = (
  fallbackReason: string,
): PricingReferenceDiagnoseResponse =>
  parseOrThrow(
    pricingReferenceDiagnoseResponseSchema,
    {
      ok: true,
      ai_available: false,
      result: null,
      usage: null,
      cost: null,
      cache: { hit: false },
      fallback_reason: fallbackReason,
    },
    "Reponse diagnostic IA indisponible invalide.",
  );

const providerLabel = (provider: AiProvider): string => {
  switch (provider) {
    case "openrouter":
      return "OpenRouter";
    case "mistral":
      return "Mistral";
  }
};

export const getProviderRow = async (
  db: DbClient,
  provider: AiProvider,
): Promise<ProviderRow | null> => {
  const [row] = await db.select().from(ai_provider_configs).where(
    eq(ai_provider_configs.provider, provider),
  ).limit(1);
  return row ?? null;
};

const getHealthReport = async (
  db: DbClient,
  importId: string | undefined,
): Promise<PricingReferenceHealthReport | null> => {
  const rows = importId
    ? await db.select().from(pricing_reference_imports).where(
      eq(pricing_reference_imports.id, importId),
    ).limit(1)
    : await db
      .select()
      .from(pricing_reference_imports)
      .where(eq(pricing_reference_imports.status, "analyse_ok"))
      .orderBy(desc(pricing_reference_imports.analysis_completed_at))
      .limit(1);
  const report = rows[0]?.health_report ?? null;
  if (!report) return null;
  return parseOrThrow(
    pricingReferenceHealthReportSchema,
    report,
    "Rapport referentiel invalide.",
  );
};

export const resolveModelAndPromptForFeature = async (
  db: DbClient,
  featureKey: AiFeature,
  modelConfigId?: string,
  promptVersionId?: string,
  requirePrompt = false,
  routing?: { preferredModelId?: string },
) => {
  const preferredModelId = routing?.preferredModelId;
  const assignedModels = modelConfigId ? [] : await db.execute<ModelRow>(sql`
      select m.*
      from public.ai_feature_model_assignments a
      join public.ai_model_configs m on m.id = a.model_config_id
      where a.feature = ${featureKey}
      limit 1
    `);
  const models = modelConfigId
    ? await db.select().from(ai_model_configs).where(
      eq(ai_model_configs.id, modelConfigId),
    ).limit(1)
    : assignedModels.length > 0
    ? assignedModels
    : preferredModelId
    ? await db.execute<ModelRow>(sql`
      select m.*
      from public.ai_model_configs m
      join public.ai_provider_configs p on p.id = m.provider_config_id
      where m.enabled = true
        and m.provider = 'openrouter'
        and m.model_id = ${preferredModelId}
        and p.enabled = true
        and p.encrypted_api_key is not null
      limit 1
    `)
    : await db.execute<ModelRow>(sql`
      select m.*
      from public.ai_model_configs m
      join public.ai_provider_configs p on p.id = m.provider_config_id
      where m.enabled = true
        and m.is_default = true
        and p.enabled = true
        and p.encrypted_api_key is not null
      order by case m.provider
        when 'openrouter' then 1
        else 2
      end
      limit 1
    `);

  const model = models.find((candidate) => candidate.enabled);
  if (!model) {
    if (assignedModels.length > 0) {
      throw httpError(
        500,
        "AI_CONFIG_MISSING",
        "Modele IA affecte indisponible.",
      );
    }
    return null;
  }

  const provider = await getProviderRow(db, model.provider);
  if (!provider || !provider.enabled) {
    if (assignedModels.length > 0) {
      throw httpError(
        500,
        "AI_CONFIG_MISSING",
        "Fournisseur IA affecte indisponible.",
      );
    }
    return null;
  }
  if (!provider.encrypted_api_key) {
    throw httpError(
      500,
      "AI_SECRET_NOT_CONFIGURED",
      "Secret fournisseur IA indisponible.",
    );
  }

  const promptRows = promptVersionId
    ? await db.select().from(ai_prompt_versions).where(
      eq(ai_prompt_versions.id, promptVersionId),
    ).limit(1)
    : await db.execute<PromptVersionRow>(sql`
      select v.*
      from public.ai_prompt_versions v
      join public.ai_prompt_templates t on t.id = v.template_id
      where t.feature = ${featureKey}
        and t.archived_at is null
        and v.status = 'published'
      limit 1
    `);
  const prompt = promptRows[0] ?? null;
  if (!prompt) {
    if (requirePrompt) {
      throw httpError(
        404,
        "AI_CONFIG_MISSING",
        "Prompt IA publie introuvable.",
      );
    }
    return null;
  }

  return { provider, model, prompt };
};

const resolveModelAndPrompt = async (
  db: DbClient,
  input: PricingReferenceDiagnoseInput,
) => {
  const resolved = await resolveModelAndPromptForFeature(
    db,
    diagnoseFeatureForFileType(input.file_type),
    input.model_config_id,
    input.prompt_version_id,
    true,
  );
  return resolved;
};

const buildPricingReferenceUserPrompt = (
  fileType: PricingReferenceFileKind,
  report: PricingReferenceHealthReport,
): string =>
  JSON.stringify({
    generated_at: report.generated_at,
    file_type: fileType,
    classification: {
      rows: report.classification.rows_count,
      unique_keys: report.classification.unique_cir_keys,
      duplicate_keys: report.classification.duplicate_cir_keys,
      mandatory_empty_rows: report.classification.mandatory_empty_rows,
    },
    segments_grids: {
      rows: report.segments_grids.rows_count,
      unique_identities: report.segments_grids.unique_segment_identities,
      identity_incomplete_rows: report.segments_grids.identity_incomplete_rows,
      missing_links: report.segments_grids.classification_incomplete_rows,
      unknown_keys: report.segments_grids.cir_keys_not_validated_rows,
      purchase_grid_missing_rows:
        report.segments_grids.purchase_grid_missing_rows,
    },
    anomalies: report.anomalies,
    anomaly_samples: report.anomaly_samples.slice(0, 30),
  });

const getCachedDiagnosis = async (
  db: DbClient,
  cacheKey: string,
): Promise<
  {
    response: AiDiagnosisResult;
    usage: ProviderUsage;
  } | null
> => {
  const [row] = await db.select().from(ai_response_cache).where(
    eq(ai_response_cache.cache_key, cacheKey),
  ).limit(1);
  if (!row || new Date(row.expires_at).getTime() <= Date.now()) return null;
  const usage = row.usage as Record<string, number>;
  return {
    response: parseOrThrow(
      aiDiagnosisResultSchema,
      row.response,
      "Cache IA invalide.",
    ),
    usage: {
      text: "",
      inputTokens: usage.input_tokens ?? 0,
      outputTokens: usage.output_tokens ?? 0,
      cachedInputTokens: usage.cached_input_tokens ?? 0,
      reasoningTokens: usage.reasoning_tokens ?? 0,
    },
  };
};

export const enforceAiQuota = async (
  db: DbClient,
  authContext: AuthContext,
  featureKey: AiFeature,
): Promise<void> => {
  const dayStart = new Date();
  dayStart.setHours(0, 0, 0, 0);
  const monthStart = new Date(dayStart);
  monthStart.setDate(1);

  const quotas = await db.execute<typeof ai_quota_policies.$inferSelect>(sql`
    select *
    from public.ai_quota_policies
    where enabled = true
      and (
        feature is null
        or feature = ${featureKey}
        or (
          feature = 'pricing.references.diagnose'
          and ${featureKey} in (
            'pricing.references.diagnose',
            'pricing.references.diagnose.classification',
            'pricing.references.diagnose.segments'
          )
        )
      )
      and (
        scope = 'global'
        or (scope = 'agency' and agency_id = ${authContext.activeAgencyId})
        or (scope = 'user' and user_id = ${authContext.userId})
      )
    order by
      case scope when 'user' then 1 when 'agency' then 2 else 3 end,
      feature nulls last
  `);

  for (const quota of quotas) {
    const [usage] = await db.execute<QuotaUsage>(sql`
      select
        count(*) filter (where created_at >= ${dayStart.toISOString()})::int as daily_calls,
        count(*)::int as monthly_calls,
        coalesce(sum(input_tokens + output_tokens + cached_input_tokens + reasoning_tokens) filter (where created_at >= ${dayStart.toISOString()}), 0)::int as daily_tokens,
        coalesce(sum(input_tokens + output_tokens + cached_input_tokens + reasoning_tokens), 0)::int as monthly_tokens,
        coalesce(sum(cost_amount) filter (where created_at >= ${dayStart.toISOString()}), 0)::float8 as daily_cost,
        coalesce(sum(cost_amount), 0)::float8 as monthly_cost
      from public.ai_usage_events
      where created_at >= ${monthStart.toISOString()}
        and status <> 'blocked'
        and (
          ${quota.feature ?? null}::text is null
          or feature = ${quota.feature ?? null}
          or (
            ${quota.feature ?? null} = 'pricing.references.diagnose'
            and feature in (
              'pricing.references.diagnose',
              'pricing.references.diagnose.classification',
              'pricing.references.diagnose.segments'
            )
          )
        )
        and (
          ${quota.scope} = 'global'
          or (${quota.scope} = 'agency' and agency_id = ${authContext.activeAgencyId})
          or (${quota.scope} = 'user' and user_id = ${authContext.userId})
        )
    `);

    enforceQuotaLimits(quota, usage);
  }
};

const enforceQuotaLimits = (
  quota: typeof ai_quota_policies.$inferSelect,
  usage: QuotaUsage,
): void => {
  const scope = quota.scope === "user"
    ? "utilisateur"
    : quota.scope === "agency"
    ? "agence"
    : "global";
  if (
    quota.daily_call_limit !== null &&
    usage.daily_calls >= quota.daily_call_limit
  ) {
    throw httpError(
      429,
      "AI_QUOTA_EXCEEDED",
      `Quota IA journalier ${scope} atteint.`,
    );
  }
  if (
    quota.monthly_call_limit !== null &&
    usage.monthly_calls >= quota.monthly_call_limit
  ) {
    throw httpError(
      429,
      "AI_QUOTA_EXCEEDED",
      `Quota IA mensuel ${scope} atteint.`,
    );
  }
  if (
    quota.daily_token_limit !== null &&
    usage.daily_tokens >= quota.daily_token_limit
  ) {
    throw httpError(
      429,
      "AI_QUOTA_EXCEEDED",
      `Quota IA journalier ${scope} en tokens atteint.`,
    );
  }
  if (
    quota.monthly_token_limit !== null &&
    usage.monthly_tokens >= quota.monthly_token_limit
  ) {
    throw httpError(
      429,
      "AI_QUOTA_EXCEEDED",
      `Quota IA mensuel ${scope} en tokens atteint.`,
    );
  }
  if (
    quota.daily_cost_limit !== null &&
    usage.daily_cost >= Number(quota.daily_cost_limit)
  ) {
    throw httpError(
      429,
      "AI_QUOTA_EXCEEDED",
      `Quota IA journalier ${scope} en cout atteint.`,
    );
  }
  if (
    quota.monthly_cost_limit !== null &&
    usage.monthly_cost >= Number(quota.monthly_cost_limit)
  ) {
    throw httpError(
      429,
      "AI_QUOTA_EXCEEDED",
      `Quota IA mensuel ${scope} en cout atteint.`,
    );
  }
};

const testProviderConnection = async (
  provider: AiProvider,
  key: string,
  baseUrl: string | null,
): Promise<void> => {
  if (provider === "mistral") {
    await prepareMistralModelsPreflight(key, new AbortController().signal);
    return;
  }
  const url = `${baseUrl ?? providerBaseUrl(provider)}/models`;
  const response = await fetch(url, {
    method: "GET",
    headers: providerConnectionHeaders(key),
  });
  if (!response.ok) {
    throw providerHttpError(provider, response.status);
  }
};

const providerConnectionHeaders = (key: string): HeadersInit => {
  return { Authorization: `Bearer ${key}` };
};

export const openAiCompatibleHeaders = (
  provider: AiProvider,
  key: string,
): HeadersInit => {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${key}`,
  };
  if (provider === "openrouter") {
    headers["HTTP-Referer"] = "http://localhost:3000";
    headers["X-OpenRouter-Title"] = "CIR Cockpit";
  }
  return headers;
};

export const providerBaseUrl = (provider: AiProvider): string => {
  switch (provider) {
    case "openrouter":
      return "https://openrouter.ai/api/v1";
    case "mistral":
      return MISTRAL_API_BASE_URL;
  }
};

const callProvider = async (
  provider: ProviderRow,
  model: ModelRow,
  systemPrompt: string,
  userPrompt: string,
  apiKey: string,
): Promise<ProviderUsage> => {
  const maxTokens = model.max_output_tokens;
  const temperature = Number(model.temperature);
  const urlBase = provider.base_url ?? providerBaseUrl(provider.provider);
  const response = await fetch(`${urlBase}/chat/completions`, {
    method: "POST",
    headers: openAiCompatibleHeaders(provider.provider, apiKey),
    body: JSON.stringify({
      model: model.model_id,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature,
      max_tokens: maxTokens,
      response_format: { type: "json_object" },
      usage: { include: true },
    }),
  });
  if (!response.ok) {
    throw providerHttpError(
      provider.provider,
      response.status,
      await readProviderErrorBody(response),
    );
  }
  const data = await readProviderJson(response);
  const providerError = readProviderError(data);
  if (providerError) {
    throw httpError(
      503,
      "AI_PROVIDER_UNAVAILABLE",
      `Fournisseur IA ${provider.provider}: ${providerError}`,
    );
  }
  const text = readProviderText(data);
  if (!text) {
    throw httpError(
      502,
      "AI_RESPONSE_INVALID",
      "Le fournisseur IA n a pas renvoye de texte exploitable.",
      describeProviderPayload(data),
    );
  }
  return {
    text,
    inputTokens: readNumberPath(data, ["usage", "prompt_tokens"]) ??
      estimateTokens(systemPrompt + userPrompt),
    outputTokens: readNumberPath(data, ["usage", "completion_tokens"]) ??
      estimateTokens(text),
    cachedInputTokens: readNumberPath(data, [
      "usage",
      "prompt_tokens_details",
      "cached_tokens",
    ]) ?? 0,
    reasoningTokens: readNumberPath(data, [
      "usage",
      "completion_tokens_details",
      "reasoning_tokens",
    ]) ?? 0,
    providerCostAmount: provider.provider === "openrouter"
      ? readNumberPath(data, ["usage", "cost"])
      : null,
  };
};

export const callProviderWithTools = async (
  provider: ProviderRow,
  model: ModelRow,
  messages: OpenRouterMessage[],
  tools: OpenRouterToolDefinition[],
  toolChoice: "auto" | "none" | "any",
  apiKey: string,
  signal: AbortSignal,
  fetchImpl: typeof fetch = fetch,
  correlation?: {
    requestId: string;
    clientRequestId: string;
    assistantRunId: string;
    deadlineMs: number;
  },
  mistralDependencies: Partial<MistralAdapterDependencies> = {},
): Promise<OpenRouterToolResponse> => {
  if (provider.provider === "mistral") {
    const fallbackId = crypto.randomUUID();
    return await callMistralWithTools(
      model,
      messages,
      tools,
      toolChoice,
      apiKey,
      signal,
      {
        requestId: correlation?.requestId ?? fallbackId,
        clientRequestId: correlation?.clientRequestId ?? fallbackId,
        assistantRunId: correlation?.assistantRunId ?? fallbackId,
      },
      correlation?.deadlineMs ?? Date.now() + 180_000,
      { fetch: fetchImpl, ...mistralDependencies },
    );
  }
  const urlBase = provider.base_url ?? providerBaseUrl(provider.provider);
  const response = await fetchImpl(`${urlBase}/chat/completions`, {
    method: "POST",
    headers: openAiCompatibleHeaders(provider.provider, apiKey),
    signal,
    body: JSON.stringify({
      model: model.model_id,
      messages,
      tools,
      tool_choice: toolChoice,
      temperature: Number(model.temperature),
      provider: buildOpenRouterProviderPreferences(model),
    }),
  });
  if (!response.ok) {
    throw providerHttpError(
      provider.provider,
      response.status,
      await readProviderErrorBody(response),
    );
  }
  const raw = await readProviderJson(response);
  const providerError = readProviderError(raw);
  if (providerError) {
    if (providerError.toLowerCase().includes("empty response")) {
      throw httpError(
        502,
        "AI_PROVIDER_EMPTY_RESPONSE",
        "Le fournisseur IA n a pas termine la reponse.",
      );
    }
    throw httpError(
      503,
      "AI_PROVIDER_UNAVAILABLE",
      `Fournisseur IA ${provider.provider} indisponible.`,
    );
  }
  const choice = firstChoice(raw);
  const message = readRecord(choice, "message");
  const rawToolCalls = message && Array.isArray(message.tool_calls)
    ? message.tool_calls
    : [];
  const useful = {
    id: readString(raw, "id"),
    model: readString(raw, "model"),
    provider: readString(raw, "provider"),
    choices: [
      {
        finish_reason: readString(choice, "finish_reason"),
        native_finish_reason: readString(choice, "native_finish_reason"),
        message: {
          role: readString(message, "role"),
          content: message ? readMessageContent(message.content) : null,
          tool_calls: rawToolCalls.map((call) => {
            const fn = readRecord(call, "function");
            return {
              id: readString(call, "id"),
              type: readString(call, "type"),
              function: {
                name: readString(fn, "name"),
                arguments: readString(fn, "arguments"),
              },
            };
          }),
        },
      },
    ],
    usage: {
      prompt_tokens: readNumberPath(raw, ["usage", "prompt_tokens"]),
      completion_tokens: readNumberPath(raw, ["usage", "completion_tokens"]),
      cached_tokens: readNumberPath(raw, [
        "usage",
        "prompt_tokens_details",
        "cached_tokens",
      ]) ?? 0,
      reasoning_tokens: readNumberPath(raw, [
        "usage",
        "completion_tokens_details",
        "reasoning_tokens",
      ]) ?? 0,
      cost: readNumberPath(raw, ["usage", "cost"]),
    },
  };
  const parsed = openRouterUsefulResponseSchema.safeParse(useful);
  if (!parsed.success) {
    throw httpError(
      502,
      "AI_RESPONSE_INVALID",
      "La reponse tool calling ne respecte pas le contrat OpenRouter.",
      parsed.error.issues.map((issue) => issue.message).join(" | "),
    );
  }
  const result = parsed.data;
  const resultChoice = result.choices[0];
  const ids = new Set<string>();
  for (const toolCall of resultChoice.message.tool_calls) {
    if (ids.has(toolCall.id)) {
      throw httpError(
        502,
        "AI_RESPONSE_INVALID",
        "Identifiant appel outil duplique.",
      );
    }
    ids.add(toolCall.id);
    if (new TextEncoder().encode(toolCall.function.arguments).length > 16_384) {
      throw httpError(
        502,
        "AI_RESPONSE_INVALID",
        "Arguments outil fournisseur trop volumineux.",
      );
    }
  }
  if (
    resultChoice.finish_reason === "tool_calls" &&
    resultChoice.message.tool_calls.length === 0 &&
    !resultChoice.message.content?.trim()
  ) {
    throw httpError(
      502,
      "AI_RESPONSE_INVALID",
      "Fin tool_calls sans appel outil.",
    );
  }
  if (
    resultChoice.finish_reason === "error" ||
    resultChoice.finish_reason === "content_filter"
  ) {
    throw httpError(
      502,
      "AI_RESPONSE_INVALID",
      "Le fournisseur IA n a pas produit de reponse exploitable.",
    );
  }
  // Certains endpoints OpenAI-compatibles (notamment GLM via OpenRouter)
  // renvoient des tool_calls valides avec finish_reason="stop". La presence
  // structurelle des appels est le signal executable; le marqueur fournisseur
  // reste conserve dans nativeFinishReason pour l'audit.
  const normalizedFinishReason = resultChoice.message.tool_calls.length > 0
    ? "tool_calls"
    : resultChoice.finish_reason === "tool_calls"
    ? "stop"
    : resultChoice.finish_reason;
  return {
    text: resultChoice.message.content ?? "",
    content: resultChoice.message.content,
    toolCalls: resultChoice.message.tool_calls,
    generationId: result.id,
    modelId: result.model,
    provider: result.provider,
    finishReason: normalizedFinishReason,
    nativeFinishReason: resultChoice.native_finish_reason,
    inputTokens: result.usage.prompt_tokens,
    outputTokens: result.usage.completion_tokens,
    cachedInputTokens: result.usage.cached_tokens,
    reasoningTokens: result.usage.reasoning_tokens,
    providerCostAmount: result.usage.cost,
  };
};

const estimateTokens = (text: string): number =>
  Math.max(1, Math.round(text.length / 4));

const readProviderJson = async (response: Response): Promise<unknown> => {
  try {
    return await response.json();
  } catch {
    throw httpError(
      502,
      "AI_RESPONSE_INVALID",
      "Le fournisseur IA n a pas renvoye de JSON.",
    );
  }
};

const readProviderErrorBody = async (
  response: Response,
): Promise<string | null> => {
  try {
    const payload = await response.clone().json();
    return readProviderError(payload) ?? describeProviderPayload(payload);
  } catch {
    const text = await response.text();
    const trimmed = text.trim();
    return trimmed.length > 0 ? trimmed.slice(0, 500) : null;
  }
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const readRecord = (
  value: unknown,
  key: string,
): Record<string, unknown> | null => {
  if (!isRecord(value)) return null;
  const child = value[key];
  return isRecord(child) ? child : null;
};

const readString = (value: unknown, key: string): string | null => {
  if (!isRecord(value)) return null;
  const child = value[key];
  return typeof child === "string" ? child : null;
};

const readNumberPath = (value: unknown, path: string[]): number | null => {
  let current: unknown = value;
  for (const key of path) {
    if (!isRecord(current)) return null;
    current = current[key];
  }
  if (
    typeof current !== "string" && typeof current !== "number" &&
    current !== null && current !== undefined
  ) {
    return null;
  }
  return toNumberOrNull(current);
};

const firstChoice = (value: unknown): Record<string, unknown> | null => {
  if (!isRecord(value)) return null;
  const choices = value.choices;
  if (!Array.isArray(choices)) return null;
  const [choice] = choices;
  return isRecord(choice) ? choice : null;
};

const readProviderError = (value: unknown): string | null => {
  const error = readRecord(value, "error");
  if (!error) return null;
  const message = readString(error, "message");
  const code = readString(error, "code");
  if (message && code) return `${code} - ${message}`;
  return message ?? code ?? "erreur fournisseur sans message";
};

const readTextFromContentPart = (value: unknown): string | null => {
  if (typeof value === "string") return value;
  if (!isRecord(value)) return null;
  return readString(value, "text") ?? readString(value, "content");
};

const readMessageContent = (value: unknown): string | null => {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }
  if (!Array.isArray(value)) return null;
  const text = value
    .map(readTextFromContentPart)
    .filter((part): part is string =>
      typeof part === "string" && part.trim().length > 0
    )
    .join("\n")
    .trim();
  return text.length > 0 ? text : null;
};

const readProviderText = (value: unknown): string | null => {
  const message = readRecord(firstChoice(value), "message");
  if (!message) return null;
  return readMessageContent(message.content);
};

const describeProviderPayload = (value: unknown): string => {
  const choice = firstChoice(value);
  const message = readRecord(choice, "message");
  const details = [
    `choices=${
      isRecord(value) && Array.isArray(value.choices)
        ? value.choices.length
        : "absent"
    }`,
    `finish_reason=${readString(choice, "finish_reason") ?? "absent"}`,
    `message_keys=${
      message ? Object.keys(message).sort().join(",") : "absent"
    }`,
    `content_type=${
      message && "content" in message
        ? (Array.isArray(message.content) ? "array" : typeof message.content)
        : "absent"
    }`,
    `error=${readProviderError(value) ?? "absent"}`,
  ];
  return details.join(" | ");
};

const providerHttpError = (
  provider: AiProvider,
  status: number,
  details?: string | null,
): never => {
  if (status === 401 || status === 403) {
    throw httpError(
      502,
      "AI_PROVIDER_AUTH_FAILED",
      `Cle API ${provider} refusee.`,
      details ?? undefined,
    );
  }
  if (status === 429) {
    throw httpError(
      429,
      "AI_PROVIDER_RATE_LIMITED",
      `Quota fournisseur ${provider} atteint.`,
      details ?? undefined,
    );
  }
  throw httpError(
    503,
    "AI_PROVIDER_UNAVAILABLE",
    `Fournisseur IA ${provider} indisponible.`,
    details ?? undefined,
  );
};

const parseProviderResult = (text: string): AiDiagnosisResult => {
  const trimmed = text.trim();
  const jsonText = trimmed.startsWith("{")
    ? trimmed
    : trimmed.match(/\{[\s\S]*\}/)?.[0];
  if (!jsonText) {
    throw httpError(
      502,
      "AI_RESPONSE_INVALID",
      "La reponse IA ne contient pas de JSON.",
    );
  }
  let payload: unknown;
  try {
    payload = JSON.parse(jsonText);
  } catch {
    throw httpError(
      502,
      "AI_RESPONSE_INVALID",
      "La reponse IA n est pas un JSON valide.",
    );
  }
  const parsed = aiDiagnosisResultSchema.safeParse(payload);
  if (!parsed.success) {
    throw httpError(
      502,
      "AI_RESPONSE_INVALID",
      "La reponse IA ne respecte pas le contrat attendu.",
      parsed.error.issues.map((issue) => issue.message).join(" | "),
    );
  }
  return parsed.data;
};

export const computeCost = (
  model: ModelRow,
  usage: ProviderUsage,
): number | null => {
  if (
    model.provider === "openrouter" &&
    usage.providerCostAmount !== undefined && usage.providerCostAmount !== null
  ) {
    return Number(usage.providerCostAmount.toFixed(8));
  }
  const inputPrice = toNumberOrNull(model.input_price_per_million);
  const outputPrice = toNumberOrNull(model.output_price_per_million);
  const cachedPrice = toNumberOrNull(model.cached_input_price_per_million) ??
    inputPrice;
  const reasoningPrice = toNumberOrNull(model.reasoning_price_per_million) ??
    outputPrice;
  if (inputPrice === null || outputPrice === null) return null;
  const amount = (usage.inputTokens * inputPrice +
    usage.outputTokens * outputPrice +
    usage.cachedInputTokens * (cachedPrice ?? 0) +
    usage.reasoningTokens * (reasoningPrice ?? 0)) /
    1_000_000;
  return Number(amount.toFixed(8));
};

export const recordUsage = async (
  db: DbClient,
  input: {
    requestId: string;
    authContext: AuthContext;
    feature: AiFeature;
    model: ModelRow;
    prompt: PromptVersionRow;
    usage: ProviderUsage;
    costAmount: number | null;
    cacheHit: boolean;
    status: "success" | "cache_hit";
    latencyMs: number;
    metadata?: Record<string, unknown>;
  },
) => {
  await db.insert(ai_usage_events).values({
    request_id: input.requestId,
    feature: input.feature,
    provider: input.model.provider,
    model_id: input.model.model_id,
    model_config_id: input.model.id,
    prompt_version_id: input.prompt.id,
    user_id: input.authContext.userId,
    agency_id: input.authContext.activeAgencyId,
    input_tokens: input.usage.inputTokens,
    output_tokens: input.usage.outputTokens,
    cached_input_tokens: input.usage.cachedInputTokens,
    reasoning_tokens: input.usage.reasoningTokens,
    cost_amount: input.costAmount === null ? null : String(input.costAmount),
    currency: input.model.currency,
    cache_hit: input.cacheHit,
    status: input.status,
    latency_ms: input.latencyMs,
    metadata: input.metadata ?? {},
  });
};

export const recordErrorUsage = async (
  db: DbClient,
  requestId: string,
  authContext: AuthContext,
  featureKey: AiFeature,
  model: ModelRow,
  prompt: PromptVersionRow,
  error: unknown,
  latencyMs: number,
  metadata: Record<string, unknown> = {},
  usage?: ProviderUsage,
  costAmount?: number | null,
) => {
  await db.insert(ai_usage_events).values({
    request_id: requestId,
    feature: featureKey,
    provider: model.provider,
    model_id: model.model_id,
    model_config_id: model.id,
    prompt_version_id: prompt.id,
    user_id: authContext.userId,
    agency_id: authContext.activeAgencyId,
    input_tokens: usage?.inputTokens ?? 0,
    output_tokens: usage?.outputTokens ?? 0,
    cached_input_tokens: usage?.cachedInputTokens ?? 0,
    reasoning_tokens: usage?.reasoningTokens ?? 0,
    cost_amount: costAmount === undefined || costAmount === null
      ? null
      : String(costAmount),
    currency: model.currency,
    cache_hit: false,
    status: "error",
    error_code: typeof error === "object" && error !== null && "code" in error
      ? String(error.code)
      : "AI_DIAGNOSTIC_ERROR",
    error_message: error instanceof Error
      ? error.message
      : "Diagnostic IA impossible.",
    latency_ms: latencyMs,
    metadata,
  });
};

export const recordBlockedUsage = async (
  db: DbClient,
  requestId: string,
  authContext: AuthContext,
  featureKey: AiFeature,
  model: ModelRow,
  prompt: PromptVersionRow,
  error: unknown,
  latencyMs: number,
  metadata: Record<string, unknown> = {},
) => {
  await db.insert(ai_usage_events).values({
    request_id: requestId,
    feature: featureKey,
    provider: model.provider,
    model_id: model.model_id,
    model_config_id: model.id,
    prompt_version_id: prompt.id,
    user_id: authContext.userId,
    agency_id: authContext.activeAgencyId,
    currency: model.currency,
    cache_hit: false,
    status: "blocked",
    error_code: typeof error === "object" && error !== null && "code" in error
      ? String(error.code)
      : "AI_QUOTA_EXCEEDED",
    error_message: error instanceof Error ? error.message : "Quota IA atteint.",
    latency_ms: latencyMs,
    metadata,
  });
};

const buildDiagnosisResponse = (
  result: AiDiagnosisResult,
  usage: ProviderUsage,
  model: ModelRow,
  cache: { hit: boolean; key: string },
  costAmount: number | null,
): PricingReferenceDiagnoseResponse =>
  parseOrThrow(
    pricingReferenceDiagnoseResponseSchema,
    {
      ok: true,
      ai_available: true,
      result,
      usage: {
        provider: model.provider,
        model_id: model.model_id,
        input_tokens: usage.inputTokens,
        output_tokens: usage.outputTokens,
        cached_input_tokens: usage.cachedInputTokens,
        reasoning_tokens: usage.reasoningTokens,
      },
      cost: {
        amount: costAmount,
        currency: model.currency,
        priced: costAmount !== null,
      },
      cache,
    },
    "Reponse diagnostic IA invalide.",
  );
