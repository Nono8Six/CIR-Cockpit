import { z } from 'zod/v4';

import { uuidSchema } from '../admin/auth.schema.ts';
import {
  configuratorEvidenceListSchema,
  createConstraintValueSchema,
  criterionStatusSchema,
  dataGradeSchema,
  technicalIdSchema,
  verdictStatusSchema
} from './common.schema.ts';

const MAX_RESULTS = 50;
const MAX_EXPLANATION_LENGTH = 2_000;
const MAX_ISSUES_PER_CANDIDATE = 50;

const nullableFiniteNumberSchema = z.number().finite('Valeur numerique invalide');
const positiveNumberSchema = nullableFiniteNumberSchema.positive('Valeur strictement positive requise');
const nonNegativeNumberSchema = nullableFiniteNumberSchema.nonnegative('Valeur positive ou nulle requise');
const shortTextSchema = z.string().trim().min(1, 'Valeur requise').max(255, 'Texte trop long');
const issueCodeSchema = z
  .string()
  .trim()
  .min(1, 'Code d anomalie requis')
  .max(100, 'Code d anomalie trop long')
  .regex(/^[A-Z0-9_]+$/, 'Code d anomalie invalide');

export const motorMountingSchema = z.enum([
  'B3',
  'B5',
  'B14',
  'B34',
  'B35'
]);

export const motorLifecycleSchema = z.enum(['current', 'legacy']);
export const motorFlangeRoleSchema = z.enum(['standard', 'larger', 'smaller']);

export const motorModelKeySchema = z
  .string()
  .trim()
  .min(1, 'Cle moteur requise')
  .max(255, 'Cle moteur trop longue')
  .regex(/^[a-z0-9]+(?:[._:-][a-z0-9]+)*$/, 'Cle moteur invalide');

export const motorDimensionCodeSchema = z.enum([
  'A',
  'B',
  'C',
  'H',
  'D',
  'E',
  'F',
  'M',
  'N',
  'P',
  'S',
  'T',
  'Z'
]);

export const motorSupplyModeSchema = z.enum(['mains', 'vfd']);
export const motorCouplingSchema = z.enum(['Y', 'D']);
export const motorSortSchema = z.enum([
  'compatibility',
  'brand',
  'power',
  'efficiency'
]);

export const motorTextConstraintSchema = createConstraintValueSchema(shortTextSchema).refine(
  (input) => input.unit == null,
  { message: 'Aucune unite attendue', path: ['unit'] }
);
export const motorSupplyModeConstraintSchema = createConstraintValueSchema(motorSupplyModeSchema).refine(
  (input) => input.unit == null,
  { message: 'Aucune unite attendue', path: ['unit'] }
);
export const motorCouplingConstraintSchema = createConstraintValueSchema(motorCouplingSchema).refine(
  (input) => input.unit == null,
  { message: 'Aucune unite attendue', path: ['unit'] }
);
export const motorPolesConstraintSchema = createConstraintValueSchema(z.union([
  z.literal(2),
  z.literal(4),
  z.literal(6),
  z.literal(8),
  z.literal(10),
  z.literal(12)
])).refine(
  (input) => input.unit == null,
  { message: 'Aucune unite attendue', path: ['unit'] }
);

const createSiConstraintSchema = <TValueSchema extends z.ZodType>(
  valueSchema: TValueSchema,
  unit: 'kW' | 'rpm' | 'Hz' | 'V' | 'A' | 'N.m' | 'mm' | 'count'
) => createConstraintValueSchema(valueSchema).superRefine((input, ctx) => {
  if (input.unit !== unit) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: `Unite SI requise : ${unit}`,
      path: ['unit']
    });
  }
});

export const motorElectricalSpecSchema = z.strictObject({
  power_kw: createSiConstraintSchema(positiveNumberSchema, 'kW'),
  speed_rpm: createSiConstraintSchema(positiveNumberSchema, 'rpm').optional(),
  poles: motorPolesConstraintSchema.optional(),
  frequency_hz: createSiConstraintSchema(positiveNumberSchema, 'Hz'),
  supply_mode: motorSupplyModeConstraintSchema,
  voltage_v: createSiConstraintSchema(positiveNumberSchema, 'V').optional(),
  coupling: motorCouplingConstraintSchema.optional(),
  rated_current_a: createSiConstraintSchema(positiveNumberSchema, 'A').optional(),
  rated_torque_nm: createSiConstraintSchema(positiveNumberSchema, 'N.m').optional()
});

export const motorFrameDimensionsSchema = z.strictObject({
  A: motorNonNegativeDimensionConstraintSchema().optional(),
  B: motorNonNegativeDimensionConstraintSchema().optional(),
  C: motorNonNegativeDimensionConstraintSchema().optional(),
  H: motorNonNegativeDimensionConstraintSchema().optional(),
  D: motorNonNegativeDimensionConstraintSchema().optional(),
  E: motorNonNegativeDimensionConstraintSchema().optional(),
  F: motorNonNegativeDimensionConstraintSchema().optional()
});

export const motorFlangeDimensionsSchema = z.strictObject({
  M: motorNonNegativeDimensionConstraintSchema().optional(),
  N: motorNonNegativeDimensionConstraintSchema().optional(),
  P: motorNonNegativeDimensionConstraintSchema().optional(),
  S: motorNonNegativeDimensionConstraintSchema().optional(),
  S_thread: motorTextConstraintSchema.optional(),
  T: motorNonNegativeDimensionConstraintSchema().optional(),
  Z: createSiConstraintSchema(
    z.number().int('Nombre de trous invalide').positive('Nombre de trous invalide'),
    'count'
  ).optional()
}).superRefine((dimensions, ctx) => {
  if (dimensions.S?.value != null && dimensions.S_thread?.value != null) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Renseigner soit le diametre S, soit le filetage S, pas les deux',
      path: ['S']
    });
  }
});

function motorNonNegativeDimensionConstraintSchema() {
  return createSiConstraintSchema(nonNegativeNumberSchema, 'mm');
}

export const motorMechanicalSpecSchema = z.strictObject({
  frame: z.strictObject({
    dimensions: motorFrameDimensionsSchema
  }),
  flange: z.strictObject({
    reference: shortTextSchema.optional(),
    dimensions: motorFlangeDimensionsSchema
  }).optional()
});

export const motorToleranceSchema = z.strictObject({
  A: nonNegativeNumberSchema.optional(),
  B: nonNegativeNumberSchema.optional(),
  C: nonNegativeNumberSchema.optional(),
  H: nonNegativeNumberSchema.optional(),
  D: nonNegativeNumberSchema.optional(),
  E: nonNegativeNumberSchema.optional(),
  F: nonNegativeNumberSchema.optional(),
  M: nonNegativeNumberSchema.optional(),
  N: nonNegativeNumberSchema.optional(),
  P: nonNegativeNumberSchema.optional(),
  S: nonNegativeNumberSchema.optional(),
  T: nonNegativeNumberSchema.optional(),
  Z: nonNegativeNumberSchema.optional()
});

const motorEquivalentSpecBaseSchema = z.strictObject({
  schema_version: z.literal(1),
  snapshot_id: uuidSchema.optional(),
  mounting: motorMountingSchema,
  electrical: motorElectricalSpecSchema,
  mechanical: motorMechanicalSpecSchema,
  tolerances_mm: motorToleranceSchema.optional()
});

const addRequiredSearchCriteria = (
  input: z.infer<typeof motorEquivalentSpecBaseSchema>,
  ctx: z.RefinementCtx
) => {
  if (input.electrical.power_kw.value == null) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Puissance requise pour rechercher des candidats',
      path: ['electrical', 'power_kw', 'value']
    });
  }
  if (input.electrical.frequency_hz.value == null) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Frequence requise pour rechercher des candidats',
      path: ['electrical', 'frequency_hz', 'value']
    });
  }
  if (input.electrical.supply_mode.value == null) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Mode d alimentation requis pour rechercher des candidats',
      path: ['electrical', 'supply_mode', 'value']
    });
  }
};

export const motorEquivalentSpecSchema = motorEquivalentSpecBaseSchema.superRefine(addRequiredSearchCriteria);

const motorEquivalentFromSpecInputBaseSchema = z.strictObject({
  ...motorEquivalentSpecBaseSchema.shape,
  cursor: z.string().trim().min(1, 'Curseur invalide').max(500, 'Curseur trop long').optional(),
  limit: z.number().int('Limite invalide').min(1, 'Limite invalide').max(MAX_RESULTS, 'Limite trop grande').default(25),
  sort: motorSortSchema.default('compatibility')
});

export const motorEquivalentFromSpecInputSchema =
  motorEquivalentFromSpecInputBaseSchema.superRefine(addRequiredSearchCriteria);

export const motorCriterionValueSchema = z.union([
  z.string(),
  z.number().finite(),
  z.boolean(),
  z.null()
]);

export const motorCriterionSchema = z.strictObject({
  code: z.string().trim().min(1, 'Code de critere requis').max(100, 'Code de critere trop long'),
  label: shortTextSchema,
  status: criterionStatusSchema,
  blocking: z.boolean(),
  expected: motorCriterionValueSchema,
  observed: motorCriterionValueSchema,
  unit: z.string().trim().min(1, 'Unite requise').max(30, 'Unite trop longue').optional(),
  tolerance: nonNegativeNumberSchema.optional(),
  delta: nullableFiniteNumberSchema.optional(),
  explanation: z.string().trim().min(1, 'Explication requise').max(MAX_EXPLANATION_LENGTH, 'Explication trop longue'),
  evidence: configuratorEvidenceListSchema,
  affected_by_issue_codes: z.array(issueCodeSchema).max(MAX_ISSUES_PER_CANDIDATE, 'Trop d anomalies').default([])
});

export const motorValidationIssueSchema = z.strictObject({
  code: issueCodeSchema,
  severity: z.enum(['error', 'warning', 'info']),
  message: z.string().trim().min(1, 'Message d anomalie requis').max(MAX_EXPLANATION_LENGTH, 'Message d anomalie trop long'),
  restriction: z.string().trim().min(1, 'Restriction requise').max(MAX_EXPLANATION_LENGTH, 'Restriction trop longue').nullable(),
  evidence: configuratorEvidenceListSchema
});

export const motorCandidateSchema = z.strictObject({
  model_id: technicalIdSchema,
  model_key: motorModelKeySchema,
  operating_point_id: technicalIdSchema,
  brand: shortTextSchema,
  series: shortTextSchema.nullable(),
  designation: shortTextSchema,
  variant_key: shortTextSchema.nullable(),
  power_kw: positiveNumberSchema,
  rated_speed_rpm: positiveNumberSchema,
  frequency_hz: positiveNumberSchema,
  poles: z.number().int().positive(),
  supply_mode: motorSupplyModeSchema,
  efficiency_class: z.enum(['IE1', 'IE2', 'IE3', 'IE4', 'IE5']).nullable(),
  lifecycle: motorLifecycleSchema,
  data_grade: dataGradeSchema
});

export const motorMatchedFlangeSchema = z.strictObject({
  flange_option_id: technicalIdSchema,
  mounting: z.enum(['B5', 'B14', 'B34', 'B35']),
  role: motorFlangeRoleSchema,
  reference: shortTextSchema.nullable(),
  requires_option: z.boolean()
}).superRefine((flange, ctx) => {
  const expected = flange.role !== 'standard';
  if (flange.requires_option !== expected) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Une bride larger ou smaller doit etre signalee comme option',
      path: ['requires_option']
    });
  }
});

export const motorCandidateVerdictSchema = z.strictObject({
  candidate: motorCandidateSchema,
  matched_flange: motorMatchedFlangeSchema.nullable(),
  status: verdictStatusSchema,
  explanation: z.string().trim().min(1, 'Explication de verdict requise').max(MAX_EXPLANATION_LENGTH, 'Explication de verdict trop longue'),
  criteria: z.array(motorCriterionSchema).min(1, 'Au moins un critere requis').max(100, 'Trop de criteres'),
  issues: z.array(motorValidationIssueSchema).max(MAX_ISSUES_PER_CANDIDATE, 'Trop d anomalies'),
  missing_measurements: z.array(motorDimensionCodeSchema).max(motorDimensionCodeSchema.options.length, 'Trop de cotes manquantes')
});

export const motorEquivalentFromSpecResponseSchema = z.strictObject({
  request_id: uuidSchema,
  snapshot: z.strictObject({
    id: uuidSchema,
    activated_at: z.string().datetime({ message: 'Date d activation invalide' }),
    label: shortTextSchema
  }),
  normalized_spec: motorEquivalentSpecSchema,
  candidates: z.array(motorCandidateVerdictSchema).max(MAX_RESULTS, 'Trop de candidats'),
  next_cursor: z.string().trim().min(1, 'Curseur invalide').max(500, 'Curseur trop long').nullable()
});

export type MotorMounting = z.infer<typeof motorMountingSchema>;
export type MotorDimensionCode = z.infer<typeof motorDimensionCodeSchema>;
export type MotorEquivalentFromSpecInput = z.infer<typeof motorEquivalentFromSpecInputSchema>;
export type MotorEquivalentFromSpecResponse = z.infer<typeof motorEquivalentFromSpecResponseSchema>;
