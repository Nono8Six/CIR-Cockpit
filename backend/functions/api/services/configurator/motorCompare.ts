import type {
  MotorCatalogDimension,
  MotorCatalogGetResponse,
  MotorCompareInput,
  MotorComparisonResponse,
} from "../../../../../shared/schemas/configurator/motor.schema.ts";
import {
  safeParseMotorCompareInput,
  safeParseMotorCompareOutput,
} from "../../../../../shared/schemas/configurator/motor.schema.ts";
import type { ConfiguratorEvidence } from "../../../../../shared/schemas/configurator/common.schema.ts";
import type { AuthContext } from "../../types.ts";
import {
  configuratorInvalidPayload,
  configuratorOutputInvalid,
} from "./configuratorErrors.ts";
import {
  getMotorCatalogInTransaction,
  loadMotorEfficiencyQualificationInTransaction,
  type MotorEfficiencyQualification,
} from "./motorCatalog.ts";
import {
  canonicalMotorEvidence,
  canonicalMotorList,
  stableMotorValue,
} from "./motorC3Determinism.ts";
import {
  type ConfiguratorReadOperation,
  type ConfiguratorReadTransaction,
  runConfiguratorReadOnly,
} from "./configuratorReadExecutor.ts";

type ReadOnlyRunner = <T>(
  authContext: AuthContext,
  operation: ConfiguratorReadOperation<T>,
) => Promise<T>;

type ComparisonCell = MotorComparisonResponse["rows"][number]["values"][number];
type ComparisonRow = MotorComparisonResponse["rows"][number];
type ComparisonFamily = ComparisonRow["family"];
type Optimization = ComparisonRow["optimization"];

export type MotorComparisonCatalogReader = {
  get: (operatingPointId: string) => Promise<MotorCatalogGetResponse>;
  qualify: (
    detail: MotorCatalogGetResponse,
  ) => Promise<MotorEfficiencyQualification>;
};

type ReaderFactory = (
  transaction: ConfiguratorReadTransaction,
  requestId: string,
) => MotorComparisonCatalogReader;

const createCatalogReader: ReaderFactory = (transaction, requestId) => ({
  get: (operatingPointId) =>
    getMotorCatalogInTransaction(
      transaction,
      { operating_point_id: operatingPointId, mounting: "B3" },
      requestId,
    ),
  qualify: (detail) =>
    loadMotorEfficiencyQualificationInTransaction(transaction, detail),
});

const parseInput = <T>(
  result: { success: true; data: T } | { success: false; error: unknown },
): T => {
  if (!result.success) throw configuratorInvalidPayload(result.error);
  return result.data;
};

const publishedCell = (
  value: string | number | boolean,
  evidence: readonly ConfiguratorEvidence[],
  status: ComparisonCell["status"] = "published",
  thresholdValue?: number,
): ComparisonCell => ({
  value,
  status,
  ...(thresholdValue === undefined ? {} : { threshold_value: thresholdValue }),
  evidence: canonicalMotorEvidence(evidence),
});

const unavailableCell = (
  status: "not_published" | "indeterminate" = "not_published",
  evidence: readonly ConfiguratorEvidence[] = [],
): ComparisonCell => ({
  value: null,
  status,
  evidence: canonicalMotorEvidence(evidence),
});

const nullableCell = (
  value: string | number | boolean | null,
  evidence: readonly ConfiguratorEvidence[],
): ComparisonCell =>
  value === null
    ? unavailableCell("not_published")
    : publishedCell(value, evidence);

const selectedDimension = (
  detail: MotorCatalogGetResponse,
  code: NonNullable<MotorCatalogDimension["canonical_code"]>,
): ComparisonCell => {
  const footCode = ["A", "B", "C", "H", "K"].includes(code);
  const eligible = detail.dimensions
    .filter((dimension) =>
      dimension.mapping_status === "mapped" &&
      dimension.canonical_code === code &&
      (dimension.polarity === null ||
        dimension.polarity === detail.operating_point.poles) &&
      (
        dimension.mounting === "ANY" ||
        (footCode && dimension.mounting === "B3")
      )
    )
    .map((dimension) => ({
      dimension,
      specificity:
        (dimension.polarity === detail.operating_point.poles ? 2 : 0) +
        (dimension.mounting === (footCode ? "B3" : "ANY") ? 1 : 0),
    }));
  if (eligible.length === 0) return unavailableCell();
  const bestSpecificity = Math.max(...eligible.map((item) => item.specificity));
  const best = eligible.filter((item) => item.specificity === bestSpecificity);
  const values = new Set(
    best.map((item) =>
      stableMotorValue(item.dimension.value_mm ?? item.dimension.value_text)
    ),
  );
  if (values.size !== 1) {
    return unavailableCell(
      "indeterminate",
      best.flatMap((item) => item.dimension.evidence),
    );
  }
  const selected = best
    .map((item) => item.dimension)
    .sort((left, right) => Number(left.id) - Number(right.id))[0];
  const value = selected.value_mm ?? selected.value_text;
  return value === null ? unavailableCell() : publishedCell(
    value,
    best.flatMap((item) => item.dimension.evidence),
  );
};

const standardFlangeSignature = (
  detail: MotorCatalogGetResponse,
): ComparisonCell => {
  const flanges = detail.flange_options
    .filter((flange) => flange.role === "standard")
    .sort((left, right) =>
      left.mounting.localeCompare(right.mounting) ||
      Number(left.id) - Number(right.id)
    );
  if (flanges.length === 0) return unavailableCell();
  const signature = flanges.map((flange) =>
    [
      flange.mounting,
      flange.bore_type,
      flange.dim_m_mm,
      flange.dim_n_mm,
      flange.dim_p_mm,
      flange.dim_s_mm,
      flange.dim_s_thread,
      flange.dim_t_mm,
      flange.holes,
    ].join(":")
  ).join("|");
  return publishedCell(
    signature,
    flanges.flatMap((flange) => flange.evidence),
  );
};

const efficiencyCell = (
  detail: MotorCatalogGetResponse,
  loadFraction: number,
  qualification: MotorEfficiencyQualification,
): ComparisonCell => {
  const point = detail.efficiency_points.find((candidate) =>
    Math.abs(candidate.load_fraction - loadFraction) < 1e-9
  );
  if (!point) return unavailableCell();
  if (loadFraction !== 1 || qualification.kind === "unqualified") {
    return publishedCell(point.efficiency_pct, point.evidence);
  }
  return publishedCell(
    point.efficiency_pct,
    canonicalMotorEvidence([...point.evidence, ...qualification.evidence]),
    qualification.kind,
    qualification.threshold_pct ?? undefined,
  );
};

type RowDefinition = {
  family: ComparisonFamily;
  key: string;
  label: string;
  unit: string;
  optimization: Optimization;
  cell: (
    detail: MotorCatalogGetResponse,
    qualification: MotorEfficiencyQualification,
  ) => ComparisonCell;
  optimizationValue?: (
    value: string | number | boolean,
  ) => number | null;
  mixedEfficiencyGuard?: boolean;
  blockingIssueCode?: string;
};

const scalarDefinition = (
  family: ComparisonFamily,
  key: string,
  label: string,
  unit: string,
  optimization: Optimization,
  accessor: (
    detail: MotorCatalogGetResponse,
  ) => string | number | boolean | null,
  evidence: (detail: MotorCatalogGetResponse) => ConfiguratorEvidence[],
  options: Pick<
    RowDefinition,
    "optimizationValue" | "blockingIssueCode"
  > = {},
): RowDefinition => ({
  family,
  key,
  label,
  unit,
  optimization,
  cell: (detail) => nullableCell(accessor(detail), evidence(detail)),
  ...options,
});

const definitions: readonly RowDefinition[] = [
  {
    family: "electrical",
    key: "efficiency_100",
    label: "Rendement a 100 %",
    unit: "%",
    optimization: "high",
    cell: (detail, qualification) => efficiencyCell(detail, 1, qualification),
    mixedEfficiencyGuard: true,
    blockingIssueCode: "IE_BELOW_THRESHOLD",
  },
  {
    family: "electrical",
    key: "efficiency_75",
    label: "Rendement a 75 %",
    unit: "%",
    optimization: "high",
    cell: (detail, qualification) =>
      efficiencyCell(detail, 0.75, qualification),
  },
  {
    family: "electrical",
    key: "efficiency_50",
    label: "Rendement a 50 %",
    unit: "%",
    optimization: "high",
    cell: (detail, qualification) => efficiencyCell(detail, 0.5, qualification),
  },
  scalarDefinition(
    "electrical",
    "power_kw",
    "Puissance nominale",
    "kW",
    "none",
    (detail) => detail.operating_point.power_kw,
    (detail) => detail.operating_point.evidence,
  ),
  scalarDefinition(
    "electrical",
    "rated_speed_rpm",
    "Vitesse nominale",
    "rpm",
    "none",
    (detail) => detail.operating_point.rated_speed_rpm,
    (detail) => detail.operating_point.evidence,
  ),
  ...([
    ["cos_phi", "Facteur de puissance", "", "high"],
    ["rated_current_a", "Courant nominal", "A", "low"],
    ["starting_current_ratio", "Courant de demarrage Id/In", "x In", "low"],
    ["starting_torque_ratio", "Couple de demarrage Md/Mn", "x Mn", "high"],
    ["breakdown_torque_ratio", "Couple de decrochage Mm/Mn", "x Mn", "high"],
  ] as const).map(([key, label, unit, optimization]) =>
    scalarDefinition(
      "electrical",
      key,
      label,
      unit,
      optimization,
      (detail) => detail.operating_point[key],
      (detail) => detail.operating_point.evidence,
    )
  ),
  scalarDefinition(
    "mechanical",
    "frame_size",
    "Hauteur d axe",
    "mm",
    "identity",
    (detail) => detail.model.frame_size,
    (detail) => detail.model.evidence,
  ),
  ...(["A", "B", "C", "H", "K", "D", "E", "F"] as const).map((
    code,
  ): RowDefinition => ({
    family: "mechanical",
    key: `dimension_${code.toLowerCase()}`,
    label: `Cote ${code}`,
    unit: "mm",
    optimization: "identity",
    cell: (detail) => selectedDimension(detail, code),
  })),
  {
    family: "mechanical",
    key: "flange_interface",
    label: "Interfaces de bride standard",
    unit: "",
    optimization: "identity",
    cell: (detail) => standardFlangeSignature(detail),
  },
  scalarDefinition(
    "mechanical",
    "mass_kg",
    "Masse",
    "kg",
    "low",
    (detail) => detail.model.mass_kg,
    (detail) => detail.model.evidence,
  ),
  scalarDefinition(
    "mechanical",
    "inertia_kgm2",
    "Inertie rotor",
    "kg.m2",
    "low",
    (detail) => detail.model.inertia_kgm2,
    (detail) => detail.model.evidence,
    { blockingIssueCode: "INERTIA_IMPLAUSIBLE" },
  ),
  scalarDefinition(
    "mechanical",
    "noise_db",
    "Niveau sonore",
    "dB(A)",
    "low",
    (detail) => detail.operating_point.noise_db,
    (detail) => detail.operating_point.evidence,
  ),
  scalarDefinition(
    "quality",
    "efficiency_class",
    "Classe IE",
    "",
    "high",
    (detail) => detail.operating_point.efficiency_class,
    (detail) => detail.operating_point.evidence,
    {
      optimizationValue: (value) =>
        typeof value === "string"
          ? ["IE1", "IE2", "IE3", "IE4", "IE5"].indexOf(value)
          : null,
      blockingIssueCode: "IE_BELOW_THRESHOLD",
    },
  ),
  scalarDefinition(
    "quality",
    "data_grade",
    "Grade de fiabilite",
    "",
    "high",
    (detail) => detail.operating_point.data_grade,
    (detail) => detail.operating_point.evidence,
    {
      optimizationValue: (value) =>
        typeof value === "string"
          ? ({ D: 1, C: 2, B: 3, A: 4 }[value] ?? null)
          : null,
    },
  ),
  scalarDefinition(
    "quality",
    "validation_issue_count",
    "Anomalies journalisees",
    "count",
    "none",
    (detail) => detail.issues.length,
    (detail) => detail.issues.flatMap((issue) => issue.evidence),
  ),
];

const buildRow = (
  definition: RowDefinition,
  details: readonly MotorCatalogGetResponse[],
  qualifications: readonly MotorEfficiencyQualification[],
): ComparisonRow => {
  const values = details.map((detail, index) =>
    definition.cell(detail, qualifications[index])
  );
  const fullyPublished = values.every((cell) =>
    cell.status !== "not_published" && cell.status !== "indeterminate"
  );
  if (definition.optimization === "identity") {
    const identityStatus = !fullyPublished
      ? "indeterminate" as const
      : values.every((cell) =>
          stableMotorValue(cell.value) === stableMotorValue(values[0].value)
        )
      ? "identical" as const
      : "different" as const;
    return {
      family: definition.family,
      key: definition.key,
      label: definition.label,
      unit: definition.unit,
      optimization: definition.optimization,
      values,
      best_index: null,
      comparable_for_summary: false,
      identity_status: identityStatus,
      comparison_note: identityStatus === "indeterminate"
        ? "Identite indeterminable : au moins une valeur est absente ou ambigue."
        : identityStatus === "identical"
        ? "Les valeurs dimensionnelles sont identiques."
        : "Au moins une valeur dimensionnelle differe.",
    };
  }
  if (definition.optimization === "none") {
    return {
      family: definition.family,
      key: definition.key,
      label: definition.label,
      unit: definition.unit,
      optimization: definition.optimization,
      values,
      best_index: null,
      comparable_for_summary: false,
      identity_status: null,
      comparison_note: null,
    };
  }
  if (!fullyPublished) {
    return {
      family: definition.family,
      key: definition.key,
      label: definition.label,
      unit: definition.unit,
      optimization: definition.optimization,
      values,
      best_index: null,
      comparable_for_summary: false,
      identity_status: null,
      comparison_note:
        "Critere exclu du palmares : au moins une valeur n est pas publiee.",
    };
  }
  if (
    definition.blockingIssueCode &&
    details.some((detail) =>
      detail.issues.some((issue) => issue.code === definition.blockingIssueCode)
    )
  ) {
    return {
      family: definition.family,
      key: definition.key,
      label: definition.label,
      unit: definition.unit,
      optimization: definition.optimization,
      values,
      best_index: null,
      comparable_for_summary: false,
      identity_status: null,
      comparison_note:
        `Critere exclu du palmares : issue ${definition.blockingIssueCode}.`,
    };
  }
  if (definition.mixedEfficiencyGuard) {
    const statuses = new Set(values.map((value) => value.status));
    if (statuses.has("at_threshold") && statuses.has("measured")) {
      return {
        family: definition.family,
        key: definition.key,
        label: definition.label,
        unit: definition.unit,
        optimization: definition.optimization,
        values,
        best_index: null,
        comparable_for_summary: false,
        identity_status: null,
        comparison_note:
          "Aucun meilleur rendement : minima normatifs et valeurs mesurees sont melanges.",
      };
    }
  }
  const optimizationValues = values.map((cell) => {
    if (definition.optimizationValue) {
      return definition.optimizationValue(
        cell.value as string | number | boolean,
      );
    }
    return typeof cell.value === "number" ? cell.value : null;
  });
  if (optimizationValues.some((value) => value === null)) {
    return {
      family: definition.family,
      key: definition.key,
      label: definition.label,
      unit: definition.unit,
      optimization: definition.optimization,
      values,
      best_index: null,
      comparable_for_summary: false,
      identity_status: null,
      comparison_note:
        "Critere exclu du palmares : la valeur n est pas optimisable.",
    };
  }
  const numericValues = optimizationValues as number[];
  const optimum = definition.optimization === "high"
    ? Math.max(...numericValues)
    : Math.min(...numericValues);
  const bestIndexes = numericValues
    .map((value, index) => value === optimum ? index : -1)
    .filter((index) => index >= 0);
  if (bestIndexes.length !== 1) {
    return {
      family: definition.family,
      key: definition.key,
      label: definition.label,
      unit: definition.unit,
      optimization: definition.optimization,
      values,
      best_index: null,
      comparable_for_summary: false,
      identity_status: null,
      comparison_note:
        "Ex aequo : aucun optimum unique, ligne exclue du palmares.",
    };
  }
  return {
    family: definition.family,
    key: definition.key,
    label: definition.label,
    unit: definition.unit,
    optimization: definition.optimization,
    values,
    best_index: bestIndexes[0],
    comparable_for_summary: true,
    identity_status: null,
    comparison_note: null,
  };
};

export const compareMotorCatalogDetails = (
  details: readonly MotorCatalogGetResponse[],
  qualifications: readonly MotorEfficiencyQualification[],
  requestId: string,
): MotorComparisonResponse => {
  const rows = definitions.map((definition) =>
    buildRow(definition, details, qualifications)
  );
  const comparable = rows.filter((row) => row.comparable_for_summary);
  const coreKeys = new Set([
    "frame_size",
    "dimension_a",
    "dimension_b",
    "dimension_c",
    "dimension_d",
    "dimension_e",
    "dimension_f",
    "flange_interface",
  ]);
  const coreRows = rows.filter((row) => coreKeys.has(row.key));
  return {
    request_id: requestId,
    snapshot: details[0].snapshot,
    motors: details.map((detail) => ({
      model_id: detail.model.id,
      model_key: detail.model.model_key,
      operating_point_id: detail.operating_point.id,
      variant_key: detail.operating_point.variant_key,
      brand: detail.model.brand,
      designation: detail.model.designation,
      label: `${detail.model.brand} ${detail.model.designation}${
        detail.operating_point.variant_key
          ? ` - ${detail.operating_point.variant_key}`
          : ""
      }`,
      provenance: canonicalMotorEvidence([
        ...detail.model.evidence,
        ...detail.operating_point.evidence,
      ]),
      issues: canonicalMotorList(detail.issues.map((issue) => ({
        code: issue.code,
        severity: issue.severity,
        message: issue.message,
        restriction: issue.restriction,
        evidence: issue.evidence,
      }))),
    })),
    rows,
    summary: details.map((detail, index) => ({
      operating_point_id: detail.operating_point.id,
      criteria_won: comparable.filter((row) => row.best_index === index).length,
      total_comparable_criteria: comparable.length,
    })),
    mechanical_summary: {
      core_dimensions_identical:
        coreRows.some((row) => row.identity_status === "indeterminate")
          ? null
          : coreRows.every((row) => row.identity_status === "identical"),
      differing_criteria: rows
        .filter((row) =>
          row.family === "mechanical" && row.identity_status === "different"
        )
        .map((row) => row.key),
      indeterminate_criteria: rows
        .filter((row) =>
          row.family === "mechanical" &&
          row.identity_status === "indeterminate"
        )
        .map((row) => row.key),
    },
  };
};

export const createMotorComparisonService = (
  runReadOnly: ReadOnlyRunner,
  readerFactory: ReaderFactory = createCatalogReader,
) => ({
  compare: async (
    authContext: AuthContext,
    rawInput: unknown,
    requestId: string,
  ): Promise<MotorComparisonResponse> => {
    const input: MotorCompareInput = parseInput(
      safeParseMotorCompareInput(rawInput),
    );
    return await runReadOnly(authContext, async (transaction) => {
      const reader = readerFactory(transaction, requestId);
      const details: MotorCatalogGetResponse[] = [];
      const qualifications: MotorEfficiencyQualification[] = [];
      for (const operatingPointId of input.operating_point_ids) {
        const detail = await reader.get(operatingPointId);
        if (
          details.length > 0 &&
          detail.snapshot.id !== details[0].snapshot.id
        ) {
          throw configuratorOutputInvalid(
            "Le snapshot actif a change pendant la comparaison.",
          );
        }
        details.push(detail);
        qualifications.push(await reader.qualify(detail));
      }
      const output = compareMotorCatalogDetails(
        details,
        qualifications,
        requestId,
      );
      const parsed = safeParseMotorCompareOutput(output);
      if (!parsed.success) throw configuratorOutputInvalid(parsed.error);
      return parsed.data;
    });
  },
});

export const motorComparisonService = createMotorComparisonService(
  runConfiguratorReadOnly,
);
