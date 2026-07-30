import { assert, assertEquals } from "std/assert";

import type {
  MotorEnergyProfile,
  MotorEnergyResult,
} from "../../../../../shared/schemas/configurator/motor.schema.ts";
import {
  computeMotorEnergyFromCatalog,
  motorEfficiencyAtLoad,
  qualifyMotorEnergyGain,
} from "./motorEnergy.ts";
import {
  c3CatalogDetail,
  c3Qualification,
} from "./motorC3TestFixtures_test.ts";

const profile: MotorEnergyProfile = {
  load_points: [
    { load_fraction: 0.5, hours_per_year: 1_000 },
    { load_fraction: 0.625, hours_per_year: 500 },
    { load_fraction: 1, hours_per_year: 250 },
  ],
};

Deno.test("energy keeps an exact published efficiency as catalogue data", () => {
  const detail = c3CatalogDetail();
  const result = motorEfficiencyAtLoad(detail.efficiency_points, 0.5);

  assertEquals(result?.source, "catalogue");
  assertEquals(result?.efficiency, 90);
  assertEquals(result?.bounds, null);
  assertEquals(result?.evidence, detail.efficiency_points[0].evidence);
});

Deno.test("energy interpolates only between two strict published bounds with proof", () => {
  const detail = c3CatalogDetail();
  const result = motorEfficiencyAtLoad(detail.efficiency_points, 0.625);

  assertEquals(result?.source, "interpolation");
  assertEquals(result?.efficiency, 91);
  assertEquals(result?.bounds?.map((bound) => bound.load_fraction), [
    0.5,
    0.75,
  ]);
  assert(
    result?.evidence.some((evidence) =>
      evidence.kind === "rule" &&
      evidence.rule_code === "ENERGY_LINEAR_INTERPOLATION"
    ),
  );
});

Deno.test("energy refuses low, high and non-encapsulated loads without extrapolation", () => {
  const points = c3CatalogDetail({
    efficiencyPoints: [[0.5, 90], [0.75, 92]],
  }).efficiency_points;

  assertEquals(motorEfficiencyAtLoad(points, 0.25), null);
  assertEquals(motorEfficiencyAtLoad(points, 0.9), null);
  assertEquals(motorEfficiencyAtLoad([], 0.75), null);
});

Deno.test("energy result is indeterminate when one profile point is not bounded", () => {
  const detail = c3CatalogDetail({
    efficiencyPoints: [[0.5, 90], [0.75, 92]],
  });
  const result = computeMotorEnergyFromCatalog(
    detail,
    profile,
    c3Qualification("unqualified"),
  );

  assertEquals(result.status, "indeterminate");
  assertEquals(result.energy_kwh_per_year, null);
  assertEquals(result.load_results.at(-1)?.status, "indeterminate");
  assertEquals(result.load_results.at(-1)?.efficiency_source, "not_published");
});

Deno.test("energy calculations and rounding are reproducible", () => {
  const detail = c3CatalogDetail();
  const first = computeMotorEnergyFromCatalog(
    detail,
    profile,
    c3Qualification("measured"),
  );
  const second = computeMotorEnergyFromCatalog(
    detail,
    profile,
    c3Qualification("measured"),
  );

  assertEquals(first, second);
  assertEquals(first.status, "calculated");
  assertEquals(first.total_hours_per_year, 1_750);
  assertEquals(first.rounding, {
    efficiency_decimals: 6,
    power_kw_decimals: 6,
    energy_kwh_decimals: 3,
  });
  assert(first.energy_kwh_per_year !== null);
});

Deno.test("EFFICIENCY_CURVE creates a sourced energy reservation", () => {
  const detail = c3CatalogDetail({
    issues: [{ code: "EFFICIENCY_CURVE" }],
  });
  const result = computeMotorEnergyFromCatalog(
    detail,
    profile,
    c3Qualification("measured"),
  );

  assert(
    result.restrictions.some((restriction) =>
      restriction.code === "EFFICIENCY_CURVE"
    ),
  );
  assert(
    result.load_results.every((load) =>
      load.affected_by_issue_codes.includes("EFFICIENCY_CURVE")
    ),
  );
});

const energyResult = (
  id: string,
  kind: MotorEnergyResult["efficiency_qualification"]["kind"],
  energy: number | null,
): MotorEnergyResult => ({
  ...computeMotorEnergyFromCatalog(
    c3CatalogDetail({ id: Number(id) }),
    { load_points: [{ load_fraction: 1, hours_per_year: 1_000 }] },
    c3Qualification(kind),
  ),
  status: energy === null ? "indeterminate" : "calculated",
  energy_kwh_per_year: energy,
});

Deno.test("energy gain implements the complete ordered pairwise bound matrix", () => {
  const matrix = [
    ["at_threshold", "measured", "upper"],
    ["measured", "at_threshold", "lower"],
    ["at_threshold", "at_threshold", "indeterminate"],
    ["measured", "measured", "exact"],
  ] as const;

  for (const [referenceKind, candidateKind, expected] of matrix) {
    const gain = qualifyMotorEnergyGain(
      energyResult("1", referenceKind, 1_000),
      energyResult("2", candidateKind, 800),
    );
    assertEquals(gain.qualification, expected);
    assertEquals(gain.reference.operating_point_id, "1");
    assertEquals(gain.candidate.operating_point_id, "2");
    assertEquals(gain.difference_kwh_per_year, 200);
  }
});

Deno.test("energy gain becomes indeterminate for unavailable qualification or energy", () => {
  assertEquals(
    qualifyMotorEnergyGain(
      energyResult("1", "unqualified", 1_000),
      energyResult("2", "measured", 800),
    ).qualification,
    "indeterminate",
  );

  const incomplete = qualifyMotorEnergyGain(
    energyResult("1", "measured", null),
    energyResult("2", "measured", 800),
  );
  assertEquals(incomplete.qualification, "indeterminate");
  assertEquals(incomplete.difference_kwh_per_year, null);
});

Deno.test("energy bound direction changes when reference and candidate are inverted", () => {
  const reference = energyResult("1", "at_threshold", 1_000);
  const candidate = energyResult("2", "measured", 800);

  assertEquals(
    qualifyMotorEnergyGain(reference, candidate).qualification,
    "upper",
  );
  assertEquals(
    qualifyMotorEnergyGain(candidate, reference).qualification,
    "lower",
  );
  assertEquals(
    qualifyMotorEnergyGain(candidate, reference).difference_kwh_per_year,
    -200,
  );
});
