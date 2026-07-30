import { assert, assertEquals, assertRejects } from "std/assert";

import type { AuthContext } from "../../types.ts";
import { configuratorOperatingPointNotFound } from "./configuratorErrors.ts";
import {
  compareMotorCatalogDetails,
  createMotorComparisonService,
} from "./motorCompare.ts";
import {
  C3_TEST_REQUEST_ID,
  c3CatalogDetail,
  c3Qualification,
} from "./motorC3TestFixtures_test.ts";

const authContext: AuthContext = {
  userId: "44444444-4444-4444-8444-444444444444",
  role: "tcs",
  agencyIds: [],
  activeAgencyId: null,
  isSuperAdmin: false,
};

const rowByKey = (
  rows: ReturnType<typeof compareMotorCatalogDetails>["rows"],
  key: string,
) => {
  const row = rows.find((candidate) => candidate.key === key);
  assert(row, `La ligne ${key} est requise`);
  return row;
};

Deno.test("comparison preserves requested motor identity and order", () => {
  const details = [
    c3CatalogDetail({ id: 2, modelKey: "brand:m2:standard" }),
    c3CatalogDetail({ id: 1, modelKey: "brand:m1:standard" }),
  ];
  const result = compareMotorCatalogDetails(
    details,
    [c3Qualification("measured"), c3Qualification("measured")],
    C3_TEST_REQUEST_ID,
  );

  assertEquals(result.motors.map((motor) => motor.operating_point_id), [
    "2",
    "1",
  ]);
  assertEquals(result.motors.map((motor) => motor.model_key), [
    "brand:m2:standard",
    "brand:m1:standard",
  ]);
  assertEquals(result.motors.map((motor) => motor.variant_key), [
    "variant-2",
    "variant-1",
  ]);
});

Deno.test("not_published excludes a row from the ranking denominator", () => {
  const result = compareMotorCatalogDetails(
    [
      c3CatalogDetail({ id: 1, noiseDb: 68 }),
      c3CatalogDetail({ id: 2, noiseDb: null }),
    ],
    [c3Qualification("measured"), c3Qualification("measured")],
    C3_TEST_REQUEST_ID,
  );
  const noise = rowByKey(result.rows, "noise_db");

  assertEquals(noise.values.map((cell) => cell.status), [
    "published",
    "not_published",
  ]);
  assertEquals(noise.best_index, null);
  assertEquals(noise.comparable_for_summary, false);
  assert(result.summary.every((summary) =>
    summary.total_comparable_criteria ===
      result.rows.filter((row) => row.comparable_for_summary).length
  ));
});

Deno.test("dimensions are identity checks: identical, different and indeterminate", () => {
  const identical = compareMotorCatalogDetails(
    [c3CatalogDetail({ id: 1 }), c3CatalogDetail({ id: 2 })],
    [c3Qualification("measured"), c3Qualification("measured")],
    C3_TEST_REQUEST_ID,
  );
  const different = compareMotorCatalogDetails(
    [
      c3CatalogDetail({ id: 1 }),
      c3CatalogDetail({ id: 2, dimensionValues: { H: 180 } }),
    ],
    [c3Qualification("measured"), c3Qualification("measured")],
    C3_TEST_REQUEST_ID,
  );
  const indeterminate = compareMotorCatalogDetails(
    [
      c3CatalogDetail({ id: 1 }),
      c3CatalogDetail({ id: 2, missingDimensions: ["H"] }),
    ],
    [c3Qualification("measured"), c3Qualification("measured")],
    C3_TEST_REQUEST_ID,
  );

  assertEquals(
    rowByKey(identical.rows, "dimension_h").identity_status,
    "identical",
  );
  assertEquals(
    rowByKey(different.rows, "dimension_h").identity_status,
    "different",
  );
  assertEquals(
    rowByKey(indeterminate.rows, "dimension_h").identity_status,
    "indeterminate",
  );
  for (const result of [identical, different, indeterminate]) {
    assertEquals(rowByKey(result.rows, "dimension_h").best_index, null);
  }
});

Deno.test("mixed at_threshold and measured efficiency has no winner", () => {
  const result = compareMotorCatalogDetails(
    [c3CatalogDetail({ id: 1 }), c3CatalogDetail({ id: 2 })],
    [c3Qualification("at_threshold"), c3Qualification("measured")],
    C3_TEST_REQUEST_ID,
  );
  const efficiency = rowByKey(result.rows, "efficiency_100");

  assertEquals(efficiency.values.map((cell) => cell.status), [
    "at_threshold",
    "measured",
  ]);
  assertEquals(efficiency.best_index, null);
  assertEquals(efficiency.comparable_for_summary, false);
});

Deno.test("ties have no winner and only a unique optimum enters the ranking", () => {
  const tie = compareMotorCatalogDetails(
    [
      c3CatalogDetail({ id: 1, ratedCurrentA: 28 }),
      c3CatalogDetail({ id: 2, ratedCurrentA: 28 }),
    ],
    [c3Qualification("measured"), c3Qualification("measured")],
    C3_TEST_REQUEST_ID,
  );
  const unique = compareMotorCatalogDetails(
    [
      c3CatalogDetail({ id: 1, ratedCurrentA: 24 }),
      c3CatalogDetail({ id: 2, ratedCurrentA: 28 }),
    ],
    [c3Qualification("measured"), c3Qualification("measured")],
    C3_TEST_REQUEST_ID,
  );

  assertEquals(rowByKey(tie.rows, "rated_current_a").best_index, null);
  assertEquals(
    rowByKey(tie.rows, "rated_current_a").comparable_for_summary,
    false,
  );
  assertEquals(rowByKey(unique.rows, "rated_current_a").best_index, 0);
  assertEquals(
    rowByKey(unique.rows, "rated_current_a").comparable_for_summary,
    true,
  );
});

Deno.test("comparison result is stable when child DB rows arrive in another order", () => {
  const first = c3CatalogDetail({
    id: 1,
    issues: [{ code: "CURRENT_MISMATCH" }],
  });
  const second = c3CatalogDetail({ id: 2 });
  const baseline = compareMotorCatalogDetails(
    [first, second],
    [c3Qualification("measured"), c3Qualification("measured")],
    C3_TEST_REQUEST_ID,
  );
  const reorderedFirst = {
    ...first,
    efficiency_points: [...first.efficiency_points].reverse(),
    dimensions: [...first.dimensions].reverse(),
    issues: [...first.issues].reverse(),
  };
  const reordered = compareMotorCatalogDetails(
    [reorderedFirst, second],
    [c3Qualification("measured"), c3Qualification("measured")],
    C3_TEST_REQUEST_ID,
  );

  assertEquals(reordered, baseline);
});

Deno.test("comparison service rejects duplicates before reading and propagates missing points", async () => {
  let reads = 0;
  const service = createMotorComparisonService(
    async (_auth, operation) => await operation({} as never),
    () => ({
      get: () => {
        reads += 1;
        return Promise.reject(configuratorOperatingPointNotFound());
      },
      qualify: () => Promise.resolve(c3Qualification("unqualified")),
    }),
  );

  await assertRejects(
    () =>
      service.compare(authContext, {
        operating_point_ids: ["1", "1"],
      }, C3_TEST_REQUEST_ID),
    Error,
  );
  assertEquals(reads, 0);
  await assertRejects(
    () =>
      service.compare(authContext, {
        operating_point_ids: ["1", "2"],
      }, C3_TEST_REQUEST_ID),
    Error,
  );
  assertEquals(reads, 1);
});
