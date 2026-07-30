import type {
  MotorCatalogGetResponse,
  MotorEnergyComputeInput,
  MotorEnergyComputeResponse,
  MotorEnergyProfile,
  MotorEnergyResult,
} from "../../../../../shared/schemas/configurator/motor.schema.ts";
import {
  safeParseMotorEnergyInput,
  safeParseMotorEnergyOutput,
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
  motorRuleEvidence,
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

export type MotorEnergyCatalogReader = {
  get: (operatingPointId: string) => Promise<MotorCatalogGetResponse>;
  qualify: (
    detail: MotorCatalogGetResponse,
  ) => Promise<MotorEfficiencyQualification>;
};

type ReaderFactory = (
  transaction: ConfiguratorReadTransaction,
  requestId: string,
) => MotorEnergyCatalogReader;

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

const round = (value: number, decimals: number): number =>
  Number(value.toFixed(decimals));

type EfficiencyAtLoad = {
  efficiency: number;
  source: "catalogue" | "interpolation";
  evidence: ConfiguratorEvidence[];
  bounds: [
    MotorCatalogGetResponse["efficiency_points"][number],
    MotorCatalogGetResponse["efficiency_points"][number],
  ] | null;
};

export const motorEfficiencyAtLoad = (
  points: readonly MotorCatalogGetResponse["efficiency_points"][number][],
  loadFraction: number,
): EfficiencyAtLoad | null => {
  const known = [...points]
    .filter((point) =>
      Number.isFinite(point.load_fraction) &&
      Number.isFinite(point.efficiency_pct)
    )
    .sort((left, right) =>
      left.load_fraction - right.load_fraction ||
      Number(left.id) - Number(right.id)
    );
  const exact = known.find((point) =>
    Math.abs(point.load_fraction - loadFraction) < 1e-9
  );
  if (exact) {
    return {
      efficiency: exact.efficiency_pct,
      source: "catalogue",
      evidence: exact.evidence,
      bounds: null,
    };
  }
  for (let index = 0; index < known.length - 1; index += 1) {
    const lower = known[index];
    const upper = known[index + 1];
    if (
      lower.load_fraction < loadFraction &&
      loadFraction < upper.load_fraction
    ) {
      const position = (loadFraction - lower.load_fraction) /
        (upper.load_fraction - lower.load_fraction);
      return {
        efficiency: lower.efficiency_pct +
          position * (upper.efficiency_pct - lower.efficiency_pct),
        source: "interpolation",
        evidence: canonicalMotorEvidence([
          ...lower.evidence,
          ...upper.evidence,
          motorRuleEvidence(
            "Interpolation lineaire du rendement",
            "ENERGY_LINEAR_INTERPOLATION",
            [
              { key: "load_requested", value: loadFraction },
              { key: "load_lower", value: lower.load_fraction },
              {
                key: "efficiency_lower",
                value: lower.efficiency_pct,
                unit: "%",
              },
              { key: "load_upper", value: upper.load_fraction },
              {
                key: "efficiency_upper",
                value: upper.efficiency_pct,
                unit: "%",
              },
            ],
          ),
        ]),
        bounds: [lower, upper],
      };
    }
  }
  return null;
};

const energyRestriction = (
  code: string,
  label: string,
  explanation: string,
  evidence: readonly ConfiguratorEvidence[],
): MotorEnergyResult["restrictions"][number] => ({
  code,
  label,
  explanation,
  evidence: canonicalMotorEvidence(
    evidence.length > 0 ? evidence : [motorRuleEvidence(label, code)],
  ),
});

export const computeMotorEnergyFromCatalog = (
  detail: MotorCatalogGetResponse,
  profile: MotorEnergyProfile,
  qualification: MotorEfficiencyQualification,
): MotorEnergyResult => {
  const curveIssue = detail.issues.find((issue) =>
    issue.code === "EFFICIENCY_CURVE"
  );
  const ieIssue = detail.issues.find((issue) =>
    issue.code === "IE_BELOW_THRESHOLD"
  );
  const affectedCodes = curveIssue ? ["EFFICIENCY_CURVE"] : [];
  const loadResults = [...profile.load_points]
    .sort((left, right) =>
      left.load_fraction - right.load_fraction ||
      left.hours_per_year - right.hours_per_year
    )
    .map((loadPoint): MotorEnergyResult["load_results"][number] => {
      const shaftPower = round(
        detail.operating_point.power_kw * loadPoint.load_fraction,
        6,
      );
      const efficiency = motorEfficiencyAtLoad(
        detail.efficiency_points,
        loadPoint.load_fraction,
      );
      if (!efficiency) {
        return {
          status: "indeterminate",
          load_fraction: loadPoint.load_fraction,
          hours_per_year: loadPoint.hours_per_year,
          shaft_power_kw: shaftPower,
          efficiency_pct: null,
          efficiency_source: "not_published",
          interpolation_bounds: null,
          input_power_kw: null,
          energy_kwh_per_year: null,
          formula: "Rendement non encadre : aucun calcul ni extrapolation.",
          evidence: detail.operating_point.evidence,
          affected_by_issue_codes: affectedCodes,
        };
      }
      const efficiencyPct = round(efficiency.efficiency, 6);
      const inputPower = round(shaftPower / (efficiencyPct / 100), 6);
      const energy = round(inputPower * loadPoint.hours_per_year, 3);
      const bounds = efficiency.bounds
        ? efficiency.bounds.map((bound) => ({
          load_fraction: bound.load_fraction,
          efficiency_pct: bound.efficiency_pct,
          evidence: bound.evidence,
        })) as MotorEnergyResult["load_results"][number]["interpolation_bounds"]
        : null;
      return {
        status: "calculated",
        load_fraction: loadPoint.load_fraction,
        hours_per_year: loadPoint.hours_per_year,
        shaft_power_kw: shaftPower,
        efficiency_pct: efficiencyPct,
        efficiency_source: efficiency.source,
        interpolation_bounds: bounds,
        input_power_kw: inputPower,
        energy_kwh_per_year: energy,
        formula:
          "P_entree_kW = P_nominale_kW * charge / (rendement_pct / 100); energie_kWh_an = P_entree_kW * heures_an.",
        evidence: canonicalMotorEvidence([
          ...detail.operating_point.evidence,
          ...efficiency.evidence,
        ]),
        affected_by_issue_codes: affectedCodes,
      };
    });
  const complete = loadResults.every((result) =>
    result.status === "calculated"
  );
  const restrictions = canonicalMotorList([
    ...(curveIssue
      ? [energyRestriction(
        "EFFICIENCY_CURVE",
        "Verifier la courbe de rendement",
        "Le calcul utilise un point de fonctionnement dont la courbe de rendement porte une alerte catalogue.",
        curveIssue.evidence,
      )]
      : []),
    ...(ieIssue
      ? [energyRestriction(
        "IE_BELOW_THRESHOLD",
        "Ne pas affirmer la classe IE",
        "Le rendement publie est sous le seuil de classe journalise ; la classe doit etre verifiee.",
        ieIssue.evidence,
      )]
      : []),
  ]);
  return {
    motor: {
      model_key: detail.model.model_key,
      variant_key: detail.operating_point.variant_key,
      operating_point_id: detail.operating_point.id,
    },
    status: complete ? "calculated" : "indeterminate",
    total_hours_per_year: round(
      profile.load_points.reduce((sum, point) => sum + point.hours_per_year, 0),
      3,
    ),
    energy_kwh_per_year: complete
      ? round(
        loadResults.reduce(
          (sum, result) => sum + (result.energy_kwh_per_year ?? 0),
          0,
        ),
        3,
      )
      : null,
    efficiency_qualification: qualification,
    load_results: loadResults,
    restrictions,
    rounding: {
      efficiency_decimals: 6,
      power_kw_decimals: 6,
      energy_kwh_decimals: 3,
    },
  };
};

export const qualifyMotorEnergyGain = (
  reference: MotorEnergyResult,
  candidate: MotorEnergyResult,
): NonNullable<MotorEnergyComputeResponse["gain"]> => {
  const complete = reference.status === "calculated" &&
    candidate.status === "calculated" &&
    reference.energy_kwh_per_year !== null &&
    candidate.energy_kwh_per_year !== null;
  const referenceKind = reference.efficiency_qualification.kind;
  const candidateKind = candidate.efficiency_qualification.kind;
  const qualification = !complete ||
      referenceKind === "unqualified" ||
      candidateKind === "unqualified"
    ? "indeterminate" as const
    : referenceKind === "at_threshold" && candidateKind === "measured"
    ? "upper" as const
    : referenceKind === "measured" && candidateKind === "at_threshold"
    ? "lower" as const
    : referenceKind === "at_threshold" && candidateKind === "at_threshold"
    ? "indeterminate" as const
    : "exact" as const;
  const explanation = !complete
    ? "Au moins un calcul energetique est incomplet ; le gain reste indetermine."
    : referenceKind === "unqualified" || candidateKind === "unqualified"
    ? "Au moins une qualification de rendement est indisponible ; la borne reste indeterminee."
    : qualification === "upper"
    ? "La reference est au seuil normatif et le candidat est mesure au-dessus : le gain est une borne superieure."
    : qualification === "lower"
    ? "La reference est mesuree au-dessus et le candidat est au seuil normatif : le gain est une borne inferieure."
    : qualification === "exact"
    ? "Les deux rendements sont mesures au-dessus de leur seuil : la difference est exacte pour le profil fourni."
    : "Les deux rendements sont au seuil normatif : aucune borne directionnelle fiable ne peut etre affirmee.";
  return {
    reference: reference.motor,
    candidate: candidate.motor,
    reference_energy_kwh_per_year: reference.energy_kwh_per_year,
    candidate_energy_kwh_per_year: candidate.energy_kwh_per_year,
    difference_kwh_per_year: complete
      ? round(
        reference.energy_kwh_per_year! - candidate.energy_kwh_per_year!,
        3,
      )
      : null,
    qualification,
    explanation,
    evidence: canonicalMotorEvidence([
      ...reference.efficiency_qualification.evidence,
      ...candidate.efficiency_qualification.evidence,
      ...reference.load_results.flatMap((result) => result.evidence),
      ...candidate.load_results.flatMap((result) => result.evidence),
    ]),
  };
};

export const createMotorEnergyService = (
  runReadOnly: ReadOnlyRunner,
  readerFactory: ReaderFactory = createCatalogReader,
) => ({
  compute: async (
    authContext: AuthContext,
    rawInput: unknown,
    requestId: string,
  ): Promise<MotorEnergyComputeResponse> => {
    const input: MotorEnergyComputeInput = parseInput(
      safeParseMotorEnergyInput(rawInput),
    );
    return await runReadOnly(authContext, async (transaction) => {
      const reader = readerFactory(transaction, requestId);
      const candidateDetail = await reader.get(
        input.candidate_operating_point_id,
      );
      const candidate = computeMotorEnergyFromCatalog(
        candidateDetail,
        input.profile,
        await reader.qualify(candidateDetail),
      );
      let reference: MotorEnergyResult | null = null;
      if (input.reference_operating_point_id !== undefined) {
        const referenceDetail = await reader.get(
          input.reference_operating_point_id,
        );
        if (referenceDetail.snapshot.id !== candidateDetail.snapshot.id) {
          throw configuratorOutputInvalid(
            "Le snapshot actif a change pendant le calcul energetique.",
          );
        }
        reference = computeMotorEnergyFromCatalog(
          referenceDetail,
          input.profile,
          await reader.qualify(referenceDetail),
        );
      }
      const output = {
        request_id: requestId,
        snapshot: candidateDetail.snapshot,
        candidate,
        reference,
        gain: reference ? qualifyMotorEnergyGain(reference, candidate) : null,
      };
      const parsed = safeParseMotorEnergyOutput(output);
      if (!parsed.success) throw configuratorOutputInvalid(parsed.error);
      return parsed.data;
    });
  },
});

export const motorEnergyService = createMotorEnergyService(
  runConfiguratorReadOnly,
);
