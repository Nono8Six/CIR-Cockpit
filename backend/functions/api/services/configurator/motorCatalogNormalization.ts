import type {
  MotorCatalogDimension,
  MotorCatalogFlangeOption,
  MotorCatalogGetInput,
  MotorCatalogGetResponse,
  MotorFromMotorFieldOverrides,
  MotorMounting
} from '../../../../../shared/schemas/configurator/motor.schema.ts';
import type { ConfiguratorEvidence } from '../../../../../shared/schemas/configurator/common.schema.ts';

type CatalogModel = MotorCatalogGetResponse['model'];
type CatalogOperatingPoint = MotorCatalogGetResponse['operating_point'];
type EquivalentSpec = MotorCatalogGetResponse['from_motor_spec'];
type Normalization = MotorCatalogGetResponse['normalization'];
type MotorFactPath = Normalization['missing_facts'][number];
type NormalizationIssue = Normalization['issues'][number];
type DimensionCode = NonNullable<MotorCatalogDimension['canonical_code']>;

const REQUIRED_FACTS: Readonly<Record<MotorMounting, readonly MotorFactPath[]>> = {
  B3: [
    'mechanical.frame.A', 'mechanical.frame.B', 'mechanical.frame.C',
    'mechanical.frame.H', 'mechanical.shaft.D', 'mechanical.shaft.E',
    'mechanical.shaft.F'
  ],
  B5: [
    'mechanical.flange.M', 'mechanical.flange.N', 'mechanical.flange.P',
    'mechanical.flange.bore_type', 'mechanical.flange.S',
    'mechanical.flange.T', 'mechanical.flange.Z',
    'mechanical.shaft.D', 'mechanical.shaft.E', 'mechanical.shaft.F'
  ],
  B14: [
    'mechanical.flange.M', 'mechanical.flange.N', 'mechanical.flange.P',
    'mechanical.flange.bore_type', 'mechanical.flange.S_thread',
    'mechanical.flange.T', 'mechanical.flange.Z',
    'mechanical.shaft.D', 'mechanical.shaft.E', 'mechanical.shaft.F'
  ],
  B34: [
    'mechanical.frame.A', 'mechanical.frame.B', 'mechanical.frame.C',
    'mechanical.frame.H', 'mechanical.flange.M', 'mechanical.flange.N',
    'mechanical.flange.P', 'mechanical.flange.bore_type',
    'mechanical.flange.S_thread',
    'mechanical.flange.T', 'mechanical.flange.Z', 'mechanical.shaft.D',
    'mechanical.shaft.E', 'mechanical.shaft.F'
  ],
  B35: [
    'mechanical.frame.A', 'mechanical.frame.B', 'mechanical.frame.C',
    'mechanical.frame.H', 'mechanical.flange.M', 'mechanical.flange.N',
    'mechanical.flange.P', 'mechanical.flange.bore_type',
    'mechanical.flange.S', 'mechanical.flange.T', 'mechanical.flange.Z',
    'mechanical.shaft.D', 'mechanical.shaft.E', 'mechanical.shaft.F'
  ]
};

const DIMENSION_FACT_PATH: Readonly<Record<DimensionCode, MotorFactPath>> = {
  A: 'mechanical.frame.A',
  B: 'mechanical.frame.B',
  C: 'mechanical.frame.C',
  H: 'mechanical.frame.H',
  K: 'mechanical.frame.K',
  D: 'mechanical.shaft.D',
  E: 'mechanical.shaft.E',
  F: 'mechanical.shaft.F',
  M: 'mechanical.flange.M',
  N: 'mechanical.flange.N',
  P: 'mechanical.flange.P',
  S: 'mechanical.flange.S',
  T: 'mechanical.flange.T',
  Z: 'mechanical.flange.Z'
};

const issue = (
  code: string,
  message: string,
  restriction: string,
  evidence: ConfiguratorEvidence[]
): NormalizationIssue => ({
  code,
  severity: 'warning',
  message,
  restriction,
  evidence
});

const catalogFact = <T>(
  value: T | null,
  evidence: ConfiguratorEvidence[],
  unit?: string
) => ({
  value,
  ...(unit ? { unit } : {}),
  origin: 'catalog' as const,
  confirmation: value === null ? 'unconfirmed' as const : 'confirmed' as const,
  evidence: value === null ? [] : evidence
});

const dimensionSpecificity = (
  dimension: MotorCatalogDimension,
  mounting: MotorMounting,
  poles: number
): number | null => {
  if (dimension.mapping_status !== 'mapped' || dimension.canonical_code === null) return null;
  if (dimension.mounting !== mounting && dimension.mounting !== 'ANY') return null;
  if (dimension.polarity !== poles && dimension.polarity !== null) return null;
  return (dimension.mounting === mounting ? 2 : 0) + (dimension.polarity === poles ? 1 : 0);
};

export type SelectedCatalogDimensions = {
  values: Partial<Record<DimensionCode, MotorCatalogDimension>>;
  ambiguousCodes: DimensionCode[];
  issues: NormalizationIssue[];
};

export const selectCatalogDimensions = (
  dimensions: readonly MotorCatalogDimension[],
  mounting: MotorMounting,
  poles: number
): SelectedCatalogDimensions => {
  const values: Partial<Record<DimensionCode, MotorCatalogDimension>> = {};
  const ambiguousCodes: DimensionCode[] = [];
  const issues: NormalizationIssue[] = [];

  for (const code of Object.keys(DIMENSION_FACT_PATH) as DimensionCode[]) {
    const eligible = dimensions
      .map((dimension) => ({
        dimension,
        specificity: dimension.canonical_code === code
          ? dimensionSpecificity(dimension, mounting, poles)
          : null
      }))
      .filter((entry): entry is { dimension: MotorCatalogDimension; specificity: number } =>
        entry.specificity !== null
      );

    if (eligible.length === 0) continue;
    const bestSpecificity = Math.max(...eligible.map((entry) => entry.specificity));
    const best = eligible.filter((entry) => entry.specificity === bestSpecificity);
    if (best.length !== 1) {
      ambiguousCodes.push(code);
      issues.push(issue(
        'CATALOG_DIMENSION_AMBIGUOUS',
        `Plusieurs cotes catalogue ${code} sont applicables au meme niveau.`,
        `La cote ${code} doit etre confirmee avant toute decision.`,
        best.flatMap((entry) => entry.dimension.evidence)
      ));
      continue;
    }
    values[code] = best[0].dimension;
  }

  return { values, ambiguousCodes, issues };
};

const selectFlange = (
  flanges: readonly MotorCatalogFlangeOption[],
  input: MotorCatalogGetInput
): MotorCatalogFlangeOption | null => {
  if (input.mounting === 'B3') return null;
  if (input.flange_option_id) {
    return flanges.find((flange) =>
      flange.id === input.flange_option_id && flange.mounting === input.mounting
    ) ?? null;
  }
  return flanges.find((flange) =>
    flange.mounting === input.mounting && flange.role === 'standard'
  ) ?? null;
};

const deepApplyOverrides = (
  catalog: Record<string, unknown>,
  overrides: Record<string, unknown>
): Record<string, unknown> => {
  const result = { ...catalog };
  for (const [key, override] of Object.entries(overrides)) {
    const current = result[key];
    if (
      typeof override === 'object'
      && override !== null
      && typeof current === 'object'
      && current !== null
      && !Array.isArray(override)
      && !Reflect.has(override, 'origin')
    ) {
      result[key] = deepApplyOverrides(
        current as Record<string, unknown>,
        override as Record<string, unknown>
      );
    } else {
      result[key] = override;
    }
  }
  return result;
};

const makeDimensionFact = (
  dimension: MotorCatalogDimension | undefined
) => catalogFact(
  dimension?.value_mm ?? null,
  dimension?.evidence ?? [],
  'mm'
);

const makeTextDimensionFact = (
  dimension: MotorCatalogDimension | undefined
) => catalogFact(
  dimension?.value_text ?? null,
  dimension?.evidence ?? []
);

export type NormalizeMotorCatalogInput = {
  snapshotId: string;
  model: CatalogModel;
  operatingPoint: CatalogOperatingPoint;
  dimensions: readonly MotorCatalogDimension[];
  flangeOptions: readonly MotorCatalogFlangeOption[];
  selection: MotorCatalogGetInput;
};

export const normalizeMotorCatalog = (
  input: NormalizeMotorCatalogInput
): { spec: EquivalentSpec; normalization: Normalization } => {
  const selectedDimensions = selectCatalogDimensions(
    input.dimensions,
    input.selection.mounting,
    input.operatingPoint.poles
  );
  const selectedFlange = selectFlange(input.flangeOptions, input.selection);
  const dimension = selectedDimensions.values;

  const flangeEvidence = selectedFlange?.evidence ?? [];
  const flangeDimensions = {
    M: catalogFact(selectedFlange?.dim_m_mm ?? null, flangeEvidence, 'mm'),
    N: catalogFact(selectedFlange?.dim_n_mm ?? null, flangeEvidence, 'mm'),
    P: catalogFact(selectedFlange?.dim_p_mm ?? null, flangeEvidence, 'mm'),
    S: catalogFact(selectedFlange?.dim_s_mm ?? null, flangeEvidence, 'mm'),
    S_thread: catalogFact(selectedFlange?.dim_s_thread ?? null, flangeEvidence),
    T: catalogFact(selectedFlange?.dim_t_mm ?? null, flangeEvidence, 'mm'),
    Z: catalogFact(selectedFlange?.holes ?? null, flangeEvidence, 'count')
  };

  const catalogSpec: EquivalentSpec = {
    schema_version: 1,
    snapshot_id: input.snapshotId,
    mounting: input.selection.mounting,
    electrical: {
      power_kw: catalogFact(input.operatingPoint.power_kw, input.operatingPoint.evidence, 'kW'),
      speed_rpm: catalogFact(
        input.operatingPoint.rated_speed_rpm,
        input.operatingPoint.evidence,
        'rpm'
      ),
      poles: catalogFact(input.operatingPoint.poles, input.operatingPoint.evidence),
      network: catalogFact(null, []),
      frequency_hz: catalogFact(
        input.operatingPoint.frequency_hz,
        input.operatingPoint.evidence,
        'Hz'
      ),
      supply_mode: catalogFact(
        input.operatingPoint.supply_mode,
        input.operatingPoint.evidence
      ),
      voltage_v: catalogFact(
        input.operatingPoint.voltage_v,
        input.operatingPoint.evidence,
        'V'
      ),
      coupling: catalogFact(input.operatingPoint.coupling, input.operatingPoint.evidence),
      rated_current_a: catalogFact(
        input.operatingPoint.rated_current_a,
        input.operatingPoint.evidence,
        'A'
      ),
      rated_torque_nm: catalogFact(
        input.operatingPoint.rated_torque_nm,
        input.operatingPoint.evidence,
        'N.m'
      ),
      efficiency_class: catalogFact(
        input.operatingPoint.efficiency_class,
        input.operatingPoint.evidence
      )
    },
    mechanical: {
      frame: {
        dimensions: {
          A: makeDimensionFact(dimension.A),
          B: makeDimensionFact(dimension.B),
          C: makeDimensionFact(dimension.C),
          H: makeDimensionFact(dimension.H),
          K: makeDimensionFact(dimension.K)
        }
      },
      shaft: {
        dimensions: {
          D: makeDimensionFact(dimension.D),
          D_fit_tolerance: makeTextDimensionFact(undefined),
          E: makeDimensionFact(dimension.E),
          F: makeDimensionFact(dimension.F)
        }
      },
      ...(input.selection.mounting === 'B3'
        ? {}
        : {
          flange: {
            ...(selectedFlange?.flange_ref ? { reference: selectedFlange.flange_ref } : {}),
            bore_type: catalogFact(
              selectedFlange?.bore_type ?? null,
              flangeEvidence
            ),
            dimensions: flangeDimensions
          }
        })
    },
    application: {
      ip_rating: catalogFact(input.model.protection_ip, input.model.evidence),
      vfd_required: catalogFact(input.model.requires_vfd, input.model.evidence)
    }
  };

  const spec = input.selection.field_overrides
    ? deepApplyOverrides(
      catalogSpec as unknown as Record<string, unknown>,
      input.selection.field_overrides as unknown as Record<string, unknown>
    ) as unknown as EquivalentSpec
    : catalogSpec;

  const missingFacts = new Set<MotorFactPath>();
  for (const factPath of REQUIRED_FACTS[input.selection.mounting]) {
    const hasCatalogValue = readNormalizedFactValue(catalogSpec, factPath) !== undefined;
    const overrideValue = readOverrideValue(input.selection.field_overrides, factPath);
    if (!hasCatalogValue && overrideValue === undefined) missingFacts.add(factPath);
  }

  const normalizationIssues = [...selectedDimensions.issues];
  if (input.selection.mounting !== 'B3' && selectedFlange === null) {
    normalizationIssues.push(issue(
      'CATALOG_FLANGE_MISSING',
      'Aucune bride catalogue applicable n est disponible.',
      'La bride doit etre identifiee ou mesuree avant toute decision.',
      []
    ));
  }

  return {
    spec,
    normalization: {
      status: missingFacts.size === 0 ? 'satisfied' : 'indeterminate',
      missing_facts: [...missingFacts],
      issues: normalizationIssues
    }
  };
};

const readOverrideValue = (
  overrides: MotorFromMotorFieldOverrides | undefined,
  factPath: MotorFactPath
): unknown => {
  if (!overrides) return undefined;
  const path = factObjectPath(factPath);
  let current: unknown = overrides;
  for (const segment of path) {
    if (typeof current !== 'object' || current === null) return undefined;
    current = Reflect.get(current, segment);
  }
  if (typeof current !== 'object' || current === null) return undefined;
  return Reflect.get(current, 'value') ?? undefined;
};

const readNormalizedFactValue = (
  spec: EquivalentSpec,
  factPath: MotorFactPath
): unknown => {
  let current: unknown = spec;
  for (const segment of factObjectPath(factPath)) {
    if (typeof current !== 'object' || current === null) return undefined;
    current = Reflect.get(current, segment);
  }
  if (typeof current !== 'object' || current === null) return undefined;
  return Reflect.get(current, 'value') ?? undefined;
};

const factObjectPath = (factPath: MotorFactPath): string[] => {
  const parts = factPath.split('.');
  if (parts[0] !== 'mechanical' || parts.length < 3) return parts;
  const section = parts[1];
  if (section === 'flange' && parts[2] === 'bore_type') {
    return ['mechanical', 'flange', 'bore_type'];
  }
  if (section === 'flange' && parts[2] === 'P_clearance') {
    return ['mechanical', 'flange', 'clearance', 'P'];
  }
  if (section === 'flange' && parts[2] === 'T_clearance') {
    return ['mechanical', 'flange', 'clearance', 'T'];
  }
  if (section === 'frame' || section === 'shaft' || section === 'flange') {
    return [parts[0], section, 'dimensions', ...parts.slice(2)];
  }
  return parts;
};
