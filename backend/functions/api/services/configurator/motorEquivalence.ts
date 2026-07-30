import type {
  MotorCatalogGetInput,
  MotorCatalogGetResponse,
  MotorCatalogListInput,
  MotorCatalogListResponse,
  MotorEquivalentCandidateResult,
  MotorEquivalentFromMotorInput,
  MotorEquivalentFromSpecInput,
  MotorEquivalentFromSpecResponse,
} from "../../../../../shared/schemas/configurator/motor.schema.ts";
import {
  MOTOR_COMPATIBILITY_RULESET,
  safeParseMotorEquivalentFromMotorInput,
  safeParseMotorEquivalentFromSpecInput,
  safeParseMotorEquivalentOutput,
} from "../../../../../shared/schemas/configurator/motor.schema.ts";
import type { AuthContext } from "../../types.ts";
import {
  configuratorInvalidPayload,
  configuratorOutputInvalid,
} from "./configuratorErrors.ts";
import {
  getMotorCatalogInTransaction,
  listMotorCatalogInTransaction,
} from "./motorCatalog.ts";
import { normalizeMotorCatalog } from "./motorCatalogNormalization.ts";
import {
  aggregateMotorStatuses,
  canonicalMotorEvidence,
  canonicalMotorList,
  MOTOR_STATUS_RANK,
  stableMotorValue,
} from "./motorC3Determinism.ts";
import {
  evaluateMotorElectricalApplicationCompatibility,
} from "./motorElectricalApplicationCompatibility.ts";
import { evaluateMotorMechanicalCompatibility } from "./motorMechanicalCompatibility.ts";
import {
  type ConfiguratorReadOperation,
  type ConfiguratorReadTransaction,
  runConfiguratorReadOnly,
} from "./configuratorReadExecutor.ts";

type ReadOnlyRunner = <T>(
  authContext: AuthContext,
  operation: ConfiguratorReadOperation<T>,
) => Promise<T>;

type EquivalentSpec = MotorCatalogGetResponse["from_motor_spec"];
type CatalogIssue = MotorCatalogGetResponse["issues"][number];
type VerdictIssue = MotorEquivalentCandidateResult["issues"][number];

export type MotorEquivalenceCatalogReader = {
  list: (input: MotorCatalogListInput) => Promise<MotorCatalogListResponse>;
  get: (input: MotorCatalogGetInput) => Promise<MotorCatalogGetResponse>;
};

type ReaderFactory = (
  transaction: ConfiguratorReadTransaction,
  requestId: string,
) => MotorEquivalenceCatalogReader;

const createCatalogReader: ReaderFactory = (transaction, requestId) => ({
  list: (input) => listMotorCatalogInTransaction(transaction, input, requestId),
  get: (input) => getMotorCatalogInTransaction(transaction, input, requestId),
});

const parseInput = <T>(
  result: { success: true; data: T } | { success: false; error: unknown },
): T => {
  if (!result.success) throw configuratorInvalidPayload(result.error);
  return result.data;
};

const verdictIssue = (issue: CatalogIssue): VerdictIssue => ({
  code: issue.code,
  severity: issue.severity,
  message: issue.message,
  restriction: issue.restriction,
  evidence: issue.evidence,
});

const issueCriterionCodes: Readonly<Record<string, readonly string[]>> = {
  CURRENT_MISMATCH: ["CURRENT_INFORMATION"],
  IE_BELOW_THRESHOLD: ["EFFICIENCY_INFORMATION"],
  EFFICIENCY_CURVE: ["EFFICIENCY_INFORMATION"],
};

const applyIssuesToCriteria = (
  criteria: MotorEquivalentCandidateResult["criteria"],
  issues: readonly VerdictIssue[],
): MotorEquivalentCandidateResult["criteria"] => {
  const byCriterion = new Map<string, Set<string>>();
  for (const issue of issues) {
    for (const criterionCode of issueCriterionCodes[issue.code] ?? []) {
      const codes = byCriterion.get(criterionCode) ?? new Set<string>();
      codes.add(issue.code);
      byCriterion.set(criterionCode, codes);
    }
  }
  return criteria.map((criterion) => ({
    ...criterion,
    affected_by_issue_codes: [
      ...new Set([
        ...criterion.affected_by_issue_codes,
        ...(byCriterion.get(criterion.code) ?? []),
      ]),
    ].sort(),
  }));
};

const candidateFlange = (
  detail: MotorCatalogGetResponse,
  flangeId: string | undefined,
) => {
  if (!flangeId) return null;
  const flange = detail.flange_options.find((item) => item.id === flangeId);
  if (!flange) return null;
  return {
    flange_option_id: flange.id,
    mounting: flange.mounting,
    role: flange.role,
    reference: flange.flange_ref,
    requires_option: flange.requires_option,
  };
};

const candidateVariants = (
  detail: MotorCatalogGetResponse,
  mounting: EquivalentSpec["mounting"],
) => {
  if (mounting === "B3") {
    return [{
      spec: detail.from_motor_spec,
      normalization: detail.normalization,
      matchedFlange: null,
    }];
  }
  const options = detail.flange_options
    .filter((flange) => flange.mounting === mounting)
    .sort((left, right) => Number(left.id) - Number(right.id));
  if (options.length === 0) {
    return [{
      spec: detail.from_motor_spec,
      normalization: detail.normalization,
      matchedFlange: null,
    }];
  }
  return options.map((flange) => {
    const normalized = normalizeMotorCatalog({
      snapshotId: detail.snapshot.id,
      model: detail.model,
      operatingPoint: detail.operating_point,
      dimensions: detail.dimensions,
      flangeOptions: detail.flange_options,
      selection: {
        operating_point_id: detail.operating_point.id,
        mounting,
        flange_option_id: flange.id,
      },
    });
    return {
      spec: normalized.spec,
      normalization: normalized.normalization,
      matchedFlange: candidateFlange(detail, flange.id),
    };
  });
};

const rankingValue = (
  sort: MotorEquivalentFromSpecInput["sort"],
  detail: MotorCatalogGetResponse,
  overallStatus: MotorEquivalentCandidateResult["overall_status"],
): string | number | null => {
  if (sort === "brand") return detail.model.brand;
  if (sort === "power") return detail.operating_point.power_kw;
  if (sort === "efficiency") return detail.operating_point.efficiency_class;
  return overallStatus;
};

const evaluateCandidate = (
  reference: EquivalentSpec,
  detail: MotorCatalogGetResponse,
  sort: MotorEquivalentFromSpecInput["sort"],
): MotorEquivalentCandidateResult => {
  const evaluated = candidateVariants(detail, reference.mounting).map(
    (variant) => {
      const mechanical = evaluateMotorMechanicalCompatibility({
        existing: reference,
        candidate: variant.spec,
        candidateFlange: variant.matchedFlange,
      });
      const electrical = evaluateMotorElectricalApplicationCompatibility({
        existing: reference,
        candidate: variant.spec,
        applicationRequirements: reference.application,
      });
      const issues = canonicalMotorList([
        ...detail.issues.map(verdictIssue),
        ...variant.normalization.issues,
      ]);
      const criteria = applyIssuesToCriteria(
        canonicalMotorList([...mechanical.criteria, ...electrical.criteria]),
        issues,
      );
      const adaptations = canonicalMotorList([
        ...mechanical.adaptations_required,
        ...electrical.adaptations_required,
      ]);
      const checks = canonicalMotorList([
        ...mechanical.checks_required,
        ...electrical.checks_required,
      ]);
      const facts = canonicalMotorList([
        ...mechanical.facts_used,
        ...electrical.facts_used,
      ]);
      const rules = canonicalMotorList([
        ...mechanical.rules_applied,
        ...electrical.rules_applied,
      ]);
      const missingFacts = [
        ...new Set([
          ...mechanical.missing_facts,
          ...electrical.missing_facts,
          ...variant.normalization.missing_facts,
        ]),
      ].sort();
      const overallStatus = aggregateMotorStatuses([
        mechanical.status,
        electrical.electrical_status,
        electrical.application_status,
      ]);
      const explanation = overallStatus === "not_satisfied"
        ? "Au moins un critere essentiel n est pas satisfait."
        : overallStatus === "indeterminate"
        ? "Au moins une donnee decisive est absente ou ambigue."
        : overallStatus === "under_reservation"
        ? "Le remplacement reste soumis aux reserves explicites."
        : "Tous les criteres essentiels applicables sont satisfaits.";
      const rankingEvidence = canonicalMotorEvidence([
        ...detail.model.evidence,
        ...detail.operating_point.evidence,
        ...facts.flatMap((fact) => fact.evidence),
      ]);
      return {
        candidate: {
          model_id: detail.model.id,
          model_key: detail.model.model_key,
          operating_point_id: detail.operating_point.id,
          brand: detail.model.brand,
          series: detail.model.series,
          designation: detail.model.designation,
          variant_key: detail.operating_point.variant_key,
          power_kw: detail.operating_point.power_kw,
          rated_speed_rpm: detail.operating_point.rated_speed_rpm,
          frequency_hz: detail.operating_point.frequency_hz,
          poles: detail.operating_point.poles,
          supply_mode: detail.operating_point.supply_mode,
          efficiency_class: detail.operating_point.efficiency_class,
          lifecycle: detail.model.lifecycle,
          data_grade: detail.operating_point.data_grade,
        },
        matched_flange: mechanical.matched_flange,
        ...MOTOR_COMPATIBILITY_RULESET,
        mechanical_status: mechanical.status,
        electrical_status: electrical.electrical_status,
        application_status: electrical.application_status,
        overall_status: overallStatus,
        explanation,
        criteria,
        adaptations_required: adaptations,
        checks_required: checks,
        facts_used: facts,
        rules_applied: rules,
        issues,
        missing_facts: missingFacts,
        ranking: {
          overall_status: overallStatus,
          mechanical_status: mechanical.status,
          reservation_count:
            criteria.filter((criterion) =>
              criterion.status === "under_reservation"
            ).length,
          missing_fact_count: missingFacts.length,
          requested_sort: sort,
          requested_sort_value: rankingValue(sort, detail, overallStatus),
          canonical_key: detail.operating_point.id.padStart(20, "0"),
          evidence: rankingEvidence,
        },
      } satisfies MotorEquivalentCandidateResult;
    },
  );

  return evaluated.sort((left, right) =>
    MOTOR_STATUS_RANK[left.mechanical_status] -
      MOTOR_STATUS_RANK[right.mechanical_status] ||
    left.ranking.reservation_count - right.ranking.reservation_count ||
    left.ranking.missing_fact_count - right.ranking.missing_fact_count ||
    (left.matched_flange?.flange_option_id ?? "").localeCompare(
      right.matched_flange?.flange_option_id ?? "",
    )
  )[0];
};

const compareRequestedSort = (
  left: MotorEquivalentCandidateResult,
  right: MotorEquivalentCandidateResult,
): number => {
  const sort = left.ranking.requested_sort;
  if (sort === "brand") {
    return String(left.ranking.requested_sort_value).localeCompare(
      String(right.ranking.requested_sort_value),
    );
  }
  if (sort === "power") {
    return Number(left.ranking.requested_sort_value) -
      Number(right.ranking.requested_sort_value);
  }
  if (sort === "efficiency") {
    const order = ["IE1", "IE2", "IE3", "IE4", "IE5"];
    const leftValue = left.ranking.requested_sort_value;
    const rightValue = right.ranking.requested_sort_value;
    if (typeof leftValue !== "string" || typeof rightValue !== "string") {
      return 0;
    }
    return order.indexOf(rightValue) - order.indexOf(leftValue);
  }
  return 0;
};

export const rankMotorEquivalentCandidates = (
  candidates: readonly MotorEquivalentCandidateResult[],
): MotorEquivalentCandidateResult[] =>
  [...candidates].sort((left, right) =>
    MOTOR_STATUS_RANK[left.overall_status] -
      MOTOR_STATUS_RANK[right.overall_status] ||
    MOTOR_STATUS_RANK[left.mechanical_status] -
      MOTOR_STATUS_RANK[right.mechanical_status] ||
    left.ranking.reservation_count - right.ranking.reservation_count ||
    left.ranking.missing_fact_count - right.ranking.missing_fact_count ||
    compareRequestedSort(left, right) ||
    left.ranking.canonical_key.localeCompare(right.ranking.canonical_key)
  );

const listAllCandidates = async (
  reader: MotorEquivalenceCatalogReader,
  spec: EquivalentSpec,
): Promise<MotorCatalogListResponse> => {
  const items: MotorCatalogListResponse["items"] = [];
  let cursor: string | undefined;
  let snapshot: MotorCatalogListResponse["snapshot"] | null = null;
  do {
    const response = await reader.list({
      cursor,
      limit: 50,
      power_kw: spec.electrical.power_kw.value ?? undefined,
      poles: spec.electrical.poles?.value ?? undefined,
      supply_mode: spec.electrical.supply_mode.value ?? undefined,
      frequency_hz: spec.electrical.frequency_hz.value ?? undefined,
    });
    snapshot ??= response.snapshot;
    if (snapshot.id !== response.snapshot.id) {
      throw configuratorOutputInvalid(
        "Le snapshot actif a change pendant la lecture.",
      );
    }
    items.push(...response.items);
    cursor = response.next_cursor ?? undefined;
  } while (cursor !== undefined);

  if (!snapshot) throw configuratorOutputInvalid("Snapshot catalogue absent.");
  return {
    request_id: "",
    snapshot,
    items,
    next_cursor: null,
  };
};

const fromNormalizedSpec = async (
  reader: MotorEquivalenceCatalogReader,
  spec: EquivalentSpec,
  pagination: {
    cursor?: string;
    limit: number;
    sort: MotorEquivalentFromSpecInput["sort"];
  },
  requestId: string,
): Promise<MotorEquivalentFromSpecResponse> => {
  const catalog = await listAllCandidates(reader, spec);
  const details: MotorCatalogGetResponse[] = [];
  for (const item of catalog.items) {
    if (item.candidate.lifecycle === "legacy") continue;
    details.push(
      await reader.get({
        operating_point_id: item.candidate.operating_point_id,
        mounting: spec.mounting,
      }),
    );
  }
  const normalizedSpec = {
    ...spec,
    snapshot_id: catalog.snapshot.id,
  };
  const ranked = rankMotorEquivalentCandidates(
    details.map((detail) =>
      evaluateCandidate(normalizedSpec, detail, pagination.sort)
    ),
  );
  let start = 0;
  if (pagination.cursor !== undefined) {
    const cursorIndex = ranked.findIndex((candidate) =>
      candidate.candidate.operating_point_id === pagination.cursor
    );
    if (cursorIndex < 0) {
      throw configuratorInvalidPayload("Curseur de classement invalide.");
    }
    start = cursorIndex + 1;
  }
  const page = ranked.slice(start, start + pagination.limit);
  const nextCursor = start + page.length < ranked.length
    ? page.at(-1)?.candidate.operating_point_id ?? null
    : null;
  const output = {
    request_id: requestId,
    snapshot: catalog.snapshot,
    normalized_spec: normalizedSpec,
    candidates: page,
    next_cursor: nextCursor,
  };
  const parsed = safeParseMotorEquivalentOutput(output);
  if (!parsed.success) throw configuratorOutputInvalid(parsed.error);
  return parsed.data;
};

export const createMotorEquivalenceService = (
  runReadOnly: ReadOnlyRunner,
  readerFactory: ReaderFactory = createCatalogReader,
) => ({
  fromSpec: async (
    authContext: AuthContext,
    rawInput: unknown,
    requestId: string,
  ): Promise<MotorEquivalentFromSpecResponse> => {
    const input = parseInput(safeParseMotorEquivalentFromSpecInput(rawInput));
    const { cursor, limit, sort, ...rawSpec } = input;
    return await runReadOnly(
      authContext,
      async (transaction) =>
        await fromNormalizedSpec(
          readerFactory(transaction, requestId),
          rawSpec,
          { cursor, limit, sort },
          requestId,
        ),
    );
  },
  fromMotor: async (
    authContext: AuthContext,
    rawInput: unknown,
    requestId: string,
  ): Promise<MotorEquivalentFromSpecResponse> => {
    const input: MotorEquivalentFromMotorInput = parseInput(
      safeParseMotorEquivalentFromMotorInput(rawInput),
    );
    return await runReadOnly(authContext, async (transaction) => {
      const reader = readerFactory(transaction, requestId);
      const reference = await reader.get({
        operating_point_id: input.operating_point_id,
        mounting: input.mounting,
        flange_option_id: input.flange_option_id,
        field_overrides: input.field_overrides,
      });
      return await fromNormalizedSpec(
        reader,
        reference.from_motor_spec,
        {
          cursor: input.cursor,
          limit: input.limit,
          sort: input.sort,
        },
        requestId,
      );
    });
  },
});

export const motorEquivalenceService = createMotorEquivalenceService(
  runConfiguratorReadOnly,
);

export const motorEquivalenceStableValue = stableMotorValue;
