import { z } from 'zod/v4';

import { uuidSchema } from './auth.schema.ts';
import { accountTypeSchema } from './client.schema.ts';

const MAX_CONFIG_LABEL_LENGTH = 120;

const referenceLabelSchema = z
  .string()
  .trim()
  .min(1, 'Label requis')
  .max(MAX_CONFIG_LABEL_LENGTH, 'Label trop long');

export const configStatusCategorySchema = z.enum(['todo', 'in_progress', 'done']);

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

export const configSaveAgencyInputSchema = z.strictObject({
  agency_id: uuidSchema,
  onboarding: agencyOnboardingOverridesSchema,
  references: agencyReferenceConfigInputSchema
});

export const configSaveProductInputSchema = appSettingsSchema;

export const resolvedConfigSnapshotSchema = z.strictObject({
  product: appSettingsSchema,
  agency: agencySettingsSchema,
  references: agencyReferenceConfigSchema.extend({
    departments: z.array(departmentReferenceSchema)
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
export type ConfigSaveAgencyInput = z.infer<typeof configSaveAgencyInputSchema>;
export type ConfigSaveProductInput = z.infer<typeof configSaveProductInputSchema>;
export type ResolvedConfigSnapshot = z.infer<typeof resolvedConfigSnapshotSchema>;
