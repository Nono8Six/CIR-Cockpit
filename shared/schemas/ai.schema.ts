import { z } from 'zod/v4';

const uuidSchema = z.uuid({ error: 'Identifiant invalide.' });
const nonEmptyStringSchema = (message: string) => z.string().trim().min(1, { error: message });
const nullableTextSchema = z.string().nullable();
const optionalNullableTextSchema = z.string().trim().min(1, { error: 'Valeur invalide.' }).nullable().optional();

export const aiProviderSchema = z.enum(['openrouter']);
export const aiPromptStatusSchema = z.enum(['draft', 'published', 'archived']);
export const aiUsageStatusSchema = z.enum(['success', 'error', 'blocked', 'cache_hit']);
export const aiFeatureSchema = z.enum([
  'pricing.references.diagnose',
  'pricing.references.diagnose.classification',
  'pricing.references.diagnose.segments'
]);

export const aiProviderConfigSchema = z.strictObject({
  id: uuidSchema,
  provider: aiProviderSchema,
  label: nonEmptyStringSchema('Libelle fournisseur requis.'),
  enabled: z.boolean(),
  has_api_key: z.boolean(),
  api_key_last4: nullableTextSchema,
  base_url: nullableTextSchema,
  organization_id: nullableTextSchema,
  last_test_status: z.enum(['success', 'failed']).nullable(),
  last_test_at: nullableTextSchema,
  last_error_code: nullableTextSchema,
  last_error_message: nullableTextSchema,
  created_at: nonEmptyStringSchema('Date de creation requise.'),
  updated_at: nonEmptyStringSchema('Date de mise a jour requise.')
});

export const aiModelConfigSchema = z.strictObject({
  id: uuidSchema,
  provider_config_id: uuidSchema,
  provider: aiProviderSchema,
  model_id: nonEmptyStringSchema('Identifiant modele requis.'),
  label: nonEmptyStringSchema('Libelle modele requis.'),
  enabled: z.boolean(),
  is_default: z.boolean(),
  currency: nonEmptyStringSchema('Devise requise.'),
  input_price_per_million: z.number().nonnegative().nullable(),
  output_price_per_million: z.number().nonnegative().nullable(),
  cached_input_price_per_million: z.number().nonnegative().nullable(),
  reasoning_price_per_million: z.number().nonnegative().nullable(),
  price_effective_at: nullableTextSchema,
  max_output_tokens: z.number().int().positive(),
  temperature: z.number().min(0).max(1),
  created_at: nonEmptyStringSchema('Date de creation requise.'),
  updated_at: nonEmptyStringSchema('Date de mise a jour requise.')
});

export const aiPromptTemplateSchema = z.strictObject({
  id: uuidSchema,
  feature: aiFeatureSchema,
  label: nonEmptyStringSchema('Libelle prompt requis.'),
  description: nullableTextSchema,
  allowed_variables: z.array(nonEmptyStringSchema('Variable de prompt requise.')),
  created_at: nonEmptyStringSchema('Date de creation requise.'),
  updated_at: nonEmptyStringSchema('Date de mise a jour requise.')
});

export const aiPromptVersionSchema = z.strictObject({
  id: uuidSchema,
  template_id: uuidSchema,
  version: z.number().int().positive(),
  status: aiPromptStatusSchema,
  body: nonEmptyStringSchema('Prompt requis.'),
  change_note: nullableTextSchema,
  created_by: nullableTextSchema,
  published_by: nullableTextSchema,
  published_at: nullableTextSchema,
  created_at: nonEmptyStringSchema('Date de creation requise.')
});

export const aiPromptWithVersionsSchema = aiPromptTemplateSchema.extend({
  versions: z.array(aiPromptVersionSchema),
  published_version: aiPromptVersionSchema.nullable(),
  draft_version: aiPromptVersionSchema.nullable()
});

export const aiQuotaPolicySchema = z.strictObject({
  id: uuidSchema,
  scope: z.enum(['global', 'agency', 'user']),
  agency_id: nullableTextSchema,
  user_id: nullableTextSchema,
  feature: aiFeatureSchema.nullable(),
  enabled: z.boolean(),
  daily_call_limit: z.number().int().nonnegative().nullable(),
  monthly_call_limit: z.number().int().nonnegative().nullable(),
  daily_token_limit: z.number().int().nonnegative().nullable(),
  monthly_token_limit: z.number().int().nonnegative().nullable(),
  daily_cost_limit: z.number().nonnegative().nullable(),
  monthly_cost_limit: z.number().nonnegative().nullable(),
  currency: nonEmptyStringSchema('Devise requise.'),
  created_at: nonEmptyStringSchema('Date de creation requise.'),
  updated_at: nonEmptyStringSchema('Date de mise a jour requise.')
});

export const aiUsageDailyPointSchema = z.strictObject({
  date: nonEmptyStringSchema('Date requise.'),
  calls: z.number().int().nonnegative(),
  errors: z.number().int().nonnegative(),
  cache_hits: z.number().int().nonnegative(),
  input_tokens: z.number().int().nonnegative(),
  output_tokens: z.number().int().nonnegative(),
  cost_amount: z.number().nonnegative()
});

export const aiUsageEventSchema = z.strictObject({
  id: uuidSchema,
  request_id: nonEmptyStringSchema('Identifiant requete requis.'),
  feature: aiFeatureSchema,
  provider: aiProviderSchema,
  model_id: nonEmptyStringSchema('Identifiant modele requis.'),
  model_config_id: uuidSchema.nullable(),
  prompt_version_id: uuidSchema.nullable(),
  user_id: nullableTextSchema,
  agency_id: nullableTextSchema,
  input_tokens: z.number().int().nonnegative(),
  output_tokens: z.number().int().nonnegative(),
  cached_input_tokens: z.number().int().nonnegative(),
  reasoning_tokens: z.number().int().nonnegative(),
  cost_amount: z.number().nonnegative().nullable(),
  currency: nonEmptyStringSchema('Devise requise.'),
  cache_hit: z.boolean(),
  status: aiUsageStatusSchema,
  error_code: nullableTextSchema,
  error_message: nullableTextSchema,
  latency_ms: z.number().int().nonnegative().nullable(),
  created_at: nonEmptyStringSchema('Date de creation requise.')
});

export const aiUsageSummarySchema = z.strictObject({
  calls: z.number().int().nonnegative(),
  successful_calls: z.number().int().nonnegative(),
  failed_calls: z.number().int().nonnegative(),
  cache_hits: z.number().int().nonnegative(),
  input_tokens: z.number().int().nonnegative(),
  output_tokens: z.number().int().nonnegative(),
  cached_input_tokens: z.number().int().nonnegative(),
  reasoning_tokens: z.number().int().nonnegative(),
  cost_amount: z.number().nonnegative(),
  currency: nonEmptyStringSchema('Devise requise.'),
  period_start: nonEmptyStringSchema('Debut de periode requis.'),
  period_end: nonEmptyStringSchema('Fin de periode requise.'),
  daily: z.array(aiUsageDailyPointSchema)
});

export const aiSettingsGetInputSchema = z.strictObject({});
export const aiSettingsGetResponseSchema = z.strictObject({
  ok: z.literal(true),
  request_id: z.string().trim().min(1).optional(),
  providers: z.array(aiProviderConfigSchema),
  models: z.array(aiModelConfigSchema),
  quotas: z.array(aiQuotaPolicySchema)
});

export const aiSettingsSaveProviderInputSchema = z.strictObject({
  provider: aiProviderSchema,
  enabled: z.boolean(),
  api_key: z.string().trim().min(1, { error: 'Cle API invalide.' }).optional(),
  base_url: optionalNullableTextSchema,
  organization_id: optionalNullableTextSchema
});

export const aiSettingsSaveProviderResponseSchema = z.strictObject({
  ok: z.literal(true),
  request_id: z.string().trim().min(1).optional(),
  provider: aiProviderConfigSchema
});

export const aiSettingsTestProviderInputSchema = z.strictObject({
  provider: aiProviderSchema,
  api_key: z.string().trim().min(1, { error: 'Cle API invalide.' }).optional()
});

export const aiSettingsTestProviderResponseSchema = z.strictObject({
  ok: z.literal(true),
  request_id: z.string().trim().min(1).optional(),
  provider: aiProviderSchema,
  status: z.enum(['success', 'failed']),
  message: nonEmptyStringSchema('Message de test requis.')
});

export const aiSettingsSaveModelInputSchema = z.strictObject({
  provider: aiProviderSchema,
  model_id: nonEmptyStringSchema('Identifiant modele requis.'),
  label: nonEmptyStringSchema('Libelle modele requis.'),
  enabled: z.boolean(),
  is_default: z.boolean(),
  currency: nonEmptyStringSchema('Devise requise.'),
  input_price_per_million: z.number().nonnegative().nullable(),
  output_price_per_million: z.number().nonnegative().nullable(),
  cached_input_price_per_million: z.number().nonnegative().nullable(),
  reasoning_price_per_million: z.number().nonnegative().nullable(),
  price_effective_at: optionalNullableTextSchema,
  max_output_tokens: z.number().int().positive(),
  temperature: z.number().min(0).max(1)
});

export const aiSettingsSaveModelResponseSchema = z.strictObject({
  ok: z.literal(true),
  request_id: z.string().trim().min(1).optional(),
  model: aiModelConfigSchema
});

export const aiSettingsSaveQuotaInputSchema = z.strictObject({
  id: uuidSchema,
  enabled: z.boolean(),
  daily_call_limit: z.number().int().nonnegative().nullable(),
  monthly_call_limit: z.number().int().nonnegative().nullable(),
  daily_token_limit: z.number().int().nonnegative().nullable(),
  monthly_token_limit: z.number().int().nonnegative().nullable(),
  daily_cost_limit: z.number().nonnegative().nullable(),
  monthly_cost_limit: z.number().nonnegative().nullable(),
  currency: nonEmptyStringSchema('Devise requise.')
});
export const aiSettingsSaveQuotaResponseSchema = z.strictObject({
  ok: z.literal(true),
  request_id: z.string().trim().min(1).optional(),
  quota: aiQuotaPolicySchema
});

export const aiPromptsListInputSchema = z.strictObject({
  feature: aiFeatureSchema.optional()
});
export const aiPromptsListResponseSchema = z.strictObject({
  ok: z.literal(true),
  request_id: z.string().trim().min(1).optional(),
  prompts: z.array(aiPromptWithVersionsSchema)
});

export const aiPromptsSaveDraftInputSchema = z.strictObject({
  template_id: uuidSchema,
  body: nonEmptyStringSchema('Prompt requis.'),
  change_note: optionalNullableTextSchema
});
export const aiPromptsSaveDraftResponseSchema = z.strictObject({
  ok: z.literal(true),
  request_id: z.string().trim().min(1).optional(),
  version: aiPromptVersionSchema
});

export const aiPromptsPublishInputSchema = z.strictObject({
  version_id: uuidSchema
});
export const aiPromptsPublishResponseSchema = z.strictObject({
  ok: z.literal(true),
  request_id: z.string().trim().min(1).optional(),
  version: aiPromptVersionSchema
});

export const aiPromptsRestoreInputSchema = z.strictObject({
  version_id: uuidSchema
});
export const aiPromptsRestoreResponseSchema = z.strictObject({
  ok: z.literal(true),
  request_id: z.string().trim().min(1).optional(),
  version: aiPromptVersionSchema
});

export const aiUsageSummaryInputSchema = z.strictObject({
  feature: aiFeatureSchema.optional(),
  days: z.number().int().positive().max(366).default(30)
});
export const aiUsageSummaryResponseSchema = z.strictObject({
  ok: z.literal(true),
  request_id: z.string().trim().min(1).optional(),
  summary: aiUsageSummarySchema
});

export const aiUsageListInputSchema = z.strictObject({
  feature: aiFeatureSchema.optional(),
  page: z.number().int().positive().default(1),
  page_size: z.number().int().positive().max(100).default(50)
});
export const aiUsageListResponseSchema = z.strictObject({
  ok: z.literal(true),
  request_id: z.string().trim().min(1).optional(),
  events: z.array(aiUsageEventSchema),
  page: z.number().int().positive(),
  page_size: z.number().int().positive(),
  total: z.number().int().nonnegative()
});

export const aiDiagnosisResultSchema = z.strictObject({
  summary: nonEmptyStringSchema('Synthese IA requise.'),
  priority_anomalies: z.array(z.strictObject({
    title: nonEmptyStringSchema('Titre anomalie requis.'),
    severity: z.enum(['bloquante', 'haute', 'moyenne', 'faible']),
    evidence: nonEmptyStringSchema('Preuve anomalie requise.'),
    recommendation: nonEmptyStringSchema('Recommendation requise.')
  })),
  recommendations: z.array(nonEmptyStringSchema('Recommendation requise.')),
  limits: z.array(nonEmptyStringSchema('Limite requise.')),
  confidence: z.number().min(0).max(1)
});

export const aiDiagnosisUsageSchema = z.strictObject({
  provider: aiProviderSchema,
  model_id: nonEmptyStringSchema('Identifiant modele requis.'),
  input_tokens: z.number().int().nonnegative(),
  output_tokens: z.number().int().nonnegative(),
  cached_input_tokens: z.number().int().nonnegative(),
  reasoning_tokens: z.number().int().nonnegative()
});

export const aiDiagnosisCostSchema = z.strictObject({
  amount: z.number().nonnegative().nullable(),
  currency: nonEmptyStringSchema('Devise requise.'),
  priced: z.boolean()
});

export const aiDiagnosisCacheSchema = z.strictObject({
  hit: z.boolean(),
  key: nonEmptyStringSchema('Cle cache requise.').optional()
});

export type AiProvider = z.infer<typeof aiProviderSchema>;
export type AiFeature = z.infer<typeof aiFeatureSchema>;
export type AiPromptStatus = z.infer<typeof aiPromptStatusSchema>;
export type AiUsageStatus = z.infer<typeof aiUsageStatusSchema>;
export type AiProviderConfig = z.infer<typeof aiProviderConfigSchema>;
export type AiModelConfig = z.infer<typeof aiModelConfigSchema>;
export type AiQuotaPolicy = z.infer<typeof aiQuotaPolicySchema>;
export type AiUsageDailyPoint = z.infer<typeof aiUsageDailyPointSchema>;
export type AiPromptWithVersions = z.infer<typeof aiPromptWithVersionsSchema>;
export type AiPromptVersion = z.infer<typeof aiPromptVersionSchema>;
export type AiDiagnosisResult = z.infer<typeof aiDiagnosisResultSchema>;
export type AiDiagnosisUsage = z.infer<typeof aiDiagnosisUsageSchema>;
export type AiDiagnosisCost = z.infer<typeof aiDiagnosisCostSchema>;
export type AiDiagnosisCache = z.infer<typeof aiDiagnosisCacheSchema>;
export type AiSettingsSaveProviderInput = z.infer<typeof aiSettingsSaveProviderInputSchema>;
export type AiSettingsTestProviderInput = z.infer<typeof aiSettingsTestProviderInputSchema>;
export type AiSettingsSaveModelInput = z.infer<typeof aiSettingsSaveModelInputSchema>;
export type AiSettingsSaveQuotaInput = z.infer<typeof aiSettingsSaveQuotaInputSchema>;
export type AiPromptsListInput = z.infer<typeof aiPromptsListInputSchema>;
export type AiPromptsSaveDraftInput = z.infer<typeof aiPromptsSaveDraftInputSchema>;
export type AiPromptsPublishInput = z.infer<typeof aiPromptsPublishInputSchema>;
export type AiPromptsRestoreInput = z.infer<typeof aiPromptsRestoreInputSchema>;
export type AiUsageSummaryInput = z.infer<typeof aiUsageSummaryInputSchema>;
export type AiUsageListInput = z.infer<typeof aiUsageListInputSchema>;
