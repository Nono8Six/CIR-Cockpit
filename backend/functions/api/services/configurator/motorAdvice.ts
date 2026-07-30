import type {
  MotorAdviceInput,
  MotorAdviceResponse,
} from "../../../../../shared/schemas/configurator/motor.schema.ts";
import {
  MOTOR_COMPATIBILITY_RULESET,
  safeParseMotorAdviceInput,
  safeParseMotorAdviceOutput,
} from "../../../../../shared/schemas/configurator/motor.schema.ts";
import {
  configuratorInvalidPayload,
  configuratorOutputInvalid,
} from "./configuratorErrors.ts";
import {
  canonicalMotorEvidence,
  motorRuleEvidence,
  stableMotorValue,
} from "./motorC3Determinism.ts";

type Advice = MotorAdviceResponse["advice"][number];

const parseInput = <T>(
  result: { success: true; data: T } | { success: false; error: unknown },
): T => {
  if (!result.success) throw configuratorInvalidPayload(result.error);
  return result.data;
};

const severityRank: Readonly<Record<Advice["severity"], number>> = {
  critical: 0,
  warning: 1,
  info: 2,
};

const categoryRank: Readonly<Record<Advice["category"], number>> = {
  mechanical: 0,
  electrical: 1,
  application: 2,
  quality: 3,
  energy: 4,
};

const canonicalStrings = <T extends string>(values: readonly T[]): T[] =>
  [...new Set(values)].sort((left, right) => left.localeCompare(right));

const mergeAdvice = (left: Advice, right: Advice): Advice => {
  const preferred = severityRank[left.severity] < severityRank[right.severity]
    ? left
    : severityRank[right.severity] < severityRank[left.severity]
    ? right
    : stableMotorValue(left).localeCompare(stableMotorValue(right)) <= 0
    ? left
    : right;
  return {
    ...preferred,
    source_criterion_codes: canonicalStrings([
      ...left.source_criterion_codes,
      ...right.source_criterion_codes,
    ]),
    source_issue_codes: canonicalStrings([
      ...left.source_issue_codes,
      ...right.source_issue_codes,
    ]),
    missing_facts: canonicalStrings([
      ...left.missing_facts,
      ...right.missing_facts,
    ]),
    evidence: canonicalMotorEvidence([...left.evidence, ...right.evidence]),
  };
};

const categoryFromCode = (code: string): Advice["category"] => {
  if (
    code.includes("CURRENT") ||
    code.includes("VOLTAGE") ||
    code.includes("SUPPLY") ||
    code.includes("POWER") ||
    code.includes("POLES") ||
    code.includes("FREQUENCY")
  ) return "electrical";
  if (code.includes("APPLICATION")) return "application";
  if (code.includes("ENERGY") || code.includes("EFFICIENCY")) return "energy";
  return "mechanical";
};

const adviceEvidence = (
  code: string,
  label: string,
  evidence: Advice["evidence"],
): Advice["evidence"] =>
  canonicalMotorEvidence(
    evidence.length > 0 ? evidence : [motorRuleEvidence(label, code)],
  );

const createAdvice = (
  input: Omit<Advice, "ruleset" | "evidence"> & {
    evidence: Advice["evidence"];
  },
): Advice => ({
  ...input,
  source_criterion_codes: [...new Set(input.source_criterion_codes)].sort(),
  source_issue_codes: [...new Set(input.source_issue_codes)].sort(),
  missing_facts: [...new Set(input.missing_facts)].sort(),
  ruleset: MOTOR_COMPATIBILITY_RULESET,
  evidence: adviceEvidence(input.code, input.label, input.evidence),
});

const specialIssueAdvice = (
  issue: MotorAdviceInput["candidate"]["issues"][number],
  energyUsesCurve: boolean,
): Advice | null => {
  if (issue.code === "CURRENT_MISMATCH") {
    return createAdvice({
      code: "CURRENT_MISMATCH",
      severity: "warning",
      category: "electrical",
      label: "Verifier la protection et la chute de tension",
      explanation: "Le courant publie porte une alerte de coherence catalogue.",
      action:
        "Relire tension, couplage, frequence et courant sur la meme ligne constructeur avant le dimensionnement.",
      source_criterion_codes: ["CURRENT_INFORMATION"],
      source_issue_codes: [issue.code],
      missing_facts: [],
      evidence: issue.evidence,
    });
  }
  if (issue.code === "IE_BELOW_THRESHOLD") {
    return createAdvice({
      code: "IE_BELOW_THRESHOLD",
      severity: "warning",
      category: "quality",
      label: "Ne pas affirmer la classe IE",
      explanation:
        "Le rendement publie est sous le seuil de classe journalise.",
      action:
        "Requalifier le point, le seuil applicable et la classe avant toute affirmation.",
      source_criterion_codes: ["EFFICIENCY_INFORMATION"],
      source_issue_codes: [issue.code],
      missing_facts: [],
      evidence: issue.evidence,
    });
  }
  if (issue.code === "EFFICIENCY_CURVE") {
    return createAdvice({
      code: "EFFICIENCY_CURVE",
      severity: energyUsesCurve ? "warning" : "info",
      category: "energy",
      label: "Verifier la courbe de rendement",
      explanation: energyUsesCurve
        ? "Le calcul energetique utilise le point de fonctionnement dont la courbe porte une alerte."
        : "La courbe de rendement porte une alerte, sans calcul energetique fourni.",
      action:
        "Verifier les colonnes de charge et le rattachement au point de fonctionnement avant de conclure.",
      source_criterion_codes: ["EFFICIENCY_INFORMATION"],
      source_issue_codes: [issue.code],
      missing_facts: [],
      evidence: issue.evidence,
    });
  }
  if (issue.code === "INERTIA_IMPLAUSIBLE") {
    return createAdvice({
      code: "INERTIA_IMPLAUSIBLE",
      severity: "warning",
      category: "quality",
      label: "Ne pas conclure sur le rapport d inertie",
      explanation: "L inertie catalogue porte une alerte de plausibilite.",
      action:
        "Confirmer l unite, la variante et la valeur constructeur avant tout calcul fonde sur l inertie.",
      source_criterion_codes: [],
      source_issue_codes: [issue.code],
      missing_facts: [],
      evidence: issue.evidence,
    });
  }
  return null;
};

export const buildMotorAdvice = (
  input: MotorAdviceInput,
): MotorAdviceResponse => {
  const advice: Advice[] = [];
  for (const adaptation of input.candidate.adaptations_required) {
    advice.push(createAdvice({
      code: adaptation.code,
      severity: "critical",
      category: categoryFromCode(adaptation.code),
      label: adaptation.label,
      explanation: adaptation.explanation,
      action: adaptation.label,
      source_criterion_codes: input.candidate.criteria
        .filter((criterion) => criterion.status === "not_satisfied")
        .map((criterion) => criterion.code),
      source_issue_codes: [],
      missing_facts: [],
      evidence: adaptation.evidence,
    }));
  }
  for (const check of input.candidate.checks_required) {
    advice.push(createAdvice({
      code: check.code,
      severity: "warning",
      category: categoryFromCode(check.code),
      label: check.label,
      explanation: check.explanation,
      action: check.label,
      source_criterion_codes: input.candidate.criteria
        .filter((criterion) =>
          criterion.status === "under_reservation" ||
          criterion.status === "indeterminate"
        )
        .map((criterion) => criterion.code),
      source_issue_codes: [],
      missing_facts: [],
      evidence: check.evidence,
    }));
  }
  for (const factPath of input.candidate.missing_facts) {
    advice.push(createAdvice({
      code: `MEASURE_${factPath.replaceAll(".", "_").toUpperCase()}`,
      severity: "warning",
      category: factPath.startsWith("electrical.")
        ? "electrical"
        : factPath.startsWith("application.")
        ? "application"
        : "mechanical",
      label: "Completer la donnee manquante",
      explanation: `La donnee decisive ${factPath} est absente ou non publiee.`,
      action: "Mesurer ou obtenir la valeur sourcee avant de conclure.",
      source_criterion_codes: input.candidate.criteria
        .filter((criterion) => criterion.status === "indeterminate")
        .map((criterion) => criterion.code),
      source_issue_codes: [],
      missing_facts: [factPath],
      evidence: [motorRuleEvidence(
        "Donnee decisive manquante",
        "MISSING_DECISIVE_FACT",
        [{ key: "fact_path", value: factPath }],
      )],
    }));
  }
  const energyUsesCurve =
    input.energy?.load_results.some((result) =>
      result.affected_by_issue_codes.includes("EFFICIENCY_CURVE")
    ) ?? false;
  for (const issue of input.candidate.issues) {
    const special = specialIssueAdvice(issue, energyUsesCurve);
    if (special) advice.push(special);
  }
  for (const restriction of input.energy?.restrictions ?? []) {
    if (advice.some((item) => item.code === restriction.code)) continue;
    advice.push(createAdvice({
      code: restriction.code,
      severity: "warning",
      category: "energy",
      label: restriction.label,
      explanation: restriction.explanation,
      action: restriction.label,
      source_criterion_codes: ["EFFICIENCY_INFORMATION"],
      source_issue_codes: [restriction.code],
      missing_facts: [],
      evidence: restriction.evidence,
    }));
  }

  const unique = new Map<string, Advice>();
  for (const item of advice) {
    const existing = unique.get(item.code);
    unique.set(item.code, existing ? mergeAdvice(existing, item) : item);
  }
  const result: MotorAdviceResponse = {
    ...MOTOR_COMPATIBILITY_RULESET,
    candidate: {
      model_key: input.candidate.candidate.model_key,
      variant_key: input.candidate.candidate.variant_key,
      operating_point_id: input.candidate.candidate.operating_point_id,
    },
    advice: [...unique.values()].sort((left, right) =>
      severityRank[left.severity] - severityRank[right.severity] ||
      categoryRank[left.category] - categoryRank[right.category] ||
      left.code.localeCompare(right.code) ||
      stableMotorValue(left).localeCompare(stableMotorValue(right))
    ),
  };
  return result;
};

export const motorAdviceService = {
  build: (rawInput: unknown): MotorAdviceResponse => {
    const input = parseInput(safeParseMotorAdviceInput(rawInput));
    const output = buildMotorAdvice(input);
    const parsed = safeParseMotorAdviceOutput(output);
    if (!parsed.success) throw configuratorOutputInvalid(parsed.error);
    return parsed.data;
  },
};
