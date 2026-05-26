import { z } from 'zod/v4';

import { uuidSchema } from '../admin/auth.schema.ts';
import { accountTypeSchema } from '../entity/client.schema.ts';

const MAX_CONFIG_LABEL_LENGTH = 120;

const referenceLabelSchema = z
  .string()
  .trim()
  .min(1, 'Label requis')
  .max(MAX_CONFIG_LABEL_LENGTH, 'Label trop long');

export const configStatusCategorySchema = z.enum(['todo', 'in_progress', 'done']);
export const configUsageDimensionSchema = z.enum([
  'statuses',
  'services',
  'families',
  'interaction_types',
  'entities'
]);
export const editableConfigReferenceDimensionSchema = z.enum([
  'statuses',
  'services',
  'entities',
  'families',
  'interaction_types'
]);
export const configUsageStateSchema = z.enum([
  'reference_used',
  'reference_unused',
  'used_not_in_reference'
]);

export const agencyStatusInputSchema = z.strictObject({
  id: uuidSchema.optional(),
  label: referenceLabelSchema,
  category: configStatusCategorySchema
});

export const agencyStatusSchema = agencyStatusInputSchema.extend({
  agency_id: uuidSchema.optional(),
  is_default: z.boolean(),
  is_terminal: z.boolean(),
  sort_order: z.number().int().min(1, 'Ordre invalide')
});

const referenceLabelsInputSchema = z.array(referenceLabelSchema);

export const agencyReferenceConfigInputSchema = z.strictObject({
  statuses: z.array(agencyStatusInputSchema).min(1, 'Au moins un statut requis'),
  services: referenceLabelsInputSchema,
  entities: referenceLabelsInputSchema,
  families: referenceLabelsInputSchema,
  interaction_types: referenceLabelsInputSchema
});

export const agencyReferenceConfigSchema = z.strictObject({
  statuses: z.array(agencyStatusSchema),
  services: referenceLabelsInputSchema,
  entities: referenceLabelsInputSchema,
  families: referenceLabelsInputSchema,
  interaction_types: referenceLabelsInputSchema
});

export const departmentReferenceSchema = z.strictObject({
  code: z
    .string()
    .trim()
    .regex(/^(?:\d{2,3}|2[AB])$/, 'Code departement invalide'),
  label: referenceLabelSchema,
  sort_order: z.number().int().min(1, 'Ordre invalide'),
  is_active: z.boolean()
});

export const productFeatureFlagsSchema = z.strictObject({
  ui_shell_v2: z.boolean()
});

export const productOnboardingConfigSchema = z.strictObject({
  allow_manual_entry: z.boolean(),
  default_account_type_company: accountTypeSchema,
  default_account_type_individual: z.literal('cash')
});

export const agencyOnboardingOverridesSchema = z.strictObject({
  allow_manual_entry: z.boolean().optional(),
  default_account_type_company: accountTypeSchema.optional(),
  default_account_type_individual: z.literal('cash').optional()
});

export const appSettingsSchema = z.strictObject({
  feature_flags: productFeatureFlagsSchema,
  onboarding: productOnboardingConfigSchema
});

export const agencySettingsSchema = z.strictObject({
  onboarding: agencyOnboardingOverridesSchema
});

export const configGetInputSchema = z.strictObject({
  agency_id: uuidSchema.optional()
});

export const configUsageInputSchema = z.strictObject({
  agency_id: uuidSchema
});

export const configSaveAgencyInputSchema = z.strictObject({
  agency_id: uuidSchema,
  onboarding: agencyOnboardingOverridesSchema,
  references: agencyReferenceConfigInputSchema
});

const configReferenceBaseActionSchema = z.strictObject({
  agency_id: uuidSchema,
  dimension: editableConfigReferenceDimensionSchema
});

export const configReferenceAddInputSchema = configReferenceBaseActionSchema.extend({
  action: z.literal('add'),
  label: referenceLabelSchema,
  status_id: uuidSchema.optional(),
  category: configStatusCategorySchema.optional()
});

export const configReferenceRenameInputSchema = configReferenceBaseActionSchema.extend({
  action: z.literal('rename'),
  reference_id: uuidSchema.optional(),
  previous_label: referenceLabelSchema.optional(),
  next_label: referenceLabelSchema
});

export const configReferenceDeleteInputSchema = configReferenceBaseActionSchema.extend({
  action: z.literal('delete'),
  reference_id: uuidSchema.optional(),
  label: referenceLabelSchema.optional()
});

export const configReferenceReorderInputSchema = configReferenceBaseActionSchema.extend({
  action: z.literal('reorder'),
  reference_ids: z.array(uuidSchema).optional(),
  labels: z.array(referenceLabelSchema).optional()
});

export const configReferenceActionInputSchema = z.union([
  configReferenceAddInputSchema,
  configReferenceRenameInputSchema,
  configReferenceDeleteInputSchema,
  configReferenceReorderInputSchema
]);

export const configSaveProductInputSchema = appSettingsSchema;

export const resolvedConfigSnapshotSchema = z.strictObject({
  product: appSettingsSchema,
  agency: agencySettingsSchema,
  references: agencyReferenceConfigSchema.extend({
    departments: z.array(departmentReferenceSchema)
  })
});

export const configUsageRowSchema = z.strictObject({
  label: referenceLabelSchema,
  reference_id: uuidSchema.nullable(),
  sort_order: z.number().int().min(1, 'Ordre invalide').nullable(),
  usage_count: z.number().int().min(0, 'Compteur invalide'),
  state: configUsageStateSchema
});

export const configUsageSnapshotSchema = z.strictObject({
  agency_id: uuidSchema,
  dimensions: z.record(configUsageDimensionSchema, z.array(configUsageRowSchema)),
  totals: z.strictObject({
    used_not_in_reference: z.number().int().min(0, 'Compteur invalide'),
    referenced_values: z.number().int().min(0, 'Compteur invalide'),
    used_values: z.number().int().min(0, 'Compteur invalide')
  })
});

export const DEFAULT_PRODUCT_FEATURE_FLAGS: ProductFeatureFlags = {
  ui_shell_v2: false
};

export const DEFAULT_PRODUCT_ONBOARDING_CONFIG: ProductOnboardingConfig = {
  allow_manual_entry: true,
  default_account_type_company: 'term',
  default_account_type_individual: 'cash'
};

export const DEFAULT_APP_SETTINGS: AppSettings = {
  feature_flags: DEFAULT_PRODUCT_FEATURE_FLAGS,
  onboarding: DEFAULT_PRODUCT_ONBOARDING_CONFIG
};

export const DEFAULT_AGENCY_SETTINGS: AgencySettings = {
  onboarding: {}
};

export const EMPTY_AGENCY_REFERENCE_CONFIG: AgencyReferenceConfig = {
  statuses: [],
  services: [],
  entities: [],
  families: [],
  interaction_types: []
};

export const resolveOnboardingConfig = (
  product: ProductOnboardingConfig,
  agency: AgencyOnboardingOverrides
): ProductOnboardingConfig => ({
  allow_manual_entry: agency.allow_manual_entry ?? product.allow_manual_entry,
  default_account_type_company:
    agency.default_account_type_company ?? product.default_account_type_company,
  default_account_type_individual:
    agency.default_account_type_individual ?? product.default_account_type_individual
});

export type ConfigStatusCategory = z.infer<typeof configStatusCategorySchema>;
export type ConfigUsageDimension = z.infer<typeof configUsageDimensionSchema>;
export type EditableConfigReferenceDimension = z.infer<typeof editableConfigReferenceDimensionSchema>;
export type ConfigUsageState = z.infer<typeof configUsageStateSchema>;
export type AgencyStatusInput = z.infer<typeof agencyStatusInputSchema>;
export type AgencyStatusConfig = z.infer<typeof agencyStatusSchema>;
export type AgencyReferenceConfigInput = z.infer<typeof agencyReferenceConfigInputSchema>;
export type AgencyReferenceConfig = z.infer<typeof agencyReferenceConfigSchema>;
export type DepartmentReference = z.infer<typeof departmentReferenceSchema>;
export type ProductFeatureFlags = z.infer<typeof productFeatureFlagsSchema>;
export type ProductOnboardingConfig = z.infer<typeof productOnboardingConfigSchema>;
export type AgencyOnboardingOverrides = z.infer<typeof agencyOnboardingOverridesSchema>;
export type AppSettings = z.infer<typeof appSettingsSchema>;
export type AgencySettings = z.infer<typeof agencySettingsSchema>;
export type ConfigGetInput = z.infer<typeof configGetInputSchema>;
export type ConfigUsageInput = z.infer<typeof configUsageInputSchema>;
export type ConfigSaveAgencyInput = z.infer<typeof configSaveAgencyInputSchema>;
export type ConfigReferenceActionInput = z.infer<typeof configReferenceActionInputSchema>;
export type ConfigReferenceAddInput = z.infer<typeof configReferenceAddInputSchema>;
export type ConfigReferenceRenameInput = z.infer<typeof configReferenceRenameInputSchema>;
export type ConfigReferenceDeleteInput = z.infer<typeof configReferenceDeleteInputSchema>;
export type ConfigReferenceReorderInput = z.infer<typeof configReferenceReorderInputSchema>;
export type ConfigSaveProductInput = z.infer<typeof configSaveProductInputSchema>;
export type ResolvedConfigSnapshot = z.infer<typeof resolvedConfigSnapshotSchema>;
export type ConfigUsageRow = z.infer<typeof configUsageRowSchema>;
export type ConfigUsageSnapshot = z.infer<typeof configUsageSnapshotSchema>;
