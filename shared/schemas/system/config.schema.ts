import { z } from 'zod/v4';

import { uuidSchema } from '../admin/auth.schema.ts';
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
  'interaction_types'
]);
export const editableConfigReferenceDimensionSchema = z.enum([
  'statuses',
  'services',
  'families',
  'interaction_types'
]);
export const configUsageStateSchema = z.enum([
  'active_used',
  'active_unused',
  'archived_used',
  'archived_unused',
  'resolved_historical',
  'system_managed',
  'unresolved'
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
  is_active: z.boolean(),
  sort_order: z.number().int().min(1, 'Ordre invalide')
});

const referenceLabelsInputSchema = z.array(referenceLabelSchema);

export const agencyReferenceConfigInputSchema = z.strictObject({
  statuses: z.array(agencyStatusInputSchema).min(1, 'Au moins un statut requis'),
  services: referenceLabelsInputSchema,
  families: referenceLabelsInputSchema,
  interaction_types: referenceLabelsInputSchema
});

export const agencyReferenceConfigSchema = z.strictObject({
  statuses: z.array(agencyStatusSchema),
  historical_statuses: z.array(agencyStatusSchema),
  services: referenceLabelsInputSchema,
  families: referenceLabelsInputSchema,
  interaction_types: referenceLabelsInputSchema,
  resolutions: z.array(z.strictObject({
    id: uuidSchema,
    dimension: configUsageDimensionSchema,
    source_label: referenceLabelSchema,
    target_reference_id: uuidSchema,
    target_label: referenceLabelSchema
  })).optional()
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

export const configGetInputSchema = z.strictObject({
  agency_id: uuidSchema.optional()
});

export const configUsageInputSchema = z.strictObject({
  agency_id: uuidSchema
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

export const configReferenceArchiveInputSchema = configReferenceBaseActionSchema.extend({
  action: z.literal('archive'),
  reference_id: uuidSchema.optional(),
  label: referenceLabelSchema.optional()
});

export const configReferenceRestoreInputSchema = configReferenceBaseActionSchema.extend({
  action: z.literal('restore'),
  reference_id: uuidSchema.optional(),
  label: referenceLabelSchema.optional()
});

export const configReferenceResolveInputSchema = configReferenceBaseActionSchema.extend({
  action: z.literal('resolve'),
  source_label: referenceLabelSchema,
  target_reference_id: uuidSchema
});

export const configReferenceUnresolveInputSchema = z.strictObject({
  action: z.literal('unresolve'),
  agency_id: uuidSchema,
  resolution_id: uuidSchema
});

export const configReferenceReorderInputSchema = configReferenceBaseActionSchema.extend({
  action: z.literal('reorder'),
  reference_ids: z.array(uuidSchema).optional(),
  labels: z.array(referenceLabelSchema).optional()
});

export const configReferenceActionInputSchema = z.union([
  configReferenceAddInputSchema,
  configReferenceRenameInputSchema,
  configReferenceArchiveInputSchema,
  configReferenceRestoreInputSchema,
  configReferenceResolveInputSchema,
  configReferenceUnresolveInputSchema,
  configReferenceReorderInputSchema
]);

export const resolvedConfigSnapshotSchema = z.strictObject({
  references: agencyReferenceConfigSchema.extend({
    departments: z.array(departmentReferenceSchema)
  })
});

export const configUsageRowSchema = z.strictObject({
  dimension: configUsageDimensionSchema.optional(),
  label: referenceLabelSchema,
  reference_id: uuidSchema.nullable(),
  sort_order: z.number().int().min(1, 'Ordre invalide').nullable(),
  category: configStatusCategorySchema.nullable(),
  is_active: z.boolean(),
  usage_count: z.number().int().min(0, 'Compteur invalide'),
  state: configUsageStateSchema,
  resolution_id: uuidSchema.nullable().optional(),
  target_reference_id: uuidSchema.nullable().optional(),
  target_label: referenceLabelSchema.nullable().optional()
});

export const configUsageSnapshotSchema = z.strictObject({
  agency_id: uuidSchema,
  dimensions: z.record(configUsageDimensionSchema, z.array(configUsageRowSchema)),
  totals: z.strictObject({
    unresolved: z.number().int().min(0, 'Compteur invalide'),
    archived: z.number().int().min(0, 'Compteur invalide'),
    resolved: z.number().int().min(0, 'Compteur invalide'),
    system_managed: z.number().int().min(0, 'Compteur invalide'),
    used_not_in_reference: z.number().int().min(0, 'Compteur invalide').optional(),
    referenced_values: z.number().int().min(0, 'Compteur invalide'),
    used_values: z.number().int().min(0, 'Compteur invalide')
  })
});

export const configIntegrityInteractionsInputSchema = z.strictObject({
  agency_id: uuidSchema,
  dimension: configUsageDimensionSchema,
  source_label: referenceLabelSchema,
  classification: configUsageStateSchema,
  page: z.number().int().min(1, 'Page invalide'),
  page_size: z.number().int().min(1, 'Taille de page invalide').max(50, 'Taille de page invalide')
});

export const configIntegrityInteractionUpdateInputSchema = z.strictObject({
  agency_id: uuidSchema,
  interaction_id: z.string().trim().min(1, 'Identifiant interaction requis'),
  dimension: configUsageDimensionSchema,
  source_label: referenceLabelSchema,
  target_reference_id: uuidSchema
});

export const configIntegrityInteractionRowSchema = z.strictObject({
  id: z.string().trim().min(1, 'Identifiant interaction requis'),
  subject: z.string(),
  company_name: z.string(),
  entity_type: z.string(),
  created_at: z.string(),
  updated_at: z.string(),
  last_action_at: z.string(),
  channel: z.string(),
  contact_name: z.string(),
  contact_phone: z.string().nullable(),
  contact_email: z.string().nullable(),
  contact_service: z.string(),
  interaction_type: z.string(),
  status: z.string(),
  status_id: uuidSchema.nullable(),
  mega_families: z.array(z.string()),
  order_ref: z.string().nullable(),
  reminder_at: z.string().nullable(),
  notes: z.string().nullable()
});

export const EMPTY_AGENCY_REFERENCE_CONFIG: AgencyReferenceConfig = {
  statuses: [],
  historical_statuses: [],
  services: [],
  families: [],
  interaction_types: [],
  resolutions: []
};

export type ConfigStatusCategory = z.infer<typeof configStatusCategorySchema>;
export type ConfigUsageDimension = z.infer<typeof configUsageDimensionSchema>;
export type EditableConfigReferenceDimension = z.infer<typeof editableConfigReferenceDimensionSchema>;
export type ConfigUsageState = z.infer<typeof configUsageStateSchema>;
export type AgencyStatusInput = z.infer<typeof agencyStatusInputSchema>;
export type AgencyStatusConfig = z.infer<typeof agencyStatusSchema>;
export type AgencyReferenceConfigInput = z.infer<typeof agencyReferenceConfigInputSchema>;
export type AgencyReferenceConfig = z.infer<typeof agencyReferenceConfigSchema>;
export type DepartmentReference = z.infer<typeof departmentReferenceSchema>;
export type ConfigGetInput = z.infer<typeof configGetInputSchema>;
export type ConfigUsageInput = z.infer<typeof configUsageInputSchema>;
export type ConfigReferenceActionInput = z.infer<typeof configReferenceActionInputSchema>;
export type ConfigReferenceAddInput = z.infer<typeof configReferenceAddInputSchema>;
export type ConfigReferenceRenameInput = z.infer<typeof configReferenceRenameInputSchema>;
export type ConfigReferenceArchiveInput = z.infer<typeof configReferenceArchiveInputSchema>;
export type ConfigReferenceRestoreInput = z.infer<typeof configReferenceRestoreInputSchema>;
export type ConfigReferenceResolveInput = z.infer<typeof configReferenceResolveInputSchema>;
export type ConfigReferenceUnresolveInput = z.infer<typeof configReferenceUnresolveInputSchema>;
export type ConfigReferenceReorderInput = z.infer<typeof configReferenceReorderInputSchema>;
export type ResolvedConfigSnapshot = z.infer<typeof resolvedConfigSnapshotSchema>;
export type ConfigUsageRow = z.infer<typeof configUsageRowSchema>;
export type ConfigUsageSnapshot = z.infer<typeof configUsageSnapshotSchema>;
export type ConfigIntegrityInteractionsInput = z.infer<typeof configIntegrityInteractionsInputSchema>;
export type ConfigIntegrityInteractionUpdateInput = z.infer<typeof configIntegrityInteractionUpdateInputSchema>;
export type ConfigIntegrityInteractionRow = z.infer<typeof configIntegrityInteractionRowSchema>;
