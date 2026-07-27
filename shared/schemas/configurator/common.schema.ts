import { z } from 'zod/v4';

import { uuidSchema } from '../admin/auth.schema.ts';

const MAX_LABEL_LENGTH = 500;
const MAX_CODE_LENGTH = 100;
const MAX_EVIDENCE_ITEMS = 20;

const evidenceLabelSchema = z
  .string()
  .trim()
  .min(1, 'Libelle de preuve requis')
  .max(MAX_LABEL_LENGTH, 'Libelle de preuve trop long');

const ruleCodeSchema = z
  .string()
  .trim()
  .min(1, 'Code de regle requis')
  .max(MAX_CODE_LENGTH, 'Code de regle trop long')
  .regex(/^[A-Z0-9_]+$/, 'Code de regle invalide');

const sourceSha256Schema = z
  .string()
  .trim()
  .regex(/^[a-f0-9]{64}$/i, 'Empreinte SHA-256 invalide');

const evidenceScalarSchema = z.union([
  z.string().max(MAX_LABEL_LENGTH, 'Valeur de preuve trop longue'),
  z.number().finite('Valeur de preuve invalide'),
  z.boolean(),
  z.null()
]);

export const configuratorDomainSchema = z.enum(['motor']);

export const constraintOriginSchema = z.enum([
  'nameplate',
  'user_measurement',
  'catalog',
  'statistical_suggestion',
  'calculation'
]);

export const constraintConfirmationSchema = z.enum([
  'unconfirmed',
  'confirmed'
]);

export const dataGradeSchema = z.enum(['A', 'B', 'C', 'D']);

export const criterionStatusSchema = z.enum([
  'satisfied',
  'under_reservation',
  'indeterminate',
  'not_satisfied'
]);

export const verdictStatusSchema = criterionStatusSchema;

export const sourcePageEvidenceSchema = z.strictObject({
  kind: z.literal('source_page'),
  label: evidenceLabelSchema,
  source_document_id: uuidSchema,
  filename: z.string().trim().min(1, 'Nom de document requis').max(255, 'Nom de document trop long'),
  sha256: sourceSha256Schema,
  pdf_page: z.number().int('Page PDF invalide').positive('Page PDF invalide'),
  catalog_page: z.string().trim().max(100, 'Page catalogue trop longue').nullable().optional(),
  extraction_method: z.string().trim().min(1, 'Methode d extraction requise').max(100, 'Methode d extraction trop longue')
});

export const measurementEvidenceSchema = z.strictObject({
  kind: z.literal('measurement'),
  label: evidenceLabelSchema,
  measured_at: z.string().datetime({ message: 'Date de mesure invalide' }).optional(),
  measured_by: uuidSchema.optional()
});

export const sampleEvidenceSchema = z.strictObject({
  kind: z.literal('sample'),
  label: evidenceLabelSchema,
  sample_size: z.number().int('Effectif invalide').positive('Effectif invalide')
});

export const ruleEvidenceSchema = z.strictObject({
  kind: z.literal('rule'),
  label: evidenceLabelSchema,
  rule_code: ruleCodeSchema,
  inputs: z.array(z.strictObject({
    key: z.string().trim().min(1, 'Cle de calcul requise').max(100, 'Cle de calcul trop longue'),
    value: evidenceScalarSchema,
    unit: z.string().trim().min(1, 'Unite requise').max(30, 'Unite trop longue').optional()
  })).max(20, 'Trop d entrees de calcul').default([])
});

export const configuratorEvidenceSchema = z.discriminatedUnion('kind', [
  sourcePageEvidenceSchema,
  measurementEvidenceSchema,
  sampleEvidenceSchema,
  ruleEvidenceSchema
]);

export const configuratorEvidenceListSchema = z
  .array(configuratorEvidenceSchema)
  .max(MAX_EVIDENCE_ITEMS, 'Trop de preuves')
  .default([]);

export const createConstraintValueSchema = <TValueSchema extends z.ZodType>(
  valueSchema: TValueSchema
) => z.strictObject({
  value: valueSchema.nullable(),
  unit: z.string().trim().min(1, 'Unite requise').max(30, 'Unite trop longue').optional(),
  origin: constraintOriginSchema,
  confirmation: constraintConfirmationSchema,
  evidence: configuratorEvidenceListSchema
});

export const technicalIdSchema = z
  .string()
  .trim()
  .regex(/^[1-9]\d*$/, 'Identifiant technique invalide');

export type ConfiguratorDomain = z.infer<typeof configuratorDomainSchema>;
export type ConstraintOrigin = z.infer<typeof constraintOriginSchema>;
export type ConstraintConfirmation = z.infer<typeof constraintConfirmationSchema>;
export type DataGrade = z.infer<typeof dataGradeSchema>;
export type CriterionStatus = z.infer<typeof criterionStatusSchema>;
export type VerdictStatus = z.infer<typeof verdictStatusSchema>;
export type ConfiguratorEvidence = z.infer<typeof configuratorEvidenceSchema>;
