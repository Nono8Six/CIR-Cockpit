import { and, desc, eq, sql } from "drizzle-orm";

import {
  ai_feature_model_assignments,
  ai_model_configs,
  ai_prompt_templates,
  ai_prompt_versions,
  ai_provider_configs,
  ai_quota_policies,
  ai_usage_events,
} from "../../../drizzle/schema.ts";
import {
  type AiBudgetAlert,
  type AiFeature,
  type AiQuotaUsage,
  aiFeatureModelAssignmentSchema,
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
  type AiSettingsSaveFeatureAssignmentInput,
  aiSettingsSaveFeatureAssignmentResponseSchema,
  type AiSettingsSaveModelInput,
  aiSettingsSaveModelResponseSchema,
  type AiSettingsSaveProviderInput,
  aiSettingsSaveProviderResponseSchema,
  type AiSettingsSaveQuotaInput,
  aiSettingsSaveQuotaResponseSchema,
  type AiSettingsTestProviderInput,
  aiSettingsTestProviderResponseSchema,
  aiUsageEventSchema,
  type AiUsageGetByIdInput,
  aiUsageGetByIdResponseSchema,
  type AiUsageListInput,
  aiUsageListResponseSchema,
  type AiUsageSummaryInput,
  aiUsageSummaryResponseSchema,
} from "../../../../shared/schemas/ai.schema.ts";
import { getConfig } from "../../config.ts";
import { httpError } from "../../middleware/errorHandler.ts";
import type { DbClient } from "../../types.ts";
import {
  assertCanonicalProviderEndpoint,
  providerBaseUrl,
} from "./runtime/providerRegistry.ts";

export type ProviderRow = typeof ai_provider_configs.$inferSelect;
export type ModelRow = typeof ai_model_configs.$inferSelect;
type PromptTemplateRow = typeof ai_prompt_templates.$inferSelect;
export type PromptVersionRow = typeof ai_prompt_versions.$inferSelect;
type QuotaUsageRow = AiQuotaUsage & {
  daily_cost_limit: number | null;
  monthly_cost_limit: number | null;
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
  const secret = getConfig().aiSecretEncryptionKey;
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

const toFeatureModelAssignment = (
  row: typeof ai_feature_model_assignments.$inferSelect,
) =>
  parseOrThrow(
    aiFeatureModelAssignmentSchema,
    {
      feature: row.feature,
      model_config_id: row.model_config_id,
      created_by: row.created_by,
      updated_by: row.updated_by,
      created_at: row.created_at,
      updated_at: row.updated_at,
    },
    "Affectation modele IA invalide.",
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
        coalesce(sum(e.input_tokens + e.output_tokens), 0)::float8 as total_tokens,
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
  const [providers, models, assignments, quotas] = await Promise.all([
    db
      .select()
      .from(ai_provider_configs)
      .orderBy(ai_provider_configs.provider),
    db
      .select()
      .from(ai_model_configs)
      .orderBy(ai_model_configs.provider, ai_model_configs.label),
    db
      .select()
      .from(ai_feature_model_assignments)
      .orderBy(ai_feature_model_assignments.feature),
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
      assignments: assignments.map(toFeatureModelAssignment),
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
  assertCanonicalProviderEndpoint(input.provider, input.base_url);
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

export const saveAiFeatureAssignment = async (
  db: DbClient,
  callerId: string,
  requestId: string,
  input: AiSettingsSaveFeatureAssignmentInput,
) => {
  if (input.model_config_id === null) {
    await db.delete(ai_feature_model_assignments).where(
      eq(ai_feature_model_assignments.feature, input.feature),
    );
    return parseOrThrow(
      aiSettingsSaveFeatureAssignmentResponseSchema,
      {
        ok: true,
        request_id: requestId,
        assignment: null,
      },
      "Reponse reinitialisation affectation modele IA invalide.",
    );
  }

  const [model] = await db
    .select()
    .from(ai_model_configs)
    .where(eq(ai_model_configs.id, input.model_config_id))
    .limit(1);
  if (!model) {
    throw httpError(404, "AI_CONFIG_MISSING", "Modele IA introuvable.");
  }

  const [row] = await db
    .insert(ai_feature_model_assignments)
    .values({
      feature: input.feature,
      model_config_id: input.model_config_id,
      created_by: callerId,
      updated_by: callerId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .onConflictDoUpdate({
      target: ai_feature_model_assignments.feature,
      set: {
        model_config_id: input.model_config_id,
        updated_by: callerId,
        updated_at: new Date().toISOString(),
      },
    })
    .returning();

  return parseOrThrow(
    aiSettingsSaveFeatureAssignmentResponseSchema,
    {
      ok: true,
      request_id: requestId,
      assignment: toFeatureModelAssignment(row),
    },
    "Reponse affectation modele IA invalide.",
  );
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

  const baseUrl = assertCanonicalProviderEndpoint(
    provider.provider,
    provider.base_url,
  );
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
    await testProviderConnection(provider.provider, key, baseUrl);
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

const budgetAlertFromPeriod = (
  usage: QuotaUsageRow,
  period: "day" | "month",
  costAmount: number,
  costLimit: number | null,
): AiBudgetAlert | null => {
  const limit = Number(costLimit ?? 0);
  if (!(limit > 0)) return null;
  const amount = Number(costAmount);
  const ratio = amount / limit;
  if (ratio < 0.8) return null;
  return {
    quota_id: usage.quota_id,
    scope: usage.scope,
    feature: usage.feature,
    period,
    cost_amount: amount,
    cost_limit: limit,
    ratio,
    level: amount >= limit ? "reached" : "approaching",
    currency: usage.currency,
  };
};

const budgetAlertsFromQuotaUsages = (
  usages: readonly QuotaUsageRow[],
): AiBudgetAlert[] =>
  usages
    .flatMap((usage) => [
      budgetAlertFromPeriod(usage, "day", usage.daily_cost, usage.daily_cost_limit),
      budgetAlertFromPeriod(
        usage,
        "month",
        usage.monthly_cost,
        usage.monthly_cost_limit,
      ),
    ])
    .filter((alert): alert is AiBudgetAlert => alert !== null)
    .sort((left, right) =>
      right.ratio - left.ratio || left.quota_id.localeCompare(right.quota_id)
    );

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
  const quotaUsageRows = await db.execute<QuotaUsageRow>(sql`
    with quota_usage as (
      select q.id as quota_id, q.scope, q.feature, q.currency,
        q.daily_cost_limit::float8 as daily_cost_limit,
        q.monthly_cost_limit::float8 as monthly_cost_limit,
        coalesce(count(e.id) filter (
          where e.created_at >= date_trunc('day', now())
        ), 0)::int as daily_calls,
        coalesce(count(e.id) filter (
          where e.created_at >= date_trunc('month', now())
        ), 0)::int as monthly_calls,
        coalesce(sum(e.input_tokens + e.output_tokens) filter (
          where e.created_at >= date_trunc('day', now())
        ), 0)::int as daily_tokens,
        coalesce(sum(e.input_tokens + e.output_tokens) filter (
          where e.created_at >= date_trunc('month', now())
        ), 0)::int as monthly_tokens,
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
    )
    select quota_id, scope, feature, currency,
      daily_calls, monthly_calls, daily_tokens, monthly_tokens,
      daily_cost, monthly_cost, daily_cost_limit, monthly_cost_limit
    from quota_usage
    order by quota_id
  `);
  const quotaUsages = quotaUsageRows.map((usage) => ({
    quota_id: usage.quota_id,
    scope: usage.scope,
    feature: usage.feature,
    currency: usage.currency,
    daily_calls: Number(usage.daily_calls),
    monthly_calls: Number(usage.monthly_calls),
    daily_tokens: Number(usage.daily_tokens),
    monthly_tokens: Number(usage.monthly_tokens),
    daily_cost: Number(usage.daily_cost),
    monthly_cost: Number(usage.monthly_cost),
  }));

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
        budget_alerts: budgetAlertsFromQuotaUsages(quotaUsageRows),
        quota_usages: quotaUsages,
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
    where (${input.feature ?? null}::text is null or feature = ${input.feature ?? null})
      and (${input.status ?? null}::text is null or status = ${input.status ?? null})
      and (${input.user_id ?? null}::uuid is null or user_id = ${input.user_id ?? null}::uuid)
      and (${input.agency_id ?? null}::uuid is null or agency_id = ${input.agency_id ?? null}::uuid)
    order by created_at desc
    limit ${input.page_size}
    offset ${offset}
  `);
  const [totalRow] = await db.execute<{ total: number }>(sql`
    select count(*)::int as total
    from public.ai_usage_events
    where (${input.feature ?? null}::text is null or feature = ${input.feature ?? null})
      and (${input.status ?? null}::text is null or status = ${input.status ?? null})
      and (${input.user_id ?? null}::uuid is null or user_id = ${input.user_id ?? null}::uuid)
      and (${input.agency_id ?? null}::uuid is null or agency_id = ${input.agency_id ?? null}::uuid)
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
      total: Number(totalRow?.total ?? 0),
    },
    "Liste usage IA invalide.",
  );
};

export const getAiUsageEventById = async (
  db: DbClient,
  _callerId: string,
  requestId: string,
  input: AiUsageGetByIdInput,
) => {
  const [row] = await db
    .select()
    .from(ai_usage_events)
    .where(eq(ai_usage_events.id, input.id))
    .limit(1);

  if (!row) {
    throw httpError(
      404,
      "AI_CONFIG_MISSING",
      "Evenement d usage IA introuvable.",
    );
  }

  const event = parseOrThrow(
    aiUsageEventSchema,
    {
      id: row.id,
      request_id: row.request_id,
      feature: row.feature,
      provider: row.provider,
      model_id: row.model_id,
      model_config_id: row.model_config_id,
      prompt_version_id: row.prompt_version_id,
      user_id: row.user_id,
      agency_id: row.agency_id,
      input_tokens: row.input_tokens,
      output_tokens: row.output_tokens,
      cached_input_tokens: row.cached_input_tokens,
      reasoning_tokens: row.reasoning_tokens,
      cost_amount: toNumberOrNull(row.cost_amount),
      currency: row.currency,
      cache_hit: row.cache_hit,
      status: row.status,
      error_code: row.error_code,
      error_message: row.error_message,
      latency_ms: row.latency_ms,
      created_at: row.created_at,
    },
    "Evenement usage IA invalide.",
  );

  return parseOrThrow(
    aiUsageGetByIdResponseSchema,
    {
      ok: true,
      request_id: requestId,
      event: {
        ...event,
        metadata: (row.metadata as Record<string, unknown>) ?? {},
      },
    },
    "Detail d evenement d usage IA invalide.",
  );
};

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

export const testProviderConnection = async (
  provider: AiProvider,
  key: string,
  baseUrl: string | null,
): Promise<void> => {
  const url = `${assertCanonicalProviderEndpoint(provider, baseUrl)}/models`;
  const response = await fetch(url, {
    method: "GET",
    headers: providerConnectionHeaders(key),
    redirect: "error",
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) {
    throw providerHttpError(provider, response.status);
  }
};

const providerConnectionHeaders = (key: string): HeadersInit => {
  return { Authorization: `Bearer ${key}` };
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
