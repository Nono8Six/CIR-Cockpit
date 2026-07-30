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
const MAX_FACTS_PER_CANDIDATE = 100;
const MAX_RULES_PER_CANDIDATE = 100;
const MAX_CATALOG_DIMENSIONS = 500;
const MAX_CATALOG_FLANGES = 50;
const MAX_CATALOG_OPTIONS = 100;
const MAX_CATALOG_POINTS = 100;

export const MOTOR_COMPATIBILITY_RULESET = Object.freeze({
  ruleset_id: 'motor.compatibility.cir',
  ruleset_version: 1
} as const);

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
export const motorFlangeBoreTypeSchema = z.enum(['through', 'tapped']);

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
  'K',
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
export const motorFactPathSchema = z.enum([
  'mounting',
  'electrical.power_kw',
  'electrical.speed_rpm',
  'electrical.poles',
  'electrical.network',
  'electrical.frequency_hz',
  'electrical.supply_mode',
  'electrical.voltage_v',
  'electrical.coupling',
  'electrical.rated_current_a',
  'electrical.rated_torque_nm',
  'mechanical.frame.A',
  'mechanical.frame.B',
  'mechanical.frame.C',
  'mechanical.frame.H',
  'mechanical.frame.K',
  'mechanical.frame.bolt_diameter',
  'mechanical.frame.transverse_travel',
  'mechanical.frame.longitudinal_travel',
  'mechanical.shaft.D',
  'mechanical.shaft.D_fit_tolerance',
  'mechanical.shaft.E',
  'mechanical.shaft.F',
  'mechanical.coupling.axial_min',
  'mechanical.coupling.axial_max',
  'mechanical.flange.M',
  'mechanical.flange.N',
  'mechanical.flange.P',
  'mechanical.flange.bore_type',
  'mechanical.flange.S',
  'mechanical.flange.S_thread',
  'mechanical.flange.T',
  'mechanical.flange.Z',
  'mechanical.flange.P_clearance',
  'mechanical.flange.T_clearance',
  'application.ip_rating',
  'application.brake_required',
  'application.vfd_required',
  'application.cooling_method',
  'application.duty_service',
  'application.ambient_temperature',
  'application.starts_per_hour'
]);
export const motorRuleCodeSchema = z.enum([
  'MOUNTING',
  'FRAME_A',
  'FRAME_B',
  'FRAME_C',
  'FRAME_H',
  'FRAME_K_BOLT_CLEARANCE',
  'SHAFT_D',
  'SHAFT_D_FIT_TOLERANCE',
  'SHAFT_E_COUPLING_RANGE',
  'SHAFT_F',
  'FLANGE_INTERFACE',
  'POWER',
  'POLES',
  'FREQUENCY',
  'SUPPLY_MODE',
  'VOLTAGE_COUPLING',
  'APPLICATION_REQUIREMENT'
]);
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
export const motorBooleanConstraintSchema = createConstraintValueSchema(z.boolean()).refine(
  (input) => input.unit == null,
  { message: 'Aucune unite attendue', path: ['unit'] }
);
const motorPolesValueSchema = z.union([
  z.literal(2),
  z.literal(4),
  z.literal(6),
  z.literal(8),
  z.literal(10),
  z.literal(12)
]);

export const motorPolesConstraintSchema = createConstraintValueSchema(motorPolesValueSchema).refine(
  (input) => input.unit == null,
  { message: 'Aucune unite attendue', path: ['unit'] }
);

const createSiConstraintSchema = <TValueSchema extends z.ZodType>(
  valueSchema: TValueSchema,
  unit: 'kW' | 'rpm' | 'Hz' | 'V' | 'A' | 'N.m' | 'mm' | 'count' | 'degC'
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
  network: motorTextConstraintSchema,
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
  K: motorNonNegativeDimensionConstraintSchema().optional()
});

export const motorShaftDimensionsSchema = z.strictObject({
  D: motorNonNegativeDimensionConstraintSchema().optional(),
  D_fit_tolerance: motorTextConstraintSchema.optional(),
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

export const motorFlangeBoreTypeConstraintSchema = createConstraintValueSchema(
  motorFlangeBoreTypeSchema
).refine(
  (input) => input.unit == null,
  { message: 'Aucune unite attendue', path: ['unit'] }
);

export const motorFlangeClearanceSchema = z.strictObject({
  P: motorNonNegativeDimensionConstraintSchema().optional(),
  T: motorNonNegativeDimensionConstraintSchema().optional()
});

export const motorFrameAdjustmentSchema = z.strictObject({
  bolt_diameter: motorNonNegativeDimensionConstraintSchema().optional(),
  transverse_travel: motorNonNegativeDimensionConstraintSchema().optional(),
  longitudinal_travel: motorNonNegativeDimensionConstraintSchema().optional()
});

export const motorCouplingAxialRangeSchema = z.strictObject({
  axial_min: motorNonNegativeDimensionConstraintSchema().optional(),
  axial_max: motorNonNegativeDimensionConstraintSchema().optional()
}).superRefine((range, ctx) => {
  const minimum = range.axial_min?.value;
  const maximum = range.axial_max?.value;
  if (minimum != null && maximum != null && minimum > maximum) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'La borne axiale minimale ne peut pas depasser la borne maximale',
      path: ['axial_min', 'value']
    });
  }
});

export const motorMechanicalSpecSchema = z.strictObject({
  frame: z.strictObject({
    dimensions: motorFrameDimensionsSchema,
    adjustment: motorFrameAdjustmentSchema.optional()
  }),
  shaft: z.strictObject({
    dimensions: motorShaftDimensionsSchema
  }),
  coupling: motorCouplingAxialRangeSchema.optional(),
  flange: z.strictObject({
    reference: shortTextSchema.optional(),
    bore_type: motorFlangeBoreTypeConstraintSchema.optional(),
    dimensions: motorFlangeDimensionsSchema,
    clearance: motorFlangeClearanceSchema.optional()
  }).optional()
});

export const motorApplicationRequirementsSchema = z.strictObject({
  ip_rating: motorTextConstraintSchema.optional(),
  brake_required: motorBooleanConstraintSchema.optional(),
  vfd_required: motorBooleanConstraintSchema.optional(),
  cooling_method: motorTextConstraintSchema.optional(),
  duty_service: motorTextConstraintSchema.optional(),
  ambient_temperature: createSiConstraintSchema(nullableFiniteNumberSchema, 'degC').optional(),
  starts_per_hour: createSiConstraintSchema(nonNegativeNumberSchema, 'count').optional()
});

const createConfirmedMeasurementSchema = <TSchema extends z.ZodType>(
  schema: TSchema
) => schema.superRefine((fact, ctx) => {
  const factRecord = typeof fact === 'object' && fact !== null
    ? fact as Record<string, unknown>
    : {};
  const value = Reflect.get(factRecord, 'value');
  const origin = Reflect.get(factRecord, 'origin');
  const confirmation = Reflect.get(factRecord, 'confirmation');
  const evidence = Reflect.get(factRecord, 'evidence');
  const hasMeasurementEvidence = Array.isArray(evidence)
    && evidence.some((item) =>
      typeof item === 'object'
      && item !== null
      && Reflect.get(item, 'kind') === 'measurement'
    );

  if (
    value === null
    || origin !== 'user_measurement'
    || confirmation !== 'confirmed'
    || !hasMeasurementEvidence
  ) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Une surcharge terrain doit etre une mesure confirmee et prouvee'
    });
  }
});

const confirmedTextMeasurementSchema = createConfirmedMeasurementSchema(
  motorTextConstraintSchema
);
const confirmedSupplyModeMeasurementSchema = createConfirmedMeasurementSchema(
  motorSupplyModeConstraintSchema
);
const confirmedCouplingMeasurementSchema = createConfirmedMeasurementSchema(
  motorCouplingConstraintSchema
);
const confirmedBooleanMeasurementSchema = createConfirmedMeasurementSchema(
  motorBooleanConstraintSchema
);
const confirmedPolesMeasurementSchema = createConfirmedMeasurementSchema(
  motorPolesConstraintSchema
);
const confirmedPowerMeasurementSchema = createConfirmedMeasurementSchema(
  createSiConstraintSchema(positiveNumberSchema, 'kW')
);
const confirmedSpeedMeasurementSchema = createConfirmedMeasurementSchema(
  createSiConstraintSchema(positiveNumberSchema, 'rpm')
);
const confirmedFrequencyMeasurementSchema = createConfirmedMeasurementSchema(
  createSiConstraintSchema(positiveNumberSchema, 'Hz')
);
const confirmedVoltageMeasurementSchema = createConfirmedMeasurementSchema(
  createSiConstraintSchema(positiveNumberSchema, 'V')
);
const confirmedCurrentMeasurementSchema = createConfirmedMeasurementSchema(
  createSiConstraintSchema(positiveNumberSchema, 'A')
);
const confirmedTorqueMeasurementSchema = createConfirmedMeasurementSchema(
  createSiConstraintSchema(positiveNumberSchema, 'N.m')
);
const confirmedDimensionMeasurementSchema = () => createConfirmedMeasurementSchema(
  motorNonNegativeDimensionConstraintSchema()
);
const confirmedCountMeasurementSchema = createConfirmedMeasurementSchema(
  createSiConstraintSchema(nonNegativeNumberSchema, 'count')
);
const confirmedFlangeBoreTypeMeasurementSchema = createConfirmedMeasurementSchema(
  motorFlangeBoreTypeConstraintSchema
);
const confirmedTemperatureMeasurementSchema = createConfirmedMeasurementSchema(
  createSiConstraintSchema(nullableFiniteNumberSchema, 'degC')
);

export const motorFromMotorFieldOverridesSchema = z.strictObject({
  electrical: z.strictObject({
    power_kw: confirmedPowerMeasurementSchema.optional(),
    speed_rpm: confirmedSpeedMeasurementSchema.optional(),
    poles: confirmedPolesMeasurementSchema.optional(),
    network: confirmedTextMeasurementSchema.optional(),
    frequency_hz: confirmedFrequencyMeasurementSchema.optional(),
    supply_mode: confirmedSupplyModeMeasurementSchema.optional(),
    voltage_v: confirmedVoltageMeasurementSchema.optional(),
    coupling: confirmedCouplingMeasurementSchema.optional(),
    rated_current_a: confirmedCurrentMeasurementSchema.optional(),
    rated_torque_nm: confirmedTorqueMeasurementSchema.optional()
  }).optional(),
  mechanical: z.strictObject({
    frame: z.strictObject({
      dimensions: z.strictObject({
        A: confirmedDimensionMeasurementSchema().optional(),
        B: confirmedDimensionMeasurementSchema().optional(),
        C: confirmedDimensionMeasurementSchema().optional(),
        H: confirmedDimensionMeasurementSchema().optional(),
        K: confirmedDimensionMeasurementSchema().optional()
      }).optional(),
      adjustment: z.strictObject({
        bolt_diameter: confirmedDimensionMeasurementSchema().optional(),
        transverse_travel: confirmedDimensionMeasurementSchema().optional(),
        longitudinal_travel: confirmedDimensionMeasurementSchema().optional()
      }).optional()
    }).optional(),
    shaft: z.strictObject({
      dimensions: z.strictObject({
        D: confirmedDimensionMeasurementSchema().optional(),
        D_fit_tolerance: confirmedTextMeasurementSchema.optional(),
        E: confirmedDimensionMeasurementSchema().optional(),
        F: confirmedDimensionMeasurementSchema().optional()
      }).optional()
    }).optional(),
    coupling: z.strictObject({
      axial_min: confirmedDimensionMeasurementSchema().optional(),
      axial_max: confirmedDimensionMeasurementSchema().optional()
    }).optional(),
    flange: z.strictObject({
      bore_type: confirmedFlangeBoreTypeMeasurementSchema.optional(),
      dimensions: z.strictObject({
        M: confirmedDimensionMeasurementSchema().optional(),
        N: confirmedDimensionMeasurementSchema().optional(),
        P: confirmedDimensionMeasurementSchema().optional(),
        S: confirmedDimensionMeasurementSchema().optional(),
        S_thread: confirmedTextMeasurementSchema.optional(),
        T: confirmedDimensionMeasurementSchema().optional(),
        Z: confirmedCountMeasurementSchema.optional()
      }).optional(),
      clearance: z.strictObject({
        P: confirmedDimensionMeasurementSchema().optional(),
        T: confirmedDimensionMeasurementSchema().optional()
      }).optional()
    }).optional()
  }).optional(),
  application: z.strictObject({
    ip_rating: confirmedTextMeasurementSchema.optional(),
    brake_required: confirmedBooleanMeasurementSchema.optional(),
    vfd_required: confirmedBooleanMeasurementSchema.optional(),
    cooling_method: confirmedTextMeasurementSchema.optional(),
    duty_service: confirmedTextMeasurementSchema.optional(),
    ambient_temperature: confirmedTemperatureMeasurementSchema.optional(),
    starts_per_hour: confirmedCountMeasurementSchema.optional()
  }).optional()
});

export const motorCatalogListInputSchema = z.strictObject({
  cursor: technicalIdSchema.optional(),
  limit: z.number().int('Limite invalide').min(1, 'Limite invalide').max(
    MAX_RESULTS,
    'Limite trop grande'
  ).default(25),
  search: z.string().trim().min(1, 'Recherche invalide').max(
    100,
    'Recherche trop longue'
  ).optional(),
  brand: shortTextSchema.optional(),
  power_kw: positiveNumberSchema.optional(),
  poles: motorPolesValueSchema.optional(),
  supply_mode: motorSupplyModeSchema.optional(),
  frequency_hz: positiveNumberSchema.optional()
});

export const motorCatalogGetInputSchema = z.strictObject({
  operating_point_id: technicalIdSchema,
  mounting: motorMountingSchema,
  flange_option_id: technicalIdSchema.optional(),
  field_overrides: motorFromMotorFieldOverridesSchema.optional()
});

export const motorToleranceSchema = z.strictObject({
  A: nonNegativeNumberSchema.optional(),
  B: nonNegativeNumberSchema.optional(),
  C: nonNegativeNumberSchema.optional(),
  H: nonNegativeNumberSchema.optional(),
  K: nonNegativeNumberSchema.optional(),
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
  application: motorApplicationRequirementsSchema.optional(),
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

export const motorRulesetReferenceSchema = z.strictObject({
  ruleset_id: z.literal(MOTOR_COMPATIBILITY_RULESET.ruleset_id),
  ruleset_version: z.literal(MOTOR_COMPATIBILITY_RULESET.ruleset_version)
});

export const motorUsedFactSchema = z.strictObject({
  fact_path: motorFactPathSchema,
  value: motorCriterionValueSchema,
  unit: z.string().trim().min(1, 'Unite requise').max(30, 'Unite trop longue').optional(),
  origin: z.enum([
    'nameplate',
    'user_measurement',
    'catalog',
    'statistical_suggestion',
    'calculation'
  ]),
  confirmation: z.enum(['unconfirmed', 'confirmed']),
  evidence: configuratorEvidenceListSchema.refine(
    (evidence) => evidence.length > 0,
    'Au moins une preuve utilisee est requise'
  )
});

export const motorAppliedRuleSchema = z.strictObject({
  rule_code: motorRuleCodeSchema,
  ruleset_id: z.literal(MOTOR_COMPATIBILITY_RULESET.ruleset_id),
  ruleset_version: z.literal(MOTOR_COMPATIBILITY_RULESET.ruleset_version),
  status: criterionStatusSchema,
  decisive: z.boolean(),
  fact_paths: z.array(motorFactPathSchema).min(1, 'Au moins un fait utilise est requis').max(20)
});

export const motorRequiredActionSchema = z.strictObject({
  code: issueCodeSchema,
  label: shortTextSchema,
  explanation: z.string().trim().min(1, 'Explication requise').max(MAX_EXPLANATION_LENGTH),
  evidence: configuratorEvidenceListSchema
});

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
  calculated_clearance: nullableFiniteNumberSchema.optional(),
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

export const motorMechanicalCompatibilityResultSchema = z.strictObject({
  ruleset_id: z.literal(MOTOR_COMPATIBILITY_RULESET.ruleset_id),
  ruleset_version: z.literal(MOTOR_COMPATIBILITY_RULESET.ruleset_version),
  status: verdictStatusSchema,
  matched_flange: motorMatchedFlangeSchema.nullable(),
  criteria: z.array(motorCriterionSchema).min(
    1,
    'Au moins un critere mecanique est requis'
  ).max(50, 'Trop de criteres mecaniques'),
  adaptations_required: z.array(motorRequiredActionSchema).max(
    MAX_ISSUES_PER_CANDIDATE
  ),
  checks_required: z.array(motorRequiredActionSchema).max(
    MAX_ISSUES_PER_CANDIDATE
  ),
  facts_used: z.array(motorUsedFactSchema).max(MAX_FACTS_PER_CANDIDATE),
  rules_applied: z.array(motorAppliedRuleSchema).min(
    1,
    'Au moins une regle mecanique est requise'
  ).max(MAX_RULES_PER_CANDIDATE),
  missing_facts: z.array(motorFactPathSchema).max(
    motorFactPathSchema.options.length,
    'Trop de faits manquants'
  )
});

const requiredCatalogEvidenceSchema = configuratorEvidenceListSchema.refine(
  (evidence) => evidence.length > 0,
  'Au moins une preuve catalogue est requise'
);

export const motorCatalogSnapshotSchema = z.strictObject({
  id: uuidSchema,
  label: shortTextSchema,
  activated_at: z.string().datetime({ message: 'Date d activation invalide' })
});

export const motorCatalogListItemSchema = z.strictObject({
  candidate: motorCandidateSchema,
  model_evidence: requiredCatalogEvidenceSchema,
  operating_point_evidence: requiredCatalogEvidenceSchema
});

export const motorCatalogListResponseSchema = z.strictObject({
  request_id: uuidSchema,
  snapshot: motorCatalogSnapshotSchema,
  items: z.array(motorCatalogListItemSchema).max(MAX_RESULTS, 'Trop de moteurs'),
  next_cursor: technicalIdSchema.nullable()
});

export const motorCatalogModelSchema = z.strictObject({
  id: technicalIdSchema,
  model_key: motorModelKeySchema,
  brand: shortTextSchema,
  series: shortTextSchema.nullable(),
  designation: shortTextSchema,
  article_no: shortTextSchema.nullable(),
  pole_config: shortTextSchema,
  motor_technology: z.enum(['asynchronous', 'PMaSynRM', 'SynRM', 'PM']),
  casing_material: z.enum(['aluminium', 'cast-iron', 'steel']).nullable(),
  protection_ip: shortTextSchema.nullable(),
  frame_size: z.number().int().positive().nullable(),
  frame_letter: shortTextSchema.nullable(),
  shaft_spec: shortTextSchema.nullable(),
  inertia_kgm2: nonNegativeNumberSchema.nullable(),
  mass_kg: positiveNumberSchema.nullable(),
  mass_mounting: z.enum(['B3', 'B5', 'B14', 'B34', 'B35', 'V1']).nullable(),
  lifecycle: motorLifecycleSchema,
  requires_vfd: z.boolean(),
  is_iec_standard: z.boolean(),
  article_no_status: z.enum(['published', 'not_published_in_source']),
  data_grade: dataGradeSchema,
  evidence: requiredCatalogEvidenceSchema
});

export const motorCatalogOperatingPointSchema = z.strictObject({
  id: technicalIdSchema,
  variant_key: shortTextSchema.nullable(),
  poles: motorPolesValueSchema,
  supply_mode: motorSupplyModeSchema,
  frequency_hz: positiveNumberSchema,
  voltage_v: positiveNumberSchema.nullable(),
  coupling: motorCouplingSchema.nullable(),
  rated_speed_rpm: positiveNumberSchema,
  power_kw: positiveNumberSchema,
  efficiency_class: z.enum(['IE1', 'IE2', 'IE3', 'IE4', 'IE5']).nullable(),
  efficiency_standard: shortTextSchema.nullable(),
  rated_torque_nm: positiveNumberSchema.nullable(),
  rated_current_a: positiveNumberSchema.nullable(),
  max_current_a: positiveNumberSchema.nullable(),
  max_torque_nm: positiveNumberSchema.nullable(),
  noise_db: nonNegativeNumberSchema.nullable(),
  cos_phi: positiveNumberSchema.nullable(),
  starting_torque_ratio: nonNegativeNumberSchema.nullable(),
  starting_current_ratio: nonNegativeNumberSchema.nullable(),
  breakdown_torque_ratio: nonNegativeNumberSchema.nullable(),
  data_grade: dataGradeSchema,
  evidence: requiredCatalogEvidenceSchema
});

export const motorCatalogEfficiencyPointSchema = z.strictObject({
  id: technicalIdSchema,
  load_fraction: positiveNumberSchema,
  efficiency_pct: positiveNumberSchema,
  cos_phi: positiveNumberSchema.nullable(),
  data_grade: dataGradeSchema,
  evidence: requiredCatalogEvidenceSchema
});

export const motorCatalogTorquePointSchema = z.strictObject({
  id: technicalIdSchema,
  at_frequency_hz: positiveNumberSchema,
  torque_nm: positiveNumberSchema,
  data_grade: dataGradeSchema,
  evidence: requiredCatalogEvidenceSchema
});

export const motorCatalogDimensionSchema = z.strictObject({
  id: technicalIdSchema,
  definition_id: technicalIdSchema,
  mounting: z.enum(['B3', 'B5', 'B14', 'B34', 'B35', 'V1', 'ANY']),
  polarity: z.number().int().positive().nullable(),
  published_code: shortTextSchema,
  base_published_code: shortTextSchema.nullable(),
  canonical_code: motorDimensionCodeSchema.nullable(),
  mapping_status: z.enum(['mapped', 'unmapped', 'header_contamination']),
  variant_context: shortTextSchema.nullable(),
  value_mm: nonNegativeNumberSchema.nullable(),
  value_text: shortTextSchema.nullable(),
  data_grade: dataGradeSchema,
  evidence: requiredCatalogEvidenceSchema
}).superRefine((dimension, ctx) => {
  if ((dimension.value_mm === null) === (dimension.value_text === null)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Une cote doit porter une seule valeur'
    });
  }
});

export const motorCatalogFlangeOptionSchema = z.strictObject({
  id: technicalIdSchema,
  mounting: z.enum(['B5', 'B14', 'B34', 'B35']),
  role: motorFlangeRoleSchema,
  order_code: shortTextSchema.nullable(),
  flange_ref: shortTextSchema.nullable(),
  din_ref: shortTextSchema.nullable(),
  bore_type: z.enum(['through', 'tapped']),
  dim_m_mm: nonNegativeNumberSchema.nullable(),
  dim_n_mm: nonNegativeNumberSchema.nullable(),
  dim_p_mm: nonNegativeNumberSchema.nullable(),
  dim_s_mm: nonNegativeNumberSchema.nullable(),
  dim_s_thread: shortTextSchema.nullable(),
  dim_t_mm: nonNegativeNumberSchema.nullable(),
  dim_la_mm: nonNegativeNumberSchema.nullable(),
  dim_le_mm: nonNegativeNumberSchema.nullable(),
  holes: z.number().int().positive().nullable(),
  requires_option: z.boolean(),
  data_grade: dataGradeSchema,
  evidence: requiredCatalogEvidenceSchema
}).superRefine((flange, ctx) => {
  if (flange.requires_option !== (flange.role !== 'standard')) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Une bride larger ou smaller doit etre signalee comme option',
      path: ['requires_option']
    });
  }
});

export const motorCatalogBrakeOptionSchema = z.strictObject({
  id: technicalIdSchema,
  brake_type: shortTextSchema,
  brake_torque_nm: positiveNumberSchema,
  order_code: shortTextSchema.nullable(),
  data_grade: dataGradeSchema,
  evidence: requiredCatalogEvidenceSchema
});

export const motorCatalogValidationIssueSchema = motorValidationIssueSchema.extend({
  model_id: technicalIdSchema.nullable(),
  operating_point_id: technicalIdSchema.nullable()
});

export const motorCatalogNormalizationSchema = z.strictObject({
  status: z.enum(['satisfied', 'indeterminate']),
  missing_facts: z.array(motorFactPathSchema).max(
    motorFactPathSchema.options.length,
    'Trop de faits manquants'
  ),
  issues: z.array(motorValidationIssueSchema).max(
    MAX_ISSUES_PER_CANDIDATE,
    'Trop d anomalies'
  )
});

export const motorCatalogGetResponseSchema = z.strictObject({
  request_id: uuidSchema,
  snapshot: motorCatalogSnapshotSchema,
  model: motorCatalogModelSchema,
  operating_point: motorCatalogOperatingPointSchema,
  efficiency_points: z.array(motorCatalogEfficiencyPointSchema).max(
    MAX_CATALOG_POINTS,
    'Trop de points de rendement'
  ),
  torque_points: z.array(motorCatalogTorquePointSchema).max(
    MAX_CATALOG_POINTS,
    'Trop de points de couple'
  ),
  dimensions: z.array(motorCatalogDimensionSchema).max(
    MAX_CATALOG_DIMENSIONS,
    'Trop de cotes'
  ),
  flange_options: z.array(motorCatalogFlangeOptionSchema).max(
    MAX_CATALOG_FLANGES,
    'Trop de brides'
  ),
  brake_options: z.array(motorCatalogBrakeOptionSchema).max(
    MAX_CATALOG_OPTIONS,
    'Trop d options frein'
  ),
  issues: z.array(motorCatalogValidationIssueSchema).max(
    MAX_ISSUES_PER_CANDIDATE,
    'Trop d anomalies'
  ),
  from_motor_spec: motorEquivalentSpecSchema,
  normalization: motorCatalogNormalizationSchema
});

export const motorCandidateVerdictSchema = z.strictObject({
  candidate: motorCandidateSchema,
  matched_flange: motorMatchedFlangeSchema.nullable(),
  ruleset_id: z.literal(MOTOR_COMPATIBILITY_RULESET.ruleset_id),
  ruleset_version: z.literal(MOTOR_COMPATIBILITY_RULESET.ruleset_version),
  mechanical_status: verdictStatusSchema,
  electrical_status: verdictStatusSchema,
  application_status: verdictStatusSchema,
  overall_status: verdictStatusSchema,
  explanation: z.string().trim().min(1, 'Explication de verdict requise').max(MAX_EXPLANATION_LENGTH, 'Explication de verdict trop longue'),
  criteria: z.array(motorCriterionSchema).min(1, 'Au moins un critere requis').max(100, 'Trop de criteres'),
  adaptations_required: z.array(motorRequiredActionSchema).max(MAX_ISSUES_PER_CANDIDATE),
  checks_required: z.array(motorRequiredActionSchema).max(MAX_ISSUES_PER_CANDIDATE),
  facts_used: z.array(motorUsedFactSchema).min(1, 'Au moins un fait utilise est requis').max(MAX_FACTS_PER_CANDIDATE),
  rules_applied: z.array(motorAppliedRuleSchema).min(1, 'Au moins une regle appliquee est requise').max(MAX_RULES_PER_CANDIDATE),
  issues: z.array(motorValidationIssueSchema).max(MAX_ISSUES_PER_CANDIDATE, 'Trop d anomalies'),
  missing_facts: z.array(motorFactPathSchema).max(motorFactPathSchema.options.length, 'Trop de faits manquants')
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
export type MotorCatalogListInput = z.infer<typeof motorCatalogListInputSchema>;
export type MotorCatalogGetInput = z.infer<typeof motorCatalogGetInputSchema>;
export type MotorCatalogListResponse = z.infer<typeof motorCatalogListResponseSchema>;
export type MotorCatalogGetResponse = z.infer<typeof motorCatalogGetResponseSchema>;
export type MotorCatalogDimension = z.infer<typeof motorCatalogDimensionSchema>;
export type MotorCatalogFlangeOption = z.infer<typeof motorCatalogFlangeOptionSchema>;
export type MotorFromMotorFieldOverrides = z.infer<typeof motorFromMotorFieldOverridesSchema>;
export type MotorEquivalentFromSpecInput = z.infer<typeof motorEquivalentFromSpecInputSchema>;
export type MotorEquivalentFromSpecResponse = z.infer<typeof motorEquivalentFromSpecResponseSchema>;
export type MotorMechanicalSpec = z.infer<typeof motorMechanicalSpecSchema>;
export type MotorMatchedFlange = z.infer<typeof motorMatchedFlangeSchema>;
export type MotorMechanicalCompatibilityResult = z.infer<
  typeof motorMechanicalCompatibilityResultSchema
>;

export const safeParseMotorCatalogListInput = (input: unknown) =>
  motorCatalogListInputSchema.safeParse(input);

export const safeParseMotorCatalogGetInput = (input: unknown) =>
  motorCatalogGetInputSchema.safeParse(input);

export const safeParseMotorCatalogListOutput = (output: unknown) =>
  motorCatalogListResponseSchema.safeParse(output);

export const safeParseMotorCatalogGetOutput = (output: unknown) =>
  motorCatalogGetResponseSchema.safeParse(output);

export const safeParseMotorEquivalentFromSpecInput = (input: unknown) =>
  motorEquivalentFromSpecInputSchema.safeParse(input);

export const safeParseMotorCandidateVerdictOutput = (output: unknown) =>
  motorCandidateVerdictSchema.safeParse(output);

export const safeParseMotorMechanicalCompatibilityOutput = (output: unknown) =>
  motorMechanicalCompatibilityResultSchema.safeParse(output);

export const isApplicableFieldOverride = (
  fact: {
    value: unknown;
    origin: string;
    confirmation: string;
    evidence: readonly unknown[];
  }
): boolean =>
  fact.value !== null
  && fact.origin === 'user_measurement'
  && fact.confirmation === 'confirmed'
  && fact.evidence.length > 0;
