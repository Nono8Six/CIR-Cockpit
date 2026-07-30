import { assert, assertEquals } from "std/assert";

import type {
  MotorCatalogGetInput,
  MotorCatalogGetResponse,
  MotorCatalogListInput,
  MotorEquivalentCandidateResult,
} from "../../../../../shared/schemas/configurator/motor.schema.ts";
import type { AuthContext } from "../../types.ts";
import type { MotorEquivalenceCatalogReader } from "./motorEquivalence.ts";
import {
  createMotorEquivalenceService,
  rankMotorEquivalentCandidates,
} from "./motorEquivalence.ts";
import {
  C3_TEST_REQUEST_ID,
  c3CatalogDetail,
  c3ListItem,
} from "./motorC3TestFixtures_test.ts";

const authContext: AuthContext = {
  userId: "44444444-4444-4444-8444-444444444444",
  role: "tcs",
  agencyIds: [],
  activeAgencyId: null,
  isSuperAdmin: false,
};

const completeReferenceSpec = (detail: MotorCatalogGetResponse) => ({
  ...detail.from_motor_spec,
  electrical: {
    ...detail.from_motor_spec.electrical,
    network: {
      value: "Reseau usine 400 V / 50 Hz",
      origin: "nameplate" as const,
      confirmation: "confirmed" as const,
      evidence: [{
        kind: "measurement" as const,
        label: "Reseau releve sur site",
      }],
    },
  },
  mechanical: {
    ...detail.from_motor_spec.mechanical,
    frame: {
      ...detail.from_motor_spec.mechanical.frame,
      adjustment: {
        bolt_diameter: {
          value: 16,
          unit: "mm",
          origin: "user_measurement" as const,
          confirmation: "confirmed" as const,
          evidence: [{
            kind: "measurement" as const,
            label: "Diametre de boulon mesure",
          }],
        },
      },
    },
  },
});

const createService = (
  reference: MotorCatalogGetResponse,
  candidates: readonly MotorCatalogGetResponse[],
  order: readonly number[] = candidates.map((_, index) => index),
  onGet?: (input: MotorCatalogGetInput) => void,
) => {
  const byId = new Map(
    [reference, ...candidates].map((detail) => [
      detail.operating_point.id,
      detail,
    ]),
  );
  const reader: MotorEquivalenceCatalogReader = {
    list: (_input: MotorCatalogListInput) =>
      Promise.resolve({
        request_id: C3_TEST_REQUEST_ID,
        snapshot: reference.snapshot,
        items: order.map((index) => c3ListItem(candidates[index])),
        next_cursor: null,
      }),
    get: (input: MotorCatalogGetInput) => {
      onGet?.(input);
      const detail = byId.get(input.operating_point_id);
      if (!detail) {
        return Promise.reject(new Error("Point absent de la fixture"));
      }
      return Promise.resolve(detail);
    },
  };
  return createMotorEquivalenceService(
    async (_auth, operation) => await operation({} as never),
    () => reader,
  );
};

Deno.test("fromSpec nominal resolves the active snapshot dynamically and excludes legacy candidates", async () => {
  const reference = c3CatalogDetail({ id: 10 });
  const current = c3CatalogDetail({ id: 20, brand: "Current" });
  const legacy = c3CatalogDetail({
    id: 30,
    brand: "Legacy",
    lifecycle: "legacy",
  });
  const service = createService(reference, [legacy, current]);
  const result = await service.fromSpec(
    authContext,
    { ...reference.from_motor_spec, limit: 10 },
    C3_TEST_REQUEST_ID,
  );

  assertEquals(result.snapshot.id, reference.snapshot.id);
  assertEquals(result.normalized_spec.snapshot_id, reference.snapshot.id);
  assertEquals(
    result.candidates.map((item) => item.candidate.operating_point_id),
    [
      current.operating_point.id,
    ],
  );
});

Deno.test("fromMotor and fromSpec produce the same canonical result for the same normalized specification", async () => {
  const reference = c3CatalogDetail({ id: 10 });
  const candidates = [
    c3CatalogDetail({ id: 20, brand: "B Brand" }),
    c3CatalogDetail({ id: 30, brand: "A Brand" }),
  ];
  const service = createService(reference, candidates);
  const fromSpec = await service.fromSpec(
    authContext,
    { ...reference.from_motor_spec, sort: "brand", limit: 10 },
    C3_TEST_REQUEST_ID,
  );
  const fromMotor = await service.fromMotor(
    authContext,
    {
      operating_point_id: reference.operating_point.id,
      mounting: "B3",
      sort: "brand",
      limit: 10,
    },
    C3_TEST_REQUEST_ID,
  );

  assertEquals(fromMotor, fromSpec);
});

Deno.test("fromMotor accepts a legacy reference while legacy replacements stay excluded", async () => {
  const legacyReference = c3CatalogDetail({
    id: 10,
    lifecycle: "legacy",
    brand: "Legacy Reference",
  });
  const current = c3CatalogDetail({ id: 20, brand: "Current" });
  const service = createService(legacyReference, [legacyReference, current]);
  const result = await service.fromMotor(
    authContext,
    {
      operating_point_id: legacyReference.operating_point.id,
      mounting: "B3",
    },
    C3_TEST_REQUEST_ID,
  );

  assertEquals(result.candidates.length, 1);
  assertEquals(result.candidates[0].candidate.lifecycle, "current");
});

Deno.test("fromMotor forwards contracted confirmed field overrides to the catalog boundary", async () => {
  const reference = c3CatalogDetail({ id: 10 });
  const candidate = c3CatalogDetail({ id: 20 });
  const observed: MotorCatalogGetInput[] = [];
  const service = createService(reference, [candidate], undefined, (input) => {
    if (input.operating_point_id === reference.operating_point.id) {
      observed.push(input);
    }
  });
  const fieldOverrides = {
    mechanical: {
      frame: {
        dimensions: {
          H: {
            value: 160,
            unit: "mm",
            origin: "user_measurement" as const,
            confirmation: "confirmed" as const,
            evidence: [{
              kind: "measurement" as const,
              label: "Mesure terrain H",
            }],
          },
        },
      },
    },
  };
  await service.fromMotor(authContext, {
    operating_point_id: reference.operating_point.id,
    mounting: "B3",
    field_overrides: fieldOverrides,
  }, C3_TEST_REQUEST_ID);

  assertEquals(observed.at(-1)?.field_overrides, fieldOverrides);
});

Deno.test("withdrawn snapshot rows are absent when the catalog boundary returns only active rows", async () => {
  const reference = c3CatalogDetail({ id: 10 });
  const active = c3CatalogDetail({ id: 20 });
  const withdrawn = c3CatalogDetail({
    id: 30,
    snapshotId: "55555555-5555-4555-8555-555555555555",
  });
  const service = createService(reference, [active]);
  const result = await service.fromSpec(
    authContext,
    reference.from_motor_spec,
    C3_TEST_REQUEST_ID,
  );

  assertEquals(result.candidates.map((item) => item.candidate.model_key), [
    active.model.model_key,
  ]);
  assert(
    !result.candidates.some((item) =>
      item.candidate.model_key === withdrawn.model.model_key
    ),
  );
});

Deno.test("mechanical and electrical incompatibilities remain explicit and mechanical rank is second", async () => {
  const reference = c3CatalogDetail({ id: 10 });
  const electricalBlock = c3CatalogDetail({
    id: 20,
    voltageV: 690,
    coupling: "Y",
  });
  const mechanicalBlock = c3CatalogDetail({
    id: 30,
    dimensionValues: { D: 48 },
  });
  const service = createService(reference, [mechanicalBlock, electricalBlock]);
  const result = await service.fromSpec(
    authContext,
    { ...completeReferenceSpec(reference), limit: 10 },
    C3_TEST_REQUEST_ID,
  );
  assertEquals(result.candidates.map((candidate) => candidate.overall_status), [
    "not_satisfied",
    "not_satisfied",
  ]);
  assertEquals(result.candidates[0].mechanical_status, "satisfied");
  assertEquals(result.candidates[0].electrical_status, "not_satisfied");
  assertEquals(result.candidates[1].mechanical_status, "not_satisfied");
});

Deno.test("missing decisive data is indeterminate and a measurable frame delta stays under reservation", async () => {
  const reference = c3CatalogDetail({ id: 10 });
  const missing = c3CatalogDetail({ id: 20, voltageV: null });
  const reserve = c3CatalogDetail({
    id: 30,
    dimensionValues: { A: 260 },
  });
  const service = createService(reference, [reserve, missing]);
  const result = await service.fromSpec(
    authContext,
    { ...completeReferenceSpec(reference), limit: 10 },
    C3_TEST_REQUEST_ID,
  );
  const missingResult = result.candidates.find((candidate) =>
    candidate.candidate.operating_point_id === "20"
  );
  const reserveResult = result.candidates.find((candidate) =>
    candidate.candidate.operating_point_id === "30"
  );

  assertEquals(missingResult?.overall_status, "indeterminate");
  assert(missingResult?.missing_facts.includes("electrical.voltage_v"));
  assertEquals(reserveResult?.mechanical_status, "under_reservation");
});

Deno.test("issues, proofs, rules and missing facts are propagated without weighted score", async () => {
  const reference = c3CatalogDetail({ id: 10 });
  const candidate = c3CatalogDetail({
    id: 20,
    issues: [
      { code: "CURRENT_MISMATCH" },
      { code: "IE_BELOW_THRESHOLD" },
    ],
    missingDimensions: ["F"],
  });
  const service = createService(reference, [candidate]);
  const result = await service.fromSpec(
    authContext,
    reference.from_motor_spec,
    C3_TEST_REQUEST_ID,
  );
  const verdict = result.candidates[0];

  assertEquals(verdict.issues.map((issue) => issue.code), [
    "CURRENT_MISMATCH",
    "IE_BELOW_THRESHOLD",
  ]);
  assert(
    verdict.criteria.some((criterion) =>
      criterion.code === "CURRENT_INFORMATION" &&
      criterion.affected_by_issue_codes.includes("CURRENT_MISMATCH")
    ),
  );
  assert(verdict.facts_used.every((fact) => fact.evidence.length > 0));
  assert(verdict.rules_applied.length > 0);
  assert(verdict.missing_facts.includes("mechanical.shaft.F"));
  assertEquals(Reflect.has(verdict, "score"), false);
});

Deno.test("candidate DB order does not affect deterministic ranking", async () => {
  const reference = c3CatalogDetail({ id: 10 });
  const candidates = [
    c3CatalogDetail({ id: 20, brand: "B Brand" }),
    c3CatalogDetail({ id: 30, brand: "A Brand" }),
    c3CatalogDetail({ id: 40, brand: "C Brand" }),
  ];
  const forward = await createService(reference, candidates, [0, 1, 2])
    .fromSpec(
      authContext,
      { ...reference.from_motor_spec, sort: "brand", limit: 10 },
      C3_TEST_REQUEST_ID,
    );
  const reverse = await createService(reference, candidates, [2, 1, 0])
    .fromSpec(
      authContext,
      { ...reference.from_motor_spec, sort: "brand", limit: 10 },
      C3_TEST_REQUEST_ID,
    );

  assertEquals(reverse, forward);
});

Deno.test("rank order is verdict, mechanical, reservations, missing facts, user sort, then technical key", () => {
  const reference = c3CatalogDetail({ id: 10 });
  const base = c3CatalogDetail({ id: 20 });
  const service = createService(reference, [base]);
  assert(service);
  const candidate: MotorEquivalentCandidateResult = {
    candidate: c3ListItem(base).candidate,
    matched_flange: null,
    ruleset_id: "motor.compatibility.cir" as const,
    ruleset_version: 1 as const,
    mechanical_status: "satisfied" as const,
    electrical_status: "satisfied" as const,
    application_status: "satisfied" as const,
    overall_status: "satisfied" as const,
    explanation: "Tous les criteres essentiels applicables sont satisfaits.",
    criteria: [{
      code: "POWER",
      label: "Puissance",
      status: "satisfied" as const,
      blocking: true,
      expected: 15,
      observed: 15,
      explanation: "La puissance est identique.",
      evidence: base.operating_point.evidence,
      affected_by_issue_codes: [],
    }],
    adaptations_required: [],
    checks_required: [],
    facts_used: [{
      fact_path: "electrical.power_kw" as const,
      value: 15,
      unit: "kW",
      origin: "catalog" as const,
      confirmation: "confirmed" as const,
      evidence: base.operating_point.evidence,
    }],
    rules_applied: [{
      rule_code: "POWER" as const,
      ruleset_id: "motor.compatibility.cir" as const,
      ruleset_version: 1 as const,
      status: "satisfied" as const,
      decisive: true,
      fact_paths: ["electrical.power_kw" as const],
    }],
    issues: [],
    missing_facts: [],
    ranking: {
      overall_status: "satisfied" as const,
      mechanical_status: "satisfied" as const,
      reservation_count: 0,
      missing_fact_count: 0,
      requested_sort: "brand" as const,
      requested_sort_value: "B Brand",
      canonical_key: "00000000000000000020",
      evidence: base.operating_point.evidence,
    },
  };
  const worseVerdict = {
    ...candidate,
    overall_status: "indeterminate" as const,
    ranking: {
      ...candidate.ranking,
      overall_status: "indeterminate" as const,
      requested_sort_value: "A Brand",
      canonical_key: "00000000000000000001",
    },
  };

  assertEquals(
    rankMotorEquivalentCandidates([
      worseVerdict,
      candidate,
    ])[0].overall_status,
    "satisfied",
  );
});

Deno.test("ranked pagination cursor remains stable", async () => {
  const reference = c3CatalogDetail({ id: 10 });
  const candidates = [
    c3CatalogDetail({ id: 20, brand: "B Brand" }),
    c3CatalogDetail({ id: 30, brand: "A Brand" }),
  ];
  const service = createService(reference, candidates);
  const first = await service.fromSpec(
    authContext,
    { ...reference.from_motor_spec, sort: "brand", limit: 1 },
    C3_TEST_REQUEST_ID,
  );
  const second = await service.fromSpec(
    authContext,
    {
      ...reference.from_motor_spec,
      sort: "brand",
      limit: 1,
      cursor: first.next_cursor,
    },
    C3_TEST_REQUEST_ID,
  );

  assertEquals(first.candidates[0].candidate.brand, "A Brand");
  assertEquals(second.candidates[0].candidate.brand, "B Brand");
  assertEquals(second.next_cursor, null);
});
