import type {
  ConfiguratorEvidence,
  CriterionStatus,
} from "../../../../../shared/schemas/configurator/common.schema.ts";

export const MOTOR_STATUS_RANK: Readonly<Record<CriterionStatus, number>> = {
  satisfied: 0,
  under_reservation: 1,
  indeterminate: 2,
  not_satisfied: 3,
};

export const stableMotorValue = (value: unknown): string => {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) {
    return `[${value.map(stableMotorValue).join(",")}]`;
  }
  const record = value as Record<string, unknown>;
  return `{${
    Object.keys(record).sort().map((key) =>
      `${JSON.stringify(key)}:${stableMotorValue(record[key])}`
    ).join(",")
  }}`;
};

export const canonicalMotorList = <T>(items: readonly T[]): T[] => {
  const keyed = new Map<string, T>();
  for (const item of items) keyed.set(stableMotorValue(item), item);
  return [...keyed.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([, item]) => item);
};

export const canonicalMotorEvidence = (
  evidence: readonly ConfiguratorEvidence[],
): ConfiguratorEvidence[] => canonicalMotorList(evidence);

export const aggregateMotorStatuses = (
  statuses: readonly CriterionStatus[],
): CriterionStatus =>
  statuses.reduce<CriterionStatus>(
    (result, status) =>
      MOTOR_STATUS_RANK[status] > MOTOR_STATUS_RANK[result] ? status : result,
    "satisfied",
  );

export const motorRuleEvidence = (
  label: string,
  ruleCode: string,
  inputs: Array<{
    key: string;
    value: string | number | boolean | null;
    unit?: string;
  }> = [],
): ConfiguratorEvidence => ({
  kind: "rule",
  label,
  rule_code: ruleCode,
  inputs,
});
