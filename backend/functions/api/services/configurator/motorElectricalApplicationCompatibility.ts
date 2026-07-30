import type {
  MotorApplicationRequirements,
  MotorElectricalApplicationCompatibilityResult,
  MotorElectricalSpec,
} from "../../../../../shared/schemas/configurator/motor.schema.ts";
import { MOTOR_COMPATIBILITY_RULESET } from "../../../../../shared/schemas/configurator/motor.schema.ts";
import type {
  ConfiguratorEvidence,
  CriterionStatus,
} from "../../../../../shared/schemas/configurator/common.schema.ts";

type FactPath =
  MotorElectricalApplicationCompatibilityResult["missing_facts"][number];
type RuleCode =
  MotorElectricalApplicationCompatibilityResult["rules_applied"][number][
    "rule_code"
  ];
type Criterion =
  MotorElectricalApplicationCompatibilityResult["criteria"][number];
type RequiredAction =
  MotorElectricalApplicationCompatibilityResult["adaptations_required"][number];
type UsedFact =
  MotorElectricalApplicationCompatibilityResult["facts_used"][number];

type Fact = {
  value: string | number | boolean | null;
  unit?: string;
  origin: UsedFact["origin"];
  confirmation: UsedFact["confirmation"];
  evidence: ConfiguratorEvidence[];
};

export type ElectricalApplicationMotorSpec = {
  electrical: MotorElectricalSpec;
  application?: MotorApplicationRequirements;
};

export type MotorElectricalApplicationCompatibilityInput = {
  existing: ElectricalApplicationMotorSpec;
  candidate: ElectricalApplicationMotorSpec;
  applicationRequirements?: MotorApplicationRequirements;
  torqueRequirement?: MotorElectricalSpec["rated_torque_nm"];
};

type Axis = "electrical" | "application";

type EvaluationContext = {
  criteria: Criterion[];
  adaptations: RequiredAction[];
  checks: RequiredAction[];
  facts: UsedFact[];
  rules: MotorElectricalApplicationCompatibilityResult["rules_applied"];
  missing: Set<FactPath>;
  electricalStatuses: CriterionStatus[];
  applicationStatuses: CriterionStatus[];
};

type CriterionFact = {
  path: FactPath;
  fact: Fact | undefined;
};

type AddCriterionInput = {
  axis: Axis;
  code: string;
  label: string;
  status: CriterionStatus;
  blocking: boolean;
  expected: string | number | boolean | null;
  observed: string | number | boolean | null;
  unit?: string;
  explanation: string;
  ruleCode: RuleCode;
  factPaths: FactPath[];
  facts?: CriterionFact[];
  decisive?: boolean;
};

const STATUS_PRIORITY: Readonly<Record<CriterionStatus, number>> = {
  satisfied: 0,
  under_reservation: 1,
  indeterminate: 2,
  not_satisfied: 3,
};

const stableValue = (value: unknown): string => {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableValue).join(",")}]`;
  const record = value as Record<string, unknown>;
  return `{${
    Object.keys(record).sort().map((key) =>
      `${JSON.stringify(key)}:${stableValue(record[key])}`
    ).join(",")
  }}`;
};

const canonicalEvidence = (
  evidence: readonly ConfiguratorEvidence[],
): ConfiguratorEvidence[] => {
  const byKey = new Map<string, ConfiguratorEvidence>();
  for (const item of evidence) byKey.set(stableValue(item), item);
  return [...byKey.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([, item]) => item);
};

const dedupeAndSort = <T>(items: readonly T[]): T[] => {
  const byKey = new Map(items.map((item) => [stableValue(item), item]));
  return [...byKey.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([, item]) => item);
};

const hasKnownValue = (fact: Fact | undefined): fact is Fact & {
  value: string | number | boolean;
} => fact !== undefined && fact.value !== null && fact.evidence.length > 0;

const scalarValue = (
  fact: Fact | undefined,
): string | number | boolean | null => hasKnownValue(fact) ? fact.value : null;

const numericValue = (fact: Fact | undefined): number | null =>
  hasKnownValue(fact) && typeof fact.value === "number" ? fact.value : null;

const textValue = (fact: Fact | undefined): string | null =>
  hasKnownValue(fact) && typeof fact.value === "string" ? fact.value : null;

const addUsedFact = (
  context: EvaluationContext,
  path: FactPath,
  fact: Fact | undefined,
) => {
  if (!hasKnownValue(fact)) return;
  context.facts.push({
    fact_path: path,
    value: fact.value,
    ...(fact.unit ? { unit: fact.unit } : {}),
    origin: fact.origin,
    confirmation: fact.confirmation,
    evidence: canonicalEvidence(fact.evidence),
  });
};

const evidenceFromFacts = (
  facts: readonly (Fact | undefined)[],
): ConfiguratorEvidence[] =>
  canonicalEvidence(
    facts.flatMap((fact) => fact?.evidence ?? []),
  );

const addCriterion = (
  context: EvaluationContext,
  input: AddCriterionInput,
) => {
  const facts = input.facts ?? [];
  for (const fact of facts) addUsedFact(context, fact.path, fact.fact);
  const decisive = input.decisive ?? true;

  context.criteria.push({
    code: input.code,
    label: input.label,
    status: input.status,
    blocking: input.blocking,
    expected: input.expected,
    observed: input.observed,
    ...(input.unit ? { unit: input.unit } : {}),
    explanation: input.explanation,
    evidence: evidenceFromFacts(facts.map(({ fact }) => fact)),
    affected_by_issue_codes: [],
  });
  context.rules.push({
    rule_code: input.ruleCode,
    ...MOTOR_COMPATIBILITY_RULESET,
    status: input.status,
    decisive,
    fact_paths: [...new Set(input.factPaths)].sort(),
  });
  if (!decisive) return;
  const target = input.axis === "electrical"
    ? context.electricalStatuses
    : context.applicationStatuses;
  target.push(input.status);
};

const addAction = (
  target: RequiredAction[],
  code: string,
  label: string,
  explanation: string,
  facts: readonly (Fact | undefined)[],
) => {
  target.push({
    code,
    label,
    explanation,
    evidence: evidenceFromFacts(facts),
  });
};

const markMissing = (
  context: EvaluationContext,
  path: FactPath,
  fact: Fact | undefined,
) => {
  if (!hasKnownValue(fact)) context.missing.add(path);
};

export const aggregateMotorCompatibilityStatuses = (
  statuses: readonly CriterionStatus[],
): CriterionStatus =>
  statuses.reduce<CriterionStatus>(
    (result, status) =>
      STATUS_PRIORITY[status] > STATUS_PRIORITY[result] ? status : result,
    "satisfied",
  );

const evaluateExactElectricalCriterion = (
  context: EvaluationContext,
  input: {
    code: "POWER" | "POLES" | "FREQUENCY" | "SUPPLY_MODE";
    label: string;
    path: FactPath;
    existing: Fact | undefined;
    candidate: Fact | undefined;
    unit?: string;
  },
) => {
  const expected = scalarValue(input.existing);
  const observed = scalarValue(input.candidate);
  markMissing(context, input.path, input.existing);
  markMissing(context, input.path, input.candidate);
  const status: CriterionStatus = expected === null || observed === null
    ? "indeterminate"
    : expected === observed
    ? "satisfied"
    : "not_satisfied";
  const explanation = status === "satisfied"
    ? `${input.label} identique et prouvee.`
    : status === "not_satisfied"
    ? `${input.label} differente : une adaptation electrique est necessaire.`
    : `${input.label} non publiee ou absente : aucune compatibilite n est supposee.`;

  addCriterion(context, {
    axis: "electrical",
    code: input.code,
    label: input.label,
    status,
    blocking: true,
    expected,
    observed,
    ...(input.unit ? { unit: input.unit } : {}),
    explanation,
    ruleCode: input.code,
    factPaths: [input.path],
    facts: [
      { path: input.path, fact: input.existing },
      { path: input.path, fact: input.candidate },
    ],
  });
  if (status === "not_satisfied") {
    addAction(
      context.adaptations,
      `ADAPT_${input.code}`,
      `Adapter ${input.label.toLowerCase()}`,
      explanation,
      [input.existing, input.candidate],
    );
  } else if (status === "indeterminate") {
    addAction(
      context.checks,
      `CHECK_${input.code}_DATA`,
      `Verifier ${input.label.toLowerCase()}`,
      explanation,
      [input.existing, input.candidate],
    );
  }
};

const evaluateVoltageCoupling = (
  context: EvaluationContext,
  existing: MotorElectricalSpec,
  candidate: MotorElectricalSpec,
) => {
  const network = existing.network as Fact;
  const existingVoltage = existing.voltage_v as Fact | undefined;
  const existingCoupling = existing.coupling as Fact | undefined;
  const candidateVoltage = candidate.voltage_v as Fact | undefined;
  const candidateCoupling = candidate.coupling as Fact | undefined;
  const networkValue = textValue(network);
  const expectedVoltage = numericValue(existingVoltage);
  const expectedCoupling = textValue(existingCoupling);
  const observedVoltage = numericValue(candidateVoltage);
  const observedCoupling = textValue(candidateCoupling);

  markMissing(context, "electrical.network", network);
  markMissing(context, "electrical.voltage_v", existingVoltage);
  markMissing(context, "electrical.coupling", existingCoupling);
  markMissing(context, "electrical.voltage_v", candidateVoltage);
  markMissing(context, "electrical.coupling", candidateCoupling);

  const complete = networkValue !== null &&
    expectedVoltage !== null &&
    expectedCoupling !== null &&
    observedVoltage !== null &&
    observedCoupling !== null;
  const satisfied = complete &&
    expectedVoltage === observedVoltage &&
    expectedCoupling === observedCoupling;
  const status: CriterionStatus = !complete
    ? "indeterminate"
    : satisfied
    ? "satisfied"
    : "not_satisfied";
  const expected = expectedVoltage === null || expectedCoupling === null
    ? null
    : `${expectedVoltage} V ${expectedCoupling}`;
  const observed = observedVoltage === null || observedCoupling === null
    ? null
    : `${observedVoltage} V ${observedCoupling}`;
  const explanation = status === "satisfied"
    ? "La tension et le couplage candidats correspondent au reseau fourni."
    : status === "not_satisfied"
    ? "La tension ou le couplage candidat ne correspond pas au reseau fourni."
    : "Le reseau, la tension ou le couplage n est pas publie : la compatibilite reste indeterminee.";
  const facts = [
    network,
    existingVoltage,
    existingCoupling,
    candidateVoltage,
    candidateCoupling,
  ];

  addCriterion(context, {
    axis: "electrical",
    code: "VOLTAGE_COUPLING",
    label: "Tension et couplage reseau",
    status,
    blocking: true,
    expected,
    observed,
    explanation,
    ruleCode: "VOLTAGE_COUPLING",
    factPaths: [
      "electrical.network",
      "electrical.voltage_v",
      "electrical.coupling",
    ],
    facts: [
      { path: "electrical.network", fact: network },
      { path: "electrical.voltage_v", fact: existingVoltage },
      { path: "electrical.coupling", fact: existingCoupling },
      { path: "electrical.voltage_v", fact: candidateVoltage },
      { path: "electrical.coupling", fact: candidateCoupling },
    ],
  });
  if (status === "not_satisfied") {
    addAction(
      context.adaptations,
      "ADAPT_VOLTAGE_COUPLING",
      "Adapter la tension ou le couplage",
      explanation,
      facts,
    );
  } else if (status === "indeterminate") {
    addAction(
      context.checks,
      "CHECK_VOLTAGE_COUPLING_DATA",
      "Verifier le reseau, la tension et le couplage",
      explanation,
      facts,
    );
  }
};

const addInformativeCriterion = (
  context: EvaluationContext,
  input: {
    code: string;
    label: string;
    ruleCode: RuleCode;
    path: FactPath;
    existing: Fact | undefined;
    candidate: Fact | undefined;
    unit?: string;
    explanation: string;
  },
) => {
  if (!hasKnownValue(input.existing) || !hasKnownValue(input.candidate)) return;
  addCriterion(context, {
    axis: "electrical",
    code: input.code,
    label: input.label,
    status: "satisfied",
    blocking: false,
    expected: input.existing.value,
    observed: input.candidate.value,
    ...(input.unit ? { unit: input.unit } : {}),
    explanation: input.explanation,
    ruleCode: input.ruleCode,
    factPaths: [input.path],
    facts: [
      { path: input.path, fact: input.existing },
      { path: input.path, fact: input.candidate },
    ],
    decisive: false,
  });
};

const evaluateElectricalInformation = (
  context: EvaluationContext,
  input: MotorElectricalApplicationCompatibilityInput,
) => {
  const existing = input.existing.electrical;
  const candidate = input.candidate.electrical;
  const existingCurrent = existing.rated_current_a as Fact | undefined;
  const candidateCurrent = candidate.rated_current_a as Fact | undefined;
  const currentHigher = numericValue(existingCurrent) !== null &&
    numericValue(candidateCurrent) !== null &&
    numericValue(candidateCurrent)! > numericValue(existingCurrent)!;
  addInformativeCriterion(context, {
    code: "CURRENT_INFORMATION",
    label: "Courant nominal",
    ruleCode: "CURRENT_INFORMATION",
    path: "electrical.rated_current_a",
    existing: existingCurrent,
    candidate: candidateCurrent,
    unit: "A",
    explanation: currentHigher
      ? "Le courant candidat est superieur ; verifier la protection et la chute de tension."
      : "Le courant nominal est conserve comme information de dimensionnement.",
  });
  if (currentHigher) {
    addAction(
      context.checks,
      "CHECK_SUPPLY_PROTECTION",
      "Verifier la protection et la chute de tension",
      "Le courant candidat est superieur au courant existant.",
      [existingCurrent, candidateCurrent],
    );
  }

  const existingTorque = existing.rated_torque_nm as Fact | undefined;
  const candidateTorque = candidate.rated_torque_nm as Fact | undefined;
  const torqueLower = numericValue(existingTorque) !== null &&
    numericValue(candidateTorque) !== null &&
    numericValue(candidateTorque)! < numericValue(existingTorque)!;
  addInformativeCriterion(context, {
    code: "TORQUE_INFORMATION",
    label: "Couple nominal informe",
    ruleCode: "TORQUE_INFORMATION",
    path: "electrical.rated_torque_nm",
    existing: existingTorque,
    candidate: candidateTorque,
    unit: "N.m",
    explanation: torqueLower
      ? "Le couple candidat est inferieur ; cet ecart reste informatif sans exigence explicite."
      : "Le couple nominal est conserve comme information applicative.",
  });

  const torqueRequirement = input.torqueRequirement as Fact | undefined;
  if (torqueRequirement !== undefined) {
    const requiredTorque = numericValue(torqueRequirement);
    const observedTorque = numericValue(candidateTorque);
    markMissing(context, "electrical.rated_torque_nm", torqueRequirement);
    markMissing(context, "electrical.rated_torque_nm", candidateTorque);
    const status: CriterionStatus =
      requiredTorque === null || observedTorque === null
        ? "indeterminate"
        : observedTorque >= requiredTorque
        ? "satisfied"
        : "not_satisfied";
    const explanation = status === "satisfied"
      ? "Le couple candidat satisfait l exigence explicite."
      : status === "not_satisfied"
      ? "Le couple candidat est inferieur a l exigence explicite."
      : "Le couple requis ou candidat n est pas publie.";
    addCriterion(context, {
      axis: "electrical",
      code: "TORQUE_REQUIREMENT",
      label: "Exigence explicite de couple",
      status,
      blocking: true,
      expected: requiredTorque,
      observed: observedTorque,
      unit: "N.m",
      explanation,
      ruleCode: "TORQUE_INFORMATION",
      factPaths: ["electrical.rated_torque_nm"],
      facts: [
        { path: "electrical.rated_torque_nm", fact: torqueRequirement },
        { path: "electrical.rated_torque_nm", fact: candidateTorque },
      ],
    });
    if (status === "not_satisfied") {
      addAction(
        context.adaptations,
        "ADAPT_TORQUE_REQUIREMENT",
        "Adapter le couple disponible",
        explanation,
        [torqueRequirement, candidateTorque],
      );
    } else if (status === "indeterminate") {
      addAction(
        context.checks,
        "CHECK_TORQUE_REQUIREMENT",
        "Verifier le couple requis et disponible",
        explanation,
        [torqueRequirement, candidateTorque],
      );
    }
  }

  const existingEfficiency = existing.efficiency_class as Fact | undefined;
  const candidateEfficiency = candidate.efficiency_class as Fact | undefined;
  const efficiencyDifferent = textValue(existingEfficiency) !== null &&
    textValue(candidateEfficiency) !== null &&
    textValue(existingEfficiency) !== textValue(candidateEfficiency);
  addInformativeCriterion(context, {
    code: "EFFICIENCY_INFORMATION",
    label: "Classe de rendement",
    ruleCode: "EFFICIENCY_INFORMATION",
    path: "electrical.efficiency_class",
    existing: existingEfficiency,
    candidate: candidateEfficiency,
    explanation: efficiencyDifferent
      ? "La classe de rendement differe ; l ecart est reserve a la future comparaison energetique."
      : "La classe de rendement est conservee comme information energetique.",
  });

  const existingSpeed = existing.speed_rpm as Fact | undefined;
  const candidateSpeed = candidate.speed_rpm as Fact | undefined;
  const speedDifferent = numericValue(existingSpeed) !== null &&
    numericValue(candidateSpeed) !== null &&
    numericValue(existingSpeed) !== numericValue(candidateSpeed);
  const samePolesAndFrequency =
    scalarValue(existing.poles as Fact | undefined) ===
      scalarValue(candidate.poles as Fact | undefined) &&
    scalarValue(existing.frequency_hz as Fact) ===
      scalarValue(candidate.frequency_hz as Fact);
  addInformativeCriterion(context, {
    code: "SPEED_INFORMATION",
    label: "Vitesse nominale",
    ruleCode: "SPEED_INFORMATION",
    path: "electrical.speed_rpm",
    existing: existingSpeed,
    candidate: candidateSpeed,
    unit: "rpm",
    explanation: speedDifferent && samePolesAndFrequency
      ? "A poles et frequence identiques, l ecart de vitesse informe sur le glissement."
      : "La vitesse nominale reste une information non bloquante.",
  });
  if (speedDifferent && samePolesAndFrequency) {
    addAction(
      context.checks,
      "CHECK_SPEED_SLIP",
      "Verifier l effet du glissement",
      "La vitesse differe a nombre de poles et frequence identiques.",
      [existingSpeed, candidateSpeed],
    );
  }
};

const canonicalText = (value: string): string =>
  value.trim().replace(/\s+/g, " ").toUpperCase();

const ipComponents = (value: string): [number, number] | null => {
  const match = /^IP([0-6])([0-9])$/i.exec(value.trim());
  return match ? [Number(match[1]), Number(match[2])] : null;
};

const isIpSatisfied = (
  candidate: string,
  requirement: string,
): boolean | null => {
  const candidateIp = ipComponents(candidate);
  const requirementIp = ipComponents(requirement);
  if (!candidateIp || !requirementIp) {
    return canonicalText(candidate) === canonicalText(requirement)
      ? true
      : null;
  }
  return candidateIp[0] >= requirementIp[0] &&
    candidateIp[1] >= requirementIp[1];
};

const evaluateApplicationRequirement = (
  context: EvaluationContext,
  input: {
    code: string;
    label: string;
    path: FactPath;
    requirement: Fact | undefined;
    candidate: Fact | undefined;
    unit?: string;
    comparator: (
      candidate: string | number | boolean,
      requirement: string | number | boolean,
    ) => boolean | null;
  },
) => {
  if (!hasKnownValue(input.requirement)) return;
  const observed = scalarValue(input.candidate);
  markMissing(context, input.path, input.candidate);
  const comparison = observed === null
    ? null
    : input.comparator(observed, input.requirement.value);
  const status: CriterionStatus = comparison === null
    ? "indeterminate"
    : comparison
    ? "satisfied"
    : "not_satisfied";
  const explanation = status === "satisfied"
    ? `${input.label} satisfaite.`
    : status === "not_satisfied"
    ? `${input.label} publiee mais insuffisante.`
    : `${input.label} candidate absente, non publiee ou non interpretable.`;

  addCriterion(context, {
    axis: "application",
    code: input.code,
    label: input.label,
    status,
    blocking: true,
    expected: input.requirement.value,
    observed,
    ...(input.unit ? { unit: input.unit } : {}),
    explanation,
    ruleCode: "APPLICATION_REQUIREMENT",
    factPaths: [input.path],
    facts: [
      { path: input.path, fact: input.requirement },
      { path: input.path, fact: input.candidate },
    ],
  });
  if (status === "not_satisfied") {
    addAction(
      context.adaptations,
      `ADAPT_${input.code}`,
      `Adapter ${input.label.toLowerCase()}`,
      explanation,
      [input.requirement, input.candidate],
    );
  } else if (status === "indeterminate") {
    addAction(
      context.checks,
      `CHECK_${input.code}`,
      `Verifier ${input.label.toLowerCase()}`,
      explanation,
      [input.requirement, input.candidate],
    );
  }
};

const evaluateApplication = (
  context: EvaluationContext,
  requirements: MotorApplicationRequirements | undefined,
  candidate: MotorApplicationRequirements | undefined,
) => {
  if (!requirements) return;
  const textComparator = (
    observed: string | number | boolean,
    expected: string | number | boolean,
  ): boolean | null =>
    typeof observed === "string" && typeof expected === "string"
      ? canonicalText(observed) === canonicalText(expected)
      : null;
  const minimumComparator = (
    observed: string | number | boolean,
    expected: string | number | boolean,
  ): boolean | null =>
    typeof observed === "number" && typeof expected === "number"
      ? observed >= expected
      : null;
  const requiredBooleanComparator = (
    observed: string | number | boolean,
    expected: string | number | boolean,
  ): boolean | null =>
    typeof observed === "boolean" && typeof expected === "boolean"
      ? expected === false || observed === true
      : null;

  evaluateApplicationRequirement(context, {
    code: "APPLICATION_IP_RATING",
    label: "Exigence d indice IP",
    path: "application.ip_rating",
    requirement: requirements.ip_rating as Fact | undefined,
    candidate: candidate?.ip_rating as Fact | undefined,
    comparator: (observed, expected) =>
      typeof observed === "string" && typeof expected === "string"
        ? isIpSatisfied(observed, expected)
        : null,
  });
  evaluateApplicationRequirement(context, {
    code: "APPLICATION_BRAKE",
    label: "Exigence de frein",
    path: "application.brake_required",
    requirement: requirements.brake_required as Fact | undefined,
    candidate: candidate?.brake_required as Fact | undefined,
    comparator: requiredBooleanComparator,
  });
  evaluateApplicationRequirement(context, {
    code: "APPLICATION_VFD",
    label: "Exigence de variateur",
    path: "application.vfd_required",
    requirement: requirements.vfd_required as Fact | undefined,
    candidate: candidate?.vfd_required as Fact | undefined,
    comparator: requiredBooleanComparator,
  });
  evaluateApplicationRequirement(context, {
    code: "APPLICATION_COOLING",
    label: "Exigence de refroidissement",
    path: "application.cooling_method",
    requirement: requirements.cooling_method as Fact | undefined,
    candidate: candidate?.cooling_method as Fact | undefined,
    comparator: textComparator,
  });
  evaluateApplicationRequirement(context, {
    code: "APPLICATION_DUTY",
    label: "Exigence de service",
    path: "application.duty_service",
    requirement: requirements.duty_service as Fact | undefined,
    candidate: candidate?.duty_service as Fact | undefined,
    comparator: textComparator,
  });
  evaluateApplicationRequirement(context, {
    code: "APPLICATION_AMBIENT_TEMPERATURE",
    label: "Exigence de temperature ambiante",
    path: "application.ambient_temperature",
    requirement: requirements.ambient_temperature as Fact | undefined,
    candidate: candidate?.ambient_temperature as Fact | undefined,
    unit: "degC",
    comparator: minimumComparator,
  });
  evaluateApplicationRequirement(context, {
    code: "APPLICATION_STARTS_PER_HOUR",
    label: "Exigence de demarrages par heure",
    path: "application.starts_per_hour",
    requirement: requirements.starts_per_hour as Fact | undefined,
    candidate: candidate?.starts_per_hour as Fact | undefined,
    unit: "count",
    comparator: minimumComparator,
  });
};

export const evaluateMotorElectricalApplicationCompatibility = (
  input: MotorElectricalApplicationCompatibilityInput,
): MotorElectricalApplicationCompatibilityResult => {
  const context: EvaluationContext = {
    criteria: [],
    adaptations: [],
    checks: [],
    facts: [],
    rules: [],
    missing: new Set<FactPath>(),
    electricalStatuses: [],
    applicationStatuses: [],
  };
  const existing = input.existing.electrical;
  const candidate = input.candidate.electrical;

  evaluateExactElectricalCriterion(context, {
    code: "POWER",
    label: "Puissance nominale",
    path: "electrical.power_kw",
    existing: existing.power_kw as Fact,
    candidate: candidate.power_kw as Fact,
    unit: "kW",
  });
  evaluateExactElectricalCriterion(context, {
    code: "POLES",
    label: "Nombre de poles",
    path: "electrical.poles",
    existing: existing.poles as Fact | undefined,
    candidate: candidate.poles as Fact | undefined,
  });
  evaluateExactElectricalCriterion(context, {
    code: "FREQUENCY",
    label: "Frequence",
    path: "electrical.frequency_hz",
    existing: existing.frequency_hz as Fact,
    candidate: candidate.frequency_hz as Fact,
    unit: "Hz",
  });
  evaluateExactElectricalCriterion(context, {
    code: "SUPPLY_MODE",
    label: "Mode d alimentation",
    path: "electrical.supply_mode",
    existing: existing.supply_mode as Fact,
    candidate: candidate.supply_mode as Fact,
  });
  evaluateVoltageCoupling(context, existing, candidate);
  evaluateElectricalInformation(context, input);
  evaluateApplication(
    context,
    input.applicationRequirements,
    input.candidate.application,
  );

  return {
    ...MOTOR_COMPATIBILITY_RULESET,
    electrical_status: aggregateMotorCompatibilityStatuses(
      context.electricalStatuses,
    ),
    application_status: aggregateMotorCompatibilityStatuses(
      context.applicationStatuses,
    ),
    criteria: dedupeAndSort(context.criteria),
    adaptations_required: dedupeAndSort(context.adaptations),
    checks_required: dedupeAndSort(context.checks),
    facts_used: dedupeAndSort(context.facts),
    rules_applied: dedupeAndSort(context.rules),
    missing_facts: [...context.missing].sort(),
  };
};
