import { assert, assertEquals } from "std/assert";

import type {
  MotorAdviceInput,
  MotorEquivalentCandidateResult,
} from "../../../../../shared/schemas/configurator/motor.schema.ts";
import { buildMotorAdvice, motorAdviceService } from "./motorAdvice.ts";
import {
  c3CatalogDetail,
  c3CatalogEvidence,
  c3ListItem,
  c3Qualification,
} from "./motorC3TestFixtures_test.ts";
import { computeMotorEnergyFromCatalog } from "./motorEnergy.ts";

const candidateResult = (
  overrides: Partial<MotorEquivalentCandidateResult> = {},
): MotorEquivalentCandidateResult => {
  const detail = c3CatalogDetail({ id: 20 });
  return {
    candidate: c3ListItem(detail).candidate,
    matched_flange: null,
    ruleset_id: "motor.compatibility.cir",
    ruleset_version: 1,
    mechanical_status: "satisfied",
    electrical_status: "satisfied",
    application_status: "satisfied",
    overall_status: "satisfied",
    explanation: "Tous les criteres essentiels applicables sont satisfaits.",
    criteria: [{
      code: "POWER",
      label: "Puissance nominale",
      status: "satisfied",
      blocking: true,
      expected: 15,
      observed: 15,
      unit: "kW",
      explanation: "La puissance est identique.",
      evidence: c3CatalogEvidence,
      affected_by_issue_codes: [],
    }],
    adaptations_required: [],
    checks_required: [],
    facts_used: [{
      fact_path: "electrical.power_kw",
      value: 15,
      unit: "kW",
      origin: "catalog",
      confirmation: "confirmed",
      evidence: c3CatalogEvidence,
    }],
    rules_applied: [{
      rule_code: "POWER",
      ruleset_id: "motor.compatibility.cir",
      ruleset_version: 1,
      status: "satisfied",
      decisive: true,
      fact_paths: ["electrical.power_kw"],
    }],
    issues: [],
    missing_facts: [],
    ranking: {
      overall_status: "satisfied",
      mechanical_status: "satisfied",
      reservation_count: 0,
      missing_fact_count: 0,
      requested_sort: "compatibility",
      requested_sort_value: "satisfied",
      canonical_key: "00000000000000000020",
      evidence: c3CatalogEvidence,
    },
    ...overrides,
  };
};

Deno.test("advice keeps blocking adaptation first", () => {
  const result = buildMotorAdvice({
    candidate: candidateResult({
      overall_status: "not_satisfied",
      adaptations_required: [{
        code: "ADAPT_SHAFT_D",
        label: "Adapter le diametre d arbre",
        explanation: "Le diametre D differe.",
        evidence: c3CatalogEvidence,
      }],
    }),
  });

  assertEquals(result.advice[0].code, "ADAPT_SHAFT_D");
  assertEquals(result.advice[0].severity, "critical");
});

Deno.test("advice converts an electrical control and missing fact into sourced actions", () => {
  const result = buildMotorAdvice({
    candidate: candidateResult({
      checks_required: [{
        code: "CHECK_SUPPLY_PROTECTION",
        label: "Verifier la protection et la chute de tension",
        explanation: "Le courant candidat est superieur.",
        evidence: c3CatalogEvidence,
      }],
      missing_facts: ["electrical.voltage_v"],
    }),
  });

  assert(
    result.advice.some((advice) =>
      advice.code === "CHECK_SUPPLY_PROTECTION" &&
      advice.category === "electrical"
    ),
  );
  assert(
    result.advice.some((advice) =>
      advice.code === "MEASURE_ELECTRICAL_VOLTAGE_V" &&
      advice.missing_facts.includes("electrical.voltage_v")
    ),
  );
  assert(result.advice.every((advice) => advice.evidence.length > 0));
});

Deno.test("advice implements all four special catalogue issue restrictions", () => {
  const detail = c3CatalogDetail({
    issues: [
      { code: "CURRENT_MISMATCH" },
      { code: "IE_BELOW_THRESHOLD" },
      { code: "EFFICIENCY_CURVE" },
      { code: "INERTIA_IMPLAUSIBLE" },
    ],
  });
  const energy = computeMotorEnergyFromCatalog(
    detail,
    { load_points: [{ load_fraction: 1, hours_per_year: 1_000 }] },
    c3Qualification("unqualified"),
  );
  const input: MotorAdviceInput = {
    candidate: candidateResult({
      issues: detail.issues.map((issue) => ({
        code: issue.code,
        severity: issue.severity,
        message: issue.message,
        restriction: issue.restriction,
        evidence: issue.evidence,
      })),
    }),
    energy,
  };
  const result = buildMotorAdvice(input);

  assertEquals(
    new Set(result.advice.map((advice) => advice.code)),
    new Set([
      "CURRENT_MISMATCH",
      "IE_BELOW_THRESHOLD",
      "EFFICIENCY_CURVE",
      "INERTIA_IMPLAUSIBLE",
    ]),
  );
  assert(
    result.advice.find((advice) => advice.code === "EFFICIENCY_CURVE")
      ?.severity === "warning",
  );
  assert(
    result.advice.find((advice) => advice.code === "INERTIA_IMPLAUSIBLE")
      ?.action.includes("Confirmer"),
  );
});

Deno.test("advice is deduplicated and canonical regardless of input order", () => {
  const firstCheck = {
    code: "CHECK_SUPPLY_PROTECTION",
    label: "Verifier la protection",
    explanation: "Controle electrique requis.",
    evidence: c3CatalogEvidence,
  };
  const secondCheck = {
    code: "CHECK_SPEED_SLIP",
    label: "Verifier le glissement",
    explanation: "Controle de vitesse requis.",
    evidence: c3CatalogEvidence,
  };
  const first = buildMotorAdvice({
    candidate: candidateResult({
      checks_required: [secondCheck, firstCheck, firstCheck],
    }),
  });
  const second = buildMotorAdvice({
    candidate: candidateResult({
      checks_required: [firstCheck, secondCheck],
    }),
  });

  assertEquals(first, second);
  assertEquals(first.advice.map((advice) => advice.code), [
    "CHECK_SPEED_SLIP",
    "CHECK_SUPPLY_PROTECTION",
  ]);
});

Deno.test("advice invents no application penalty when none is required", () => {
  const result = motorAdviceService.build({
    candidate: candidateResult(),
  });

  assertEquals(result.advice, []);
});

Deno.test("advice output refuses unsupported commercial fields", () => {
  let rejected = false;
  try {
    motorAdviceService.build({
      candidate: candidateResult(),
      price: 1,
    });
  } catch {
    rejected = true;
  }
  assert(rejected);
});
