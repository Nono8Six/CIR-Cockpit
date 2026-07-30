import type {
  MotorMatchedFlange,
  MotorMechanicalCompatibilityResult,
  MotorMechanicalSpec,
  MotorMounting
} from '../../../../../shared/schemas/configurator/motor.schema.ts';
import {
  MOTOR_COMPATIBILITY_RULESET
} from '../../../../../shared/schemas/configurator/motor.schema.ts';
import type {
  ConfiguratorEvidence,
  CriterionStatus
} from '../../../../../shared/schemas/configurator/common.schema.ts';

type FactPath = MotorMechanicalCompatibilityResult['missing_facts'][number];
type RuleCode = MotorMechanicalCompatibilityResult['rules_applied'][number]['rule_code'];
type Criterion = MotorMechanicalCompatibilityResult['criteria'][number];
type RequiredAction = MotorMechanicalCompatibilityResult['adaptations_required'][number];
type UsedFact = MotorMechanicalCompatibilityResult['facts_used'][number];

type Fact = {
  value: string | number | boolean | null;
  unit?: string;
  origin: UsedFact['origin'];
  confirmation: UsedFact['confirmation'];
  evidence: ConfiguratorEvidence[];
};

export type MechanicalMotorSpec = {
  mounting: MotorMounting;
  mechanical: MotorMechanicalSpec;
};

export type MotorMechanicalCompatibilityInput = {
  existing: MechanicalMotorSpec;
  candidate: MechanicalMotorSpec;
  candidateFlange?: MotorMatchedFlange | null;
};

type EvaluationContext = {
  criteria: Criterion[];
  adaptations: RequiredAction[];
  checks: RequiredAction[];
  facts: UsedFact[];
  rules: MotorMechanicalCompatibilityResult['rules_applied'];
  missing: Set<FactPath>;
  decisiveStatuses: CriterionStatus[];
};

type AddCriterionInput = {
  code: string;
  label: string;
  status: CriterionStatus;
  blocking: boolean;
  expected: string | number | boolean | null;
  observed: string | number | boolean | null;
  explanation: string;
  ruleCode: RuleCode;
  factPaths: FactPath[];
  facts?: Array<{ path: FactPath; fact: Fact | undefined }>;
  evidence?: ConfiguratorEvidence[];
  unit?: string;
  tolerance?: number;
  delta?: number;
  calculatedClearance?: number;
  decisive?: boolean;
};

const STATUS_PRIORITY: Readonly<Record<CriterionStatus, number>> = {
  satisfied: 0,
  under_reservation: 1,
  indeterminate: 2,
  not_satisfied: 3
};

const FOOT_MOUNTINGS = new Set<MotorMounting>(['B3', 'B34', 'B35']);

const stableValue = (value: unknown): string => {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableValue).join(',')}]`;
  const record = value as Record<string, unknown>;
  return `{${Object.keys(record).sort().map((key) =>
    `${JSON.stringify(key)}:${stableValue(record[key])}`
  ).join(',')}}`;
};

const canonicalEvidence = (
  evidence: readonly ConfiguratorEvidence[]
): ConfiguratorEvidence[] => {
  const byKey = new Map<string, ConfiguratorEvidence>();
  for (const item of evidence) byKey.set(stableValue(item), item);
  return [...byKey.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([, item]) => item);
};

const evidenceFromFacts = (
  facts: readonly (Fact | undefined)[]
): ConfiguratorEvidence[] => canonicalEvidence(
  facts.flatMap((fact) => fact?.evidence ?? [])
);

const hasKnownValue = (fact: Fact | undefined): fact is Fact & {
  value: string | number | boolean;
} => fact !== undefined && fact.value !== null && fact.evidence.length > 0;

const isConfirmed = (fact: Fact | undefined): boolean =>
  hasKnownValue(fact) && fact.confirmation === 'confirmed';

const isMeasuredAndConfirmed = (fact: Fact | undefined): boolean =>
  isConfirmed(fact)
  && fact?.origin === 'user_measurement'
  && fact.evidence.some((evidence) => evidence.kind === 'measurement');

const numericValue = (fact: Fact | undefined): number | null =>
  hasKnownValue(fact) && typeof fact.value === 'number' ? fact.value : null;

const textValue = (fact: Fact | undefined): string | null =>
  hasKnownValue(fact) && typeof fact.value === 'string' ? fact.value : null;

const addUsedFact = (
  context: EvaluationContext,
  path: FactPath,
  fact: Fact | undefined
) => {
  if (!hasKnownValue(fact)) return;
  context.facts.push({
    fact_path: path,
    value: fact.value,
    ...(fact.unit ? { unit: fact.unit } : {}),
    origin: fact.origin,
    confirmation: fact.confirmation,
    evidence: canonicalEvidence(fact.evidence)
  });
};

const addCriterion = (
  context: EvaluationContext,
  input: AddCriterionInput
) => {
  const facts = input.facts ?? [];
  for (const fact of facts) addUsedFact(context, fact.path, fact.fact);
  const evidence = canonicalEvidence([
    ...evidenceFromFacts(facts.map(({ fact }) => fact)),
    ...(input.evidence ?? [])
  ]);

  context.criteria.push({
    code: input.code,
    label: input.label,
    status: input.status,
    blocking: input.blocking,
    expected: input.expected,
    observed: input.observed,
    ...(input.unit ? { unit: input.unit } : {}),
    ...(input.tolerance !== undefined ? { tolerance: input.tolerance } : {}),
    ...(input.delta !== undefined ? { delta: input.delta } : {}),
    ...(input.calculatedClearance !== undefined
      ? { calculated_clearance: input.calculatedClearance }
      : {}),
    explanation: input.explanation,
    evidence,
    affected_by_issue_codes: []
  });
  const decisive = input.decisive ?? true;
  context.rules.push({
    rule_code: input.ruleCode,
    ...MOTOR_COMPATIBILITY_RULESET,
    status: input.status,
    decisive,
    fact_paths: input.factPaths
  });
  if (decisive) context.decisiveStatuses.push(input.status);
};

const addAction = (
  target: RequiredAction[],
  code: string,
  label: string,
  explanation: string,
  facts: readonly (Fact | undefined)[]
) => {
  target.push({
    code,
    label,
    explanation,
    evidence: evidenceFromFacts(facts)
  });
};

const calculationEvidence = (
  label: string,
  ruleCode: string,
  inputs: Array<{ key: string; value: string | number | boolean | null; unit?: string }>
): ConfiguratorEvidence => ({
  kind: 'rule',
  label,
  rule_code: ruleCode,
  inputs
});

const frameDimensions = (spec: MechanicalMotorSpec) =>
  spec.mechanical.frame.dimensions as Record<string, Fact | undefined>;

const frameAdjustment = (spec: MechanicalMotorSpec) =>
  spec.mechanical.frame.adjustment as Record<string, Fact | undefined> | undefined;

const shaftDimensions = (spec: MechanicalMotorSpec) =>
  spec.mechanical.shaft.dimensions as Record<string, Fact | undefined>;

const flangeDimensions = (spec: MechanicalMotorSpec) =>
  spec.mechanical.flange?.dimensions as Record<string, Fact | undefined> | undefined;

const flangeClearance = (spec: MechanicalMotorSpec) =>
  spec.mechanical.flange?.clearance as Record<string, Fact | undefined> | undefined;

const markMissing = (
  context: EvaluationContext,
  ...paths: FactPath[]
) => paths.forEach((path) => context.missing.add(path));

const candidateHoleClearance = (
  existing: MechanicalMotorSpec,
  candidate: MechanicalMotorSpec
): { value: number | null; evidence: ConfiguratorEvidence[] } => {
  const candidateK = frameDimensions(candidate).K;
  const boltDiameter = frameAdjustment(existing)?.bolt_diameter;
  const k = numericValue(candidateK);
  const bolt = numericValue(boltDiameter);
  if (k === null || bolt === null) {
    return { value: null, evidence: evidenceFromFacts([candidateK, boltDiameter]) };
  }
  return {
    value: (k - bolt) / 2,
    evidence: [
      ...evidenceFromFacts([candidateK, boltDiameter]),
      calculationEvidence('Calcul du jeu radial K', 'FRAME_K_BOLT_CLEARANCE', [
        { key: 'K_candidat', value: k, unit: 'mm' },
        { key: 'diametre_boulon', value: bolt, unit: 'mm' }
      ])
    ]
  };
};

const evaluateMounting = (
  context: EvaluationContext,
  existing: MechanicalMotorSpec,
  candidate: MechanicalMotorSpec
) => {
  const satisfied = existing.mounting === candidate.mounting;
  addCriterion(context, {
    code: 'MOUNTING',
    label: 'Montage mecanique',
    status: satisfied ? 'satisfied' : 'not_satisfied',
    blocking: true,
    expected: existing.mounting,
    observed: candidate.mounting,
    explanation: satisfied
      ? `Le montage ${candidate.mounting} est identique.`
      : `Le montage ${candidate.mounting} differe du montage ${existing.mounting}.`,
    ruleCode: 'MOUNTING',
    factPaths: ['mounting']
  });
};

const evaluateFrameOffset = (
  context: EvaluationContext,
  existing: MechanicalMotorSpec,
  candidate: MechanicalMotorSpec,
  code: 'A' | 'B'
) => {
  const path = `mechanical.frame.${code}` as FactPath;
  const travelPath = code === 'A'
    ? 'mechanical.frame.transverse_travel'
    : 'mechanical.frame.longitudinal_travel';
  const existingFact = frameDimensions(existing)[code];
  const candidateFact = frameDimensions(candidate)[code];
  const expected = numericValue(existingFact);
  const observed = numericValue(candidateFact);
  const label = `Entraxe de pattes ${code}`;

  if (expected === null || observed === null) {
    markMissing(context, path);
    addCriterion(context, {
      code: `FRAME_${code}`,
      label,
      status: 'indeterminate',
      blocking: true,
      expected,
      observed,
      explanation: `La cote ${code} manque pour conclure.`,
      ruleCode: `FRAME_${code}`,
      factPaths: [path],
      facts: [
        { path, fact: existingFact },
        { path, fact: candidateFact }
      ],
      unit: 'mm'
    });
    return;
  }

  const offset = Math.abs(observed - expected) / 2;
  const offsetEvidence = calculationEvidence(
    `Calcul de l ecart par patte ${code}`,
    `FRAME_${code}`,
    [
      { key: `${code}_existant`, value: expected, unit: 'mm' },
      { key: `${code}_candidat`, value: observed, unit: 'mm' }
    ]
  );
  if (offset === 0) {
    addCriterion(context, {
      code: `FRAME_${code}`,
      label,
      status: 'satisfied',
      blocking: true,
      expected,
      observed,
      delta: 0,
      explanation: `La cote ${code} est strictement identique.`,
      ruleCode: `FRAME_${code}`,
      factPaths: [path],
      facts: [
        { path, fact: existingFact },
        { path, fact: candidateFact }
      ],
      evidence: [offsetEvidence],
      unit: 'mm'
    });
    return;
  }

  const travelFact = code === 'A'
    ? frameAdjustment(existing)?.transverse_travel
    : frameAdjustment(existing)?.longitudinal_travel;
  const travel = numericValue(travelFact);
  const holeClearance = candidateHoleClearance(existing, candidate);
  if (!isMeasuredAndConfirmed(travelFact) || travel === null) {
    markMissing(context, travelPath);
    addCriterion(context, {
      code: `FRAME_${code}`,
      label,
      status: 'under_reservation',
      blocking: true,
      expected,
      observed,
      delta: offset,
      explanation:
        `L ecart ${code} de ${offset} mm par patte exige une course de bati mesuree et confirmee.`,
      ruleCode: `FRAME_${code}`,
      factPaths: [path, travelPath],
      facts: [
        { path, fact: existingFact },
        { path, fact: candidateFact },
        { path: travelPath, fact: travelFact }
      ],
      evidence: [offsetEvidence],
      unit: 'mm'
    });
    addAction(
      context.checks,
      `MEASURE_FRAME_${code}_TRAVEL`,
      `Mesurer la course ${code}`,
      'Mesurer et confirmer la course disponible du bati avant remplacement.',
      [travelFact]
    );
    return;
  }

  if (holeClearance.value === null) {
    markMissing(
      context,
      'mechanical.frame.K',
      'mechanical.frame.bolt_diameter'
    );
    addCriterion(context, {
      code: `FRAME_${code}`,
      label,
      status: 'under_reservation',
      blocking: true,
      expected,
      observed,
      delta: offset,
      explanation:
        `L ecart ${code} est connu, mais le jeu K/boulon ne peut pas etre calcule.`,
      ruleCode: `FRAME_${code}`,
      factPaths: [
        path,
        travelPath,
        'mechanical.frame.K',
        'mechanical.frame.bolt_diameter'
      ],
      facts: [
        { path, fact: existingFact },
        { path, fact: candidateFact },
        { path: travelPath, fact: travelFact }
      ],
      evidence: [offsetEvidence],
      unit: 'mm'
    });
    return;
  }

  const available = Math.max(0, holeClearance.value) + travel;
  const satisfied = offset <= available;
  addCriterion(context, {
    code: `FRAME_${code}`,
    label,
    status: satisfied ? 'satisfied' : 'not_satisfied',
    blocking: true,
    expected,
    observed,
    delta: offset,
    tolerance: available,
    calculatedClearance: available,
    explanation: satisfied
      ? `L ecart ${code} de ${offset} mm par patte reste dans le degagement prouve de ${available} mm.`
      : `L ecart ${code} de ${offset} mm par patte depasse le degagement prouve de ${available} mm.`,
    ruleCode: `FRAME_${code}`,
    factPaths: [
      path,
      travelPath,
      'mechanical.frame.K',
      'mechanical.frame.bolt_diameter'
    ],
    facts: [
      { path, fact: existingFact },
      { path, fact: candidateFact },
      { path: travelPath, fact: travelFact }
    ],
    evidence: [offsetEvidence, ...holeClearance.evidence],
    unit: 'mm'
  });
  if (!satisfied) {
    addAction(
      context.adaptations,
      `ADAPT_FRAME_${code}`,
      `Adapter la fixation ${code}`,
      `Le bati doit etre adapte pour absorber l ecart ${code}.`,
      [existingFact, candidateFact, travelFact]
    );
  }
};

const evaluateFrameHeight = (
  context: EvaluationContext,
  existing: MechanicalMotorSpec,
  candidate: MechanicalMotorSpec
) => {
  const path: FactPath = 'mechanical.frame.H';
  const existingFact = frameDimensions(existing).H;
  const candidateFact = frameDimensions(candidate).H;
  const expected = numericValue(existingFact);
  const observed = numericValue(candidateFact);
  if (expected === null || observed === null) {
    markMissing(context, path);
    addCriterion(context, {
      code: 'FRAME_H',
      label: 'Hauteur d axe H',
      status: 'indeterminate',
      blocking: true,
      expected,
      observed,
      explanation: 'La hauteur d axe H manque pour conclure.',
      ruleCode: 'FRAME_H',
      factPaths: [path],
      facts: [{ path, fact: existingFact }, { path, fact: candidateFact }],
      unit: 'mm'
    });
    return;
  }
  const delta = Math.abs(observed - expected);
  const satisfied = delta === 0;
  addCriterion(context, {
    code: 'FRAME_H',
    label: 'Hauteur d axe H',
    status: satisfied ? 'satisfied' : 'under_reservation',
    blocking: true,
    expected,
    observed,
    delta,
    explanation: satisfied
      ? 'La hauteur d axe H est strictement identique.'
      : `La hauteur d axe H differe de ${delta} mm et impose une adaptation.`,
    ruleCode: 'FRAME_H',
    factPaths: [path],
    facts: [{ path, fact: existingFact }, { path, fact: candidateFact }],
    unit: 'mm'
  });
  if (!satisfied) {
    addAction(
      context.adaptations,
      'ADAPT_FRAME_H',
      'Adapter la hauteur d axe',
      'Recaler la hauteur d axe sans deduire aucune autre cote mecanique.',
      [existingFact, candidateFact]
    );
  }
};

const evaluateBoltClearance = (
  context: EvaluationContext,
  existing: MechanicalMotorSpec,
  candidate: MechanicalMotorSpec
) => {
  const kPath: FactPath = 'mechanical.frame.K';
  const boltPath: FactPath = 'mechanical.frame.bolt_diameter';
  const candidateK = frameDimensions(candidate).K;
  const bolt = frameAdjustment(existing)?.bolt_diameter;
  const kValue = numericValue(candidateK);
  const boltValue = numericValue(bolt);
  const clearance = candidateHoleClearance(existing, candidate);
  if (kValue === null || boltValue === null || clearance.value === null) {
    if (kValue === null) markMissing(context, kPath);
    if (boltValue === null) markMissing(context, boltPath);
    addCriterion(context, {
      code: 'FRAME_K_BOLT_CLEARANCE',
      label: 'Jeu trou K et boulon',
      status: 'indeterminate',
      blocking: true,
      expected: boltValue,
      observed: kValue,
      explanation: 'K et le diametre reel du boulon sont requis pour calculer le jeu.',
      ruleCode: 'FRAME_K_BOLT_CLEARANCE',
      factPaths: [kPath, boltPath],
      facts: [{ path: kPath, fact: candidateK }, { path: boltPath, fact: bolt }],
      unit: 'mm'
    });
    return;
  }
  const satisfied = clearance.value > 0;
  addCriterion(context, {
    code: 'FRAME_K_BOLT_CLEARANCE',
    label: 'Jeu trou K et boulon',
    status: satisfied ? 'satisfied' : 'not_satisfied',
    blocking: true,
    expected: boltValue,
    observed: kValue,
    delta: kValue - boltValue,
    calculatedClearance: clearance.value,
    explanation: satisfied
      ? `Le jeu radial calcule est de ${clearance.value} mm.`
      : 'Le trou K ne procure aucun jeu positif au boulon mesure.',
    ruleCode: 'FRAME_K_BOLT_CLEARANCE',
    factPaths: [kPath, boltPath],
    facts: [{ path: kPath, fact: candidateK }, { path: boltPath, fact: bolt }],
    evidence: clearance.evidence,
    unit: 'mm'
  });
};

const evaluateFrameC = (
  context: EvaluationContext,
  existing: MechanicalMotorSpec,
  candidate: MechanicalMotorSpec
) => {
  const path: FactPath = 'mechanical.frame.C';
  const travelPath: FactPath = 'mechanical.frame.longitudinal_travel';
  const existingFact = frameDimensions(existing).C;
  const candidateFact = frameDimensions(candidate).C;
  const expected = numericValue(existingFact);
  const observed = numericValue(candidateFact);
  if (expected === null || observed === null) {
    markMissing(context, path);
    addCriterion(context, {
      code: 'FRAME_C',
      label: 'Encombrement axial C',
      status: 'indeterminate',
      blocking: true,
      expected,
      observed,
      explanation: 'La cote C manque pour controler l encombrement axial.',
      ruleCode: 'FRAME_C',
      factPaths: [path],
      facts: [{ path, fact: existingFact }, { path, fact: candidateFact }],
      unit: 'mm'
    });
    return;
  }
  const delta = Math.abs(observed - expected);
  if (delta === 0) {
    addCriterion(context, {
      code: 'FRAME_C',
      label: 'Encombrement axial C',
      status: 'satisfied',
      blocking: true,
      expected,
      observed,
      delta: 0,
      explanation: 'La cote C est strictement identique.',
      ruleCode: 'FRAME_C',
      factPaths: [path],
      facts: [{ path, fact: existingFact }, { path, fact: candidateFact }],
      unit: 'mm'
    });
    return;
  }
  const travelFact = frameAdjustment(existing)?.longitudinal_travel;
  const travel = numericValue(travelFact);
  const usable = isMeasuredAndConfirmed(travelFact) && travel !== null;
  if (!usable) markMissing(context, travelPath);
  const sufficient = usable && travel >= delta;
  addCriterion(context, {
    code: 'FRAME_C',
    label: 'Encombrement axial C',
    status: 'under_reservation',
    blocking: true,
    expected,
    observed,
    delta,
    ...(usable ? { tolerance: travel, calculatedClearance: travel } : {}),
    explanation: !usable
      ? `La cote C differe de ${delta} mm sans course longitudinale mesuree.`
      : sufficient
      ? `La course longitudinale couvre ${delta} mm, mais l engagement et l enveloppe restent a verifier.`
      : `La course longitudinale est insuffisante pour l ecart C de ${delta} mm.`,
    ruleCode: 'FRAME_C',
    factPaths: [path, travelPath],
    facts: [
      { path, fact: existingFact },
      { path, fact: candidateFact },
      { path: travelPath, fact: travelFact }
    ],
    unit: 'mm'
  });
  if (sufficient) {
    addAction(
      context.checks,
      'CHECK_FRAME_C_ENVELOPE',
      'Verifier l enveloppe axiale',
      'Verifier l engagement et l encombrement final malgre la course suffisante.',
      [existingFact, candidateFact, travelFact]
    );
  } else if (usable) {
    addAction(
      context.adaptations,
      'ADAPT_FRAME_C',
      'Adapter la position axiale',
      'Une adaptation est requise car la course longitudinale prouvee est insuffisante.',
      [existingFact, candidateFact, travelFact]
    );
  } else {
    addAction(
      context.checks,
      'MEASURE_FRAME_C_TRAVEL',
      'Mesurer la course axiale',
      'Mesurer la course longitudinale avant de conclure sur C.',
      [travelFact]
    );
  }
};

const evaluateFootMounting = (
  context: EvaluationContext,
  existing: MechanicalMotorSpec,
  candidate: MechanicalMotorSpec
) => {
  evaluateFrameHeight(context, existing, candidate);
  evaluateFrameOffset(context, existing, candidate, 'A');
  evaluateFrameOffset(context, existing, candidate, 'B');
  evaluateBoltClearance(context, existing, candidate);
  evaluateFrameC(context, existing, candidate);
};

const evaluateStrictShaftDimension = (
  context: EvaluationContext,
  existing: MechanicalMotorSpec,
  candidate: MechanicalMotorSpec,
  code: 'D' | 'F'
) => {
  const path = `mechanical.shaft.${code}` as FactPath;
  const existingFact = shaftDimensions(existing)[code];
  const candidateFact = shaftDimensions(candidate)[code];
  const expected = numericValue(existingFact);
  const observed = numericValue(candidateFact);
  if (expected === null || observed === null) {
    markMissing(context, path);
    addCriterion(context, {
      code: `SHAFT_${code}`,
      label: code === 'D' ? 'Diametre d arbre D' : 'Largeur de clavette F',
      status: 'indeterminate',
      blocking: true,
      expected,
      observed,
      explanation: `La cote d arbre ${code} manque pour conclure.`,
      ruleCode: `SHAFT_${code}`,
      factPaths: [path],
      facts: [{ path, fact: existingFact }, { path, fact: candidateFact }],
      unit: 'mm'
    });
    return;
  }
  const delta = Math.abs(observed - expected);
  const satisfied = delta === 0;
  addCriterion(context, {
    code: `SHAFT_${code}`,
    label: code === 'D' ? 'Diametre d arbre D' : 'Largeur de clavette F',
    status: satisfied ? 'satisfied' : 'not_satisfied',
    blocking: true,
    expected,
    observed,
    delta,
    explanation: satisfied
      ? `La cote d arbre ${code} est strictement identique.`
      : `La cote d arbre ${code} differe de ${delta} mm sans compensation generique autorisee.`,
    ruleCode: `SHAFT_${code}`,
    factPaths: [path],
    facts: [{ path, fact: existingFact }, { path, fact: candidateFact }],
    unit: 'mm'
  });
};

const evaluateShaftTolerance = (
  context: EvaluationContext,
  existing: MechanicalMotorSpec,
  candidate: MechanicalMotorSpec
) => {
  const dExisting = numericValue(shaftDimensions(existing).D);
  const dCandidate = numericValue(shaftDimensions(candidate).D);
  if (dExisting === null || dCandidate === null || dExisting !== dCandidate) return;
  const path: FactPath = 'mechanical.shaft.D_fit_tolerance';
  const existingFact = shaftDimensions(existing).D_fit_tolerance;
  const candidateFact = shaftDimensions(candidate).D_fit_tolerance;
  const expected = textValue(existingFact);
  const observed = textValue(candidateFact);
  if (expected === null || observed === null || expected === observed) return;
  addCriterion(context, {
    code: 'SHAFT_D_FIT_TOLERANCE',
    label: 'Tolerance d ajustement de D',
    status: 'satisfied',
    blocking: false,
    expected,
    observed,
    explanation:
      'Le diametre D reste compatible ; la tolerance differente est une information de montage.',
    ruleCode: 'SHAFT_D_FIT_TOLERANCE',
    factPaths: [path],
    facts: [{ path, fact: existingFact }, { path, fact: candidateFact }],
    decisive: false
  });
  addAction(
    context.checks,
    'CHECK_SHAFT_D_FIT',
    'Verifier l ajustement de l accouplement',
    'Controler la tolerance d ajustement sans degrader la compatibilite mecanique.',
    [existingFact, candidateFact]
  );
};

const evaluateShaftE = (
  context: EvaluationContext,
  existing: MechanicalMotorSpec,
  candidate: MechanicalMotorSpec
) => {
  const path: FactPath = 'mechanical.shaft.E';
  const existingFact = shaftDimensions(existing).E;
  const candidateFact = shaftDimensions(candidate).E;
  const expected = numericValue(existingFact);
  const observed = numericValue(candidateFact);
  if (expected === null || observed === null) {
    markMissing(context, path);
    addCriterion(context, {
      code: 'SHAFT_E_COUPLING_RANGE',
      label: 'Longueur d arbre E',
      status: 'indeterminate',
      blocking: true,
      expected,
      observed,
      explanation: 'La cote E manque pour controler l engagement axial.',
      ruleCode: 'SHAFT_E_COUPLING_RANGE',
      factPaths: [path],
      facts: [{ path, fact: existingFact }, { path, fact: candidateFact }],
      unit: 'mm'
    });
    return;
  }
  const delta = Math.abs(observed - expected);
  if (delta === 0) {
    addCriterion(context, {
      code: 'SHAFT_E_COUPLING_RANGE',
      label: 'Longueur d arbre E',
      status: 'satisfied',
      blocking: true,
      expected,
      observed,
      delta: 0,
      explanation: 'La cote E est strictement identique.',
      ruleCode: 'SHAFT_E_COUPLING_RANGE',
      factPaths: [path],
      facts: [{ path, fact: existingFact }, { path, fact: candidateFact }],
      unit: 'mm'
    });
    return;
  }

  const minimumPath: FactPath = 'mechanical.coupling.axial_min';
  const maximumPath: FactPath = 'mechanical.coupling.axial_max';
  const minimumFact = existing.mechanical.coupling?.axial_min as Fact | undefined;
  const maximumFact = existing.mechanical.coupling?.axial_max as Fact | undefined;
  const minimum = numericValue(minimumFact);
  const maximum = numericValue(maximumFact);
  const rangeUsable = isConfirmed(minimumFact)
    && isConfirmed(maximumFact)
    && minimum !== null
    && maximum !== null;
  if (!rangeUsable) markMissing(context, minimumPath, maximumPath);
  const sufficient = rangeUsable && observed >= minimum && observed <= maximum;
  addCriterion(context, {
    code: 'SHAFT_E_COUPLING_RANGE',
    label: 'Longueur d arbre E',
    status: sufficient ? 'satisfied' : 'under_reservation',
    blocking: true,
    expected,
    observed,
    delta,
    explanation: sufficient
      ? `La cote E candidate reste dans la plage axiale prouvee ${minimum}-${maximum} mm.`
      : rangeUsable
      ? `La cote E candidate est hors de la plage axiale prouvee ${minimum}-${maximum} mm.`
      : 'La cote E differe sans plage axiale d accouplement exploitable.',
    ruleCode: 'SHAFT_E_COUPLING_RANGE',
    factPaths: [path, minimumPath, maximumPath],
    facts: [
      { path, fact: existingFact },
      { path, fact: candidateFact },
      { path: minimumPath, fact: minimumFact },
      { path: maximumPath, fact: maximumFact }
    ],
    unit: 'mm'
  });
  if (!sufficient) {
    addAction(
      rangeUsable ? context.adaptations : context.checks,
      rangeUsable ? 'ADAPT_SHAFT_E' : 'CHECK_SHAFT_E_RANGE',
      rangeUsable ? 'Adapter l engagement axial' : 'Verifier la plage axiale',
      rangeUsable
        ? 'Adapter l accouplement car E sort de la plage axiale prouvee.'
        : 'Mesurer ou documenter la plage axiale de l accouplement.',
      [existingFact, candidateFact, minimumFact, maximumFact]
    );
  }
};

const evaluateShaft = (
  context: EvaluationContext,
  existing: MechanicalMotorSpec,
  candidate: MechanicalMotorSpec
) => {
  evaluateStrictShaftDimension(context, existing, candidate, 'D');
  evaluateShaftTolerance(context, existing, candidate);
  evaluateShaftE(context, existing, candidate);
  evaluateStrictShaftDimension(context, existing, candidate, 'F');
};

const evaluateExactFlangeFact = (
  context: EvaluationContext,
  existing: MechanicalMotorSpec,
  candidate: MechanicalMotorSpec,
  code: 'M' | 'N' | 'S' | 'S_thread' | 'Z'
) => {
  const path = `mechanical.flange.${code}` as FactPath;
  const existingFact = flangeDimensions(existing)?.[code];
  const candidateFact = flangeDimensions(candidate)?.[code];
  const expected = code === 'S_thread' ? textValue(existingFact) : numericValue(existingFact);
  const observed = code === 'S_thread' ? textValue(candidateFact) : numericValue(candidateFact);
  if (expected === null || observed === null) {
    markMissing(context, path);
    addCriterion(context, {
      code: `FLANGE_${code}`,
      label: `Interface de bride ${code}`,
      status: 'indeterminate',
      blocking: true,
      expected,
      observed,
      explanation: `La donnee de bride ${code} manque pour conclure.`,
      ruleCode: 'FLANGE_INTERFACE',
      factPaths: [path],
      facts: [{ path, fact: existingFact }, { path, fact: candidateFact }],
      ...(code === 'S_thread' ? {} : { unit: code === 'Z' ? 'count' : 'mm' })
    });
    return;
  }
  const satisfied = expected === observed;
  addCriterion(context, {
    code: `FLANGE_${code}`,
    label: `Interface de bride ${code}`,
    status: satisfied ? 'satisfied' : 'not_satisfied',
    blocking: true,
    expected,
    observed,
    ...(typeof expected === 'number' && typeof observed === 'number'
      ? { delta: Math.abs(observed - expected) }
      : {}),
    explanation: satisfied
      ? `La donnee de bride ${code} est strictement identique.`
      : `La donnee de bride ${code} differe ; aucune compensation n est autorisee.`,
    ruleCode: 'FLANGE_INTERFACE',
    factPaths: [path],
    facts: [{ path, fact: existingFact }, { path, fact: candidateFact }],
    ...(code === 'S_thread' ? {} : { unit: code === 'Z' ? 'count' : 'mm' })
  });
};

const evaluateFlangeBore = (
  context: EvaluationContext,
  existing: MechanicalMotorSpec,
  candidate: MechanicalMotorSpec
): 'through' | 'tapped' | null => {
  const path: FactPath = 'mechanical.flange.bore_type';
  const existingFact = existing.mechanical.flange?.bore_type as Fact | undefined;
  const candidateFact = candidate.mechanical.flange?.bore_type as Fact | undefined;
  const expected = textValue(existingFact);
  const observed = textValue(candidateFact);
  if (expected === null || observed === null) {
    markMissing(context, path);
    addCriterion(context, {
      code: 'FLANGE_BORE_TYPE',
      label: 'Nature d alesage de bride',
      status: 'indeterminate',
      blocking: true,
      expected,
      observed,
      explanation: 'La nature d alesage doit etre prouvee des deux cotes.',
      ruleCode: 'FLANGE_INTERFACE',
      factPaths: [path],
      facts: [{ path, fact: existingFact }, { path, fact: candidateFact }]
    });
    return null;
  }
  const satisfied = expected === observed;
  addCriterion(context, {
    code: 'FLANGE_BORE_TYPE',
    label: 'Nature d alesage de bride',
    status: satisfied ? 'satisfied' : 'not_satisfied',
    blocking: true,
    expected,
    observed,
    explanation: satisfied
      ? `Les deux brides utilisent un alesage ${expected}.`
      : 'Les brides n utilisent pas la meme nature d alesage.',
    ruleCode: 'FLANGE_INTERFACE',
    factPaths: [path],
    facts: [{ path, fact: existingFact }, { path, fact: candidateFact }]
  });
  return satisfied && (expected === 'through' || expected === 'tapped')
    ? expected
    : null;
};

const evaluateFlangeClearance = (
  context: EvaluationContext,
  existing: MechanicalMotorSpec,
  candidate: MechanicalMotorSpec,
  code: 'P' | 'T'
) => {
  const path = `mechanical.flange.${code}` as FactPath;
  const clearancePath = `mechanical.flange.${code}_clearance` as FactPath;
  const existingFact = flangeDimensions(existing)?.[code];
  const candidateFact = flangeDimensions(candidate)?.[code];
  const clearanceFact = flangeClearance(existing)?.[code];
  const expected = numericValue(existingFact);
  const observed = numericValue(candidateFact);
  if (expected === null || observed === null) {
    markMissing(context, path);
    addCriterion(context, {
      code: `FLANGE_${code}_CLEARANCE`,
      label: `Degagement de bride ${code}`,
      status: 'indeterminate',
      blocking: true,
      expected,
      observed,
      explanation: `La cote de bride ${code} manque pour conclure.`,
      ruleCode: 'FLANGE_INTERFACE',
      factPaths: [path],
      facts: [{ path, fact: existingFact }, { path, fact: candidateFact }],
      unit: 'mm'
    });
    return;
  }
  const delta = code === 'P'
    ? Math.abs(observed - expected) / 2
    : Math.abs(observed - expected);
  if (delta === 0) {
    addCriterion(context, {
      code: `FLANGE_${code}_CLEARANCE`,
      label: `Degagement de bride ${code}`,
      status: 'satisfied',
      blocking: true,
      expected,
      observed,
      delta: 0,
      explanation: `La cote de bride ${code} est strictement identique.`,
      ruleCode: 'FLANGE_INTERFACE',
      factPaths: [path],
      facts: [{ path, fact: existingFact }, { path, fact: candidateFact }],
      unit: 'mm'
    });
    return;
  }
  const clearance = numericValue(clearanceFact);
  if (!isMeasuredAndConfirmed(clearanceFact) || clearance === null) {
    markMissing(context, clearancePath);
    addCriterion(context, {
      code: `FLANGE_${code}_CLEARANCE`,
      label: `Degagement de bride ${code}`,
      status: 'under_reservation',
      blocking: true,
      expected,
      observed,
      delta,
      explanation:
        `La cote ${code} differe de ${delta} mm sans degagement mesure et confirme.`,
      ruleCode: 'FLANGE_INTERFACE',
      factPaths: [path, clearancePath],
      facts: [
        { path, fact: existingFact },
        { path, fact: candidateFact },
        { path: clearancePath, fact: clearanceFact }
      ],
      unit: 'mm'
    });
    addAction(
      context.checks,
      `MEASURE_FLANGE_${code}_CLEARANCE`,
      `Mesurer le degagement ${code}`,
      `Verifier le degagement disponible avant d accepter l ecart ${code}.`,
      [clearanceFact]
    );
    return;
  }
  const satisfied = delta <= clearance;
  addCriterion(context, {
    code: `FLANGE_${code}_CLEARANCE`,
    label: `Degagement de bride ${code}`,
    status: satisfied ? 'satisfied' : 'not_satisfied',
    blocking: true,
    expected,
    observed,
    delta,
    tolerance: clearance,
    calculatedClearance: clearance,
    explanation: satisfied
      ? `L ecart ${code} de ${delta} mm reste dans le degagement prouve de ${clearance} mm.`
      : `L ecart ${code} de ${delta} mm depasse le degagement prouve de ${clearance} mm.`,
    ruleCode: 'FLANGE_INTERFACE',
    factPaths: [path, clearancePath],
    facts: [
      { path, fact: existingFact },
      { path, fact: candidateFact },
      { path: clearancePath, fact: clearanceFact }
    ],
    unit: 'mm'
  });
};

const evaluateFlange = (
  context: EvaluationContext,
  existing: MechanicalMotorSpec,
  candidate: MechanicalMotorSpec,
  candidateFlange: MotorMatchedFlange | null | undefined
): MotorMatchedFlange | null => {
  if (existing.mounting === 'B3') {
    addCriterion(context, {
      code: 'FLANGE_INTERFACE',
      label: 'Interface de bride',
      status: 'satisfied',
      blocking: true,
      expected: null,
      observed: null,
      explanation: 'Le montage B3 ne requiert aucune bride.',
      ruleCode: 'FLANGE_INTERFACE',
      factPaths: ['mounting']
    });
    return null;
  }

  const firstFlangeCriterion = context.criteria.length;
  const boreType = evaluateFlangeBore(context, existing, candidate);
  evaluateExactFlangeFact(context, existing, candidate, 'M');
  evaluateExactFlangeFact(context, existing, candidate, 'N');
  evaluateExactFlangeFact(context, existing, candidate, 'Z');
  if (boreType === 'through') {
    evaluateExactFlangeFact(context, existing, candidate, 'S');
  } else if (boreType === 'tapped') {
    evaluateExactFlangeFact(context, existing, candidate, 'S_thread');
  } else {
    const path: FactPath = 'mechanical.flange.S';
    markMissing(context, path, 'mechanical.flange.S_thread');
    addCriterion(context, {
      code: 'FLANGE_FASTENER_INTERFACE',
      label: 'Interface de fixation de bride',
      status: 'indeterminate',
      blocking: true,
      expected: null,
      observed: null,
      explanation: 'S ou S_thread ne peut etre choisi sans nature d alesage prouvee.',
      ruleCode: 'FLANGE_INTERFACE',
      factPaths: [path, 'mechanical.flange.S_thread']
    });
  }
  evaluateFlangeClearance(context, existing, candidate, 'P');
  evaluateFlangeClearance(context, existing, candidate, 'T');

  const flangeCriteria = context.criteria.slice(firstFlangeCriterion);
  const exactInterface = flangeCriteria.every((criterion) =>
    criterion.status === 'satisfied'
  );
  const optionContractValid = candidateFlange !== undefined
    && candidateFlange !== null
    && candidateFlange.mounting === candidate.mounting
    && candidateFlange.requires_option === (candidateFlange.role !== 'standard');
  if (!exactInterface || !optionContractValid) return null;
  if (candidateFlange.role !== 'standard') {
    addAction(
      context.checks,
      'INSTALL_FLANGE_OPTION',
      'Prevoir l option de bride',
      `La bride ${candidateFlange.role} exacte doit etre commandee et montee comme option.`,
      Object.values(flangeDimensions(candidate) ?? {})
    );
  }
  return candidateFlange;
};

const aggregateStatus = (statuses: readonly CriterionStatus[]): CriterionStatus =>
  statuses.reduce<CriterionStatus>(
    (result, status) =>
      STATUS_PRIORITY[status] > STATUS_PRIORITY[result] ? status : result,
    'satisfied'
  );

const dedupeAndSort = <T>(items: readonly T[]): T[] => {
  const byKey = new Map(items.map((item) => [stableValue(item), item]));
  return [...byKey.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([, item]) => item);
};

export const evaluateMotorMechanicalCompatibility = (
  input: MotorMechanicalCompatibilityInput
): MotorMechanicalCompatibilityResult => {
  const context: EvaluationContext = {
    criteria: [],
    adaptations: [],
    checks: [],
    facts: [],
    rules: [],
    missing: new Set<FactPath>(),
    decisiveStatuses: []
  };

  evaluateMounting(context, input.existing, input.candidate);
  if (
    FOOT_MOUNTINGS.has(input.existing.mounting)
    && FOOT_MOUNTINGS.has(input.candidate.mounting)
  ) {
    evaluateFootMounting(context, input.existing, input.candidate);
  }
  evaluateShaft(context, input.existing, input.candidate);
  const matchedFlange = evaluateFlange(
    context,
    input.existing,
    input.candidate,
    input.candidateFlange
  );

  return {
    ...MOTOR_COMPATIBILITY_RULESET,
    status: aggregateStatus(context.decisiveStatuses),
    matched_flange: matchedFlange,
    criteria: context.criteria,
    adaptations_required: dedupeAndSort(context.adaptations),
    checks_required: dedupeAndSort(context.checks),
    facts_used: dedupeAndSort(context.facts),
    rules_applied: context.rules,
    missing_facts: [...context.missing].sort()
  };
};
