import { assert, assertEquals, assertFalse } from "std/assert";

import type {
  MotorApplicationRequirements,
  MotorElectricalSpec,
} from "../../../../../shared/schemas/configurator/motor.schema.ts";
import {
  safeParseMotorElectricalApplicationCompatibilityOutput,
} from "../../../../../shared/schemas/configurator/motor.schema.ts";
import type {
  ConfiguratorEvidence,
  CriterionStatus,
} from "../../../../../shared/schemas/configurator/common.schema.ts";
import {
  aggregateMotorCompatibilityStatuses,
  type ElectricalApplicationMotorSpec,
  evaluateMotorElectricalApplicationCompatibility,
} from "./motorElectricalApplicationCompatibility.ts";

type ElectricalField = keyof MotorElectricalSpec;
type ApplicationField = keyof MotorApplicationRequirements;

const documentId = "11111111-1111-4111-8111-111111111111";
const sourceA: ConfiguratorEvidence = {
  kind: "source_page",
  label: "Catalogue constructeur A",
  source_document_id: documentId,
  filename: "catalogue-a.pdf",
  sha256: "a".repeat(64),
  pdf_page: 42,
  catalog_page: "42",
  extraction_method: "pdfplumber-table",
};
const sourceB: ConfiguratorEvidence = {
  ...sourceA,
  label: "Catalogue constructeur B",
  filename: "catalogue-b.pdf",
  sha256: "b".repeat(64),
  pdf_page: 43,
  catalog_page: "43",
};
const measurement: ConfiguratorEvidence = {
  kind: "measurement",
  label: "Exigence terrain confirmee",
};

const catalogFact = <TValue extends string | number | boolean | null>(
  value: TValue,
  unit?: string,
  evidence: ConfiguratorEvidence[] = [sourceA],
) => ({
  value,
  ...(unit ? { unit } : {}),
  origin: "catalog" as const,
  confirmation: value === null ? "unconfirmed" as const : "confirmed" as const,
  evidence: value === null ? [] : evidence,
});

const requirementFact = <TValue extends string | number | boolean>(
  value: TValue,
  unit?: string,
) => ({
  value,
  ...(unit ? { unit } : {}),
  origin: "user_measurement" as const,
  confirmation: "confirmed" as const,
  evidence: [measurement],
});

const makeElectrical = (): MotorElectricalSpec => ({
  power_kw: catalogFact(15, "kW"),
  speed_rpm: catalogFact(1470, "rpm"),
  poles: catalogFact(4),
  network: catalogFact("Reseau usine 400 V / 50 Hz"),
  frequency_hz: catalogFact(50, "Hz"),
  supply_mode: catalogFact("mains"),
  voltage_v: catalogFact(400, "V"),
  coupling: catalogFact("Y"),
  rated_current_a: catalogFact(28, "A"),
  rated_torque_nm: catalogFact(97, "N.m"),
  efficiency_class: catalogFact("IE3"),
});

const makeApplication = (): MotorApplicationRequirements => ({
  ip_rating: catalogFact("IP55"),
  brake_required: catalogFact(true),
  vfd_required: catalogFact(true),
  cooling_method: catalogFact("IC411"),
  duty_service: catalogFact("S1"),
  ambient_temperature: catalogFact(50, "degC"),
  starts_per_hour: catalogFact(20, "count"),
});

const makeSpec = (): ElectricalApplicationMotorSpec => ({
  electrical: makeElectrical(),
  application: makeApplication(),
});

const cloneSpec = (
  spec: ElectricalApplicationMotorSpec,
): ElectricalApplicationMotorSpec => structuredClone(spec);

const criterion = (
  result: ReturnType<typeof evaluateMotorElectricalApplicationCompatibility>,
  code: string,
) => {
  const found = result.criteria.find((item) => item.code === code);
  assert(found, `Critere ${code} absent`);
  return found;
};

const evaluate = (
  existing = makeSpec(),
  candidate = makeSpec(),
  applicationRequirements?: MotorApplicationRequirements,
  torqueRequirement?: MotorElectricalSpec["rated_torque_nm"],
) =>
  evaluateMotorElectricalApplicationCompatibility({
    existing,
    candidate,
    ...(applicationRequirements ? { applicationRequirements } : {}),
    ...(torqueRequirement ? { torqueRequirement } : {}),
  });

Deno.test("electrical and application compatibility validates its strict output contract", () => {
  const result = evaluate();
  const parsed = safeParseMotorElectricalApplicationCompatibilityOutput(result);
  assert(
    parsed.success,
    parsed.success ? undefined : JSON.stringify(parsed.error.issues),
  );
  assertFalse(
    safeParseMotorElectricalApplicationCompatibilityOutput({
      ...result,
      price: 100,
    }).success,
  );
});

const decisiveCases: Array<{
  name: string;
  code: string;
  field: ElectricalField;
  incompatibleValue: string | number;
  unpublishedUnit?: string;
}> = [
  {
    name: "power",
    code: "POWER",
    field: "power_kw",
    incompatibleValue: 18.5,
    unpublishedUnit: "kW",
  },
  {
    name: "poles",
    code: "POLES",
    field: "poles",
    incompatibleValue: 6,
  },
  {
    name: "frequency",
    code: "FREQUENCY",
    field: "frequency_hz",
    incompatibleValue: 60,
    unpublishedUnit: "Hz",
  },
  {
    name: "supply mode",
    code: "SUPPLY_MODE",
    field: "supply_mode",
    incompatibleValue: "vfd",
  },
  {
    name: "voltage and coupling",
    code: "VOLTAGE_COUPLING",
    field: "coupling",
    incompatibleValue: "D",
  },
];

for (const testCase of decisiveCases) {
  Deno.test(`${testCase.name} is satisfied when the published values match`, () => {
    const result = evaluate();
    assertEquals(criterion(result, testCase.code).status, "satisfied");
  });

  Deno.test(`${testCase.name} is not satisfied when published values differ`, () => {
    const candidate = makeSpec();
    const current = Reflect.get(candidate.electrical, testCase.field) as {
      unit?: string;
    };
    Reflect.set(
      candidate.electrical,
      testCase.field,
      catalogFact(testCase.incompatibleValue, current?.unit),
    );
    const result = evaluate(makeSpec(), candidate);
    assertEquals(criterion(result, testCase.code).status, "not_satisfied");
    assertEquals(result.electrical_status, "not_satisfied");
  });

  Deno.test(`${testCase.name} is indeterminate when the candidate fact is absent`, () => {
    const candidate = makeSpec();
    Reflect.deleteProperty(candidate.electrical, testCase.field);
    const result = evaluate(makeSpec(), candidate);
    assertEquals(criterion(result, testCase.code).status, "indeterminate");
    assertEquals(result.electrical_status, "indeterminate");
  });

  Deno.test(`${testCase.name} is indeterminate when the candidate fact is not published`, () => {
    const candidate = makeSpec();
    Reflect.set(
      candidate.electrical,
      testCase.field,
      catalogFact(null, testCase.unpublishedUnit),
    );
    const result = evaluate(makeSpec(), candidate);
    assertEquals(criterion(result, testCase.code).status, "indeterminate");
    assertEquals(result.electrical_status, "indeterminate");
  });
}

Deno.test("voltage and coupling remains indeterminate without a published network", () => {
  const existing = makeSpec();
  existing.electrical.network = catalogFact(null);
  const result = evaluate(existing);
  assertEquals(criterion(result, "VOLTAGE_COUPLING").status, "indeterminate");
  assert(result.missing_facts.includes("electrical.network"));
});

Deno.test("a higher current only advises protection and voltage-drop checks", () => {
  const candidate = makeSpec();
  candidate.electrical.rated_current_a = catalogFact(32, "A");
  const result = evaluate(makeSpec(), candidate);
  assertEquals(criterion(result, "CURRENT_INFORMATION").status, "satisfied");
  assertFalse(criterion(result, "CURRENT_INFORMATION").blocking);
  assertEquals(result.electrical_status, "satisfied");
  assert(
    result.checks_required.some((action) =>
      action.code === "CHECK_SUPPLY_PROTECTION"
    ),
  );
});

Deno.test("a lower torque remains informative without an explicit requirement", () => {
  const candidate = makeSpec();
  candidate.electrical.rated_torque_nm = catalogFact(90, "N.m");
  const result = evaluate(makeSpec(), candidate);
  assertEquals(criterion(result, "TORQUE_INFORMATION").status, "satisfied");
  assertFalse(criterion(result, "TORQUE_INFORMATION").blocking);
  assertEquals(result.electrical_status, "satisfied");
  assertFalse(
    result.adaptations_required.some((action) =>
      action.code === "ADAPT_TORQUE_REQUIREMENT"
    ),
  );
});

Deno.test("a lower torque fails only when an explicit torque requirement exists", () => {
  const candidate = makeSpec();
  candidate.electrical.rated_torque_nm = catalogFact(90, "N.m");
  const result = evaluate(
    makeSpec(),
    candidate,
    undefined,
    requirementFact(95, "N.m"),
  );
  assertEquals(criterion(result, "TORQUE_INFORMATION").status, "satisfied");
  assertEquals(criterion(result, "TORQUE_REQUIREMENT").status, "not_satisfied");
  assertEquals(result.electrical_status, "not_satisfied");
});

Deno.test("a different efficiency class remains non blocking", () => {
  const candidate = makeSpec();
  candidate.electrical.efficiency_class = catalogFact("IE4");
  const result = evaluate(makeSpec(), candidate);
  assertEquals(criterion(result, "EFFICIENCY_INFORMATION").status, "satisfied");
  assertFalse(criterion(result, "EFFICIENCY_INFORMATION").blocking);
  assertEquals(result.electrical_status, "satisfied");
});

Deno.test("a speed difference at the same poles and frequency reports slip only", () => {
  const candidate = makeSpec();
  candidate.electrical.speed_rpm = catalogFact(1485, "rpm");
  const result = evaluate(makeSpec(), candidate);
  assertEquals(criterion(result, "SPEED_INFORMATION").status, "satisfied");
  assertFalse(criterion(result, "SPEED_INFORMATION").blocking);
  assertEquals(result.electrical_status, "satisfied");
  assert(
    result.checks_required.some((action) => action.code === "CHECK_SPEED_SLIP"),
  );
});

Deno.test("informative differences never mask a decisive electrical failure", () => {
  const candidate = makeSpec();
  candidate.electrical.power_kw = catalogFact(18.5, "kW");
  candidate.electrical.rated_current_a = catalogFact(35, "A");
  candidate.electrical.rated_torque_nm = catalogFact(90, "N.m");
  candidate.electrical.efficiency_class = catalogFact("IE4");
  const result = evaluate(makeSpec(), candidate);
  assertEquals(result.electrical_status, "not_satisfied");
  assertEquals(criterion(result, "POWER").status, "not_satisfied");
});

const applicationCases: Array<{
  name: string;
  code: string;
  field: ApplicationField;
  requirement: ReturnType<typeof requirementFact>;
  satisfied: ReturnType<typeof catalogFact>;
  insufficient: ReturnType<typeof catalogFact>;
}> = [
  {
    name: "IP rating",
    code: "APPLICATION_IP_RATING",
    field: "ip_rating",
    requirement: requirementFact("IP55"),
    satisfied: catalogFact("IP65"),
    insufficient: catalogFact("IP44"),
  },
  {
    name: "brake",
    code: "APPLICATION_BRAKE",
    field: "brake_required",
    requirement: requirementFact(true),
    satisfied: catalogFact(true),
    insufficient: catalogFact(false),
  },
  {
    name: "VFD",
    code: "APPLICATION_VFD",
    field: "vfd_required",
    requirement: requirementFact(true),
    satisfied: catalogFact(true),
    insufficient: catalogFact(false),
  },
  {
    name: "cooling",
    code: "APPLICATION_COOLING",
    field: "cooling_method",
    requirement: requirementFact("IC411"),
    satisfied: catalogFact("ic411"),
    insufficient: catalogFact("IC416"),
  },
  {
    name: "duty service",
    code: "APPLICATION_DUTY",
    field: "duty_service",
    requirement: requirementFact("S1"),
    satisfied: catalogFact("s1"),
    insufficient: catalogFact("S2"),
  },
  {
    name: "ambient temperature",
    code: "APPLICATION_AMBIENT_TEMPERATURE",
    field: "ambient_temperature",
    requirement: requirementFact(40, "degC"),
    satisfied: catalogFact(50, "degC"),
    insufficient: catalogFact(35, "degC"),
  },
  {
    name: "starts per hour",
    code: "APPLICATION_STARTS_PER_HOUR",
    field: "starts_per_hour",
    requirement: requirementFact(10, "count"),
    satisfied: catalogFact(20, "count"),
    insufficient: catalogFact(5, "count"),
  },
];

for (const testCase of applicationCases) {
  Deno.test(`${testCase.name} has no penalty when no requirement is provided`, () => {
    const candidate = makeSpec();
    Reflect.deleteProperty(candidate.application!, testCase.field);
    const result = evaluate(makeSpec(), candidate, {});
    assertEquals(result.application_status, "satisfied");
    assertFalse(result.criteria.some((item) => item.code === testCase.code));
    assertFalse(
      result.missing_facts.includes(
        `application.${testCase.field}` as typeof result.missing_facts[number],
      ),
    );
  });

  Deno.test(`${testCase.name} is satisfied by a sufficient published capability`, () => {
    const candidate = makeSpec();
    Reflect.set(candidate.application!, testCase.field, testCase.satisfied);
    const requirements = {
      [testCase.field]: testCase.requirement,
    } as MotorApplicationRequirements;
    const result = evaluate(makeSpec(), candidate, requirements);
    assertEquals(criterion(result, testCase.code).status, "satisfied");
    assertEquals(result.application_status, "satisfied");
  });

  Deno.test(`${testCase.name} is not satisfied by an insufficient published capability`, () => {
    const candidate = makeSpec();
    Reflect.set(candidate.application!, testCase.field, testCase.insufficient);
    const requirements = {
      [testCase.field]: testCase.requirement,
    } as MotorApplicationRequirements;
    const result = evaluate(makeSpec(), candidate, requirements);
    assertEquals(criterion(result, testCase.code).status, "not_satisfied");
    assertEquals(result.application_status, "not_satisfied");
  });

  Deno.test(`${testCase.name} is indeterminate when the candidate capability is not published`, () => {
    const candidate = makeSpec();
    const unit = testCase.satisfied.unit;
    Reflect.set(
      candidate.application!,
      testCase.field,
      catalogFact(null, unit),
    );
    const requirements = {
      [testCase.field]: testCase.requirement,
    } as MotorApplicationRequirements;
    const result = evaluate(makeSpec(), candidate, requirements);
    assertEquals(criterion(result, testCase.code).status, "indeterminate");
    assertEquals(result.application_status, "indeterminate");
    assert(
      result.missing_facts.includes(
        `application.${testCase.field}` as typeof result.missing_facts[number],
      ),
    );
  });
}

Deno.test("status aggregation follows not-satisfied, indeterminate, reservation, satisfied", () => {
  const statuses: CriterionStatus[] = [
    "satisfied",
    "under_reservation",
    "indeterminate",
    "not_satisfied",
  ];
  assertEquals(aggregateMotorCompatibilityStatuses(statuses), "not_satisfied");
  assertEquals(
    aggregateMotorCompatibilityStatuses(statuses.slice(0, 3)),
    "indeterminate",
  );
  assertEquals(
    aggregateMotorCompatibilityStatuses(statuses.slice(0, 2)),
    "under_reservation",
  );
  assertEquals(aggregateMotorCompatibilityStatuses(["satisfied"]), "satisfied");
});

Deno.test("missing decisive facts are propagated and deduplicated", () => {
  const existing = makeSpec();
  const candidate = makeSpec();
  existing.electrical.power_kw = catalogFact(null, "kW");
  candidate.electrical.power_kw = catalogFact(null, "kW");
  candidate.electrical.coupling = catalogFact(null);
  const result = evaluate(existing, candidate);
  assertEquals(
    result.missing_facts.filter((path) => path === "electrical.power_kw"),
    ["electrical.power_kw"],
  );
  assert(result.missing_facts.includes("electrical.coupling"));
  assertEquals(result.electrical_status, "indeterminate");
});

Deno.test("evidence is canonical, deduplicated and independent from input order", () => {
  const existing = makeSpec();
  existing.electrical.power_kw.evidence = [sourceB, sourceA, sourceB];
  const candidate = makeSpec();
  candidate.electrical.power_kw.evidence = [sourceA, sourceB, sourceA];
  const reversedExisting = cloneSpec(existing);
  const reversedCandidate = cloneSpec(candidate);
  reversedExisting.electrical.power_kw.evidence.reverse();
  reversedCandidate.electrical.power_kw.evidence.reverse();

  const first = evaluate(existing, candidate);
  const second = evaluate(reversedExisting, reversedCandidate);
  assertEquals(first, second);
  assertEquals(criterion(first, "POWER").evidence.length, 2);
});

Deno.test("electrical and application result contains no commercial concepts", () => {
  const serialized = JSON.stringify(evaluate(
    makeSpec(),
    makeSpec(),
    { ip_rating: requirementFact("IP55") },
  ));
  for (
    const forbidden of [
      "price",
      "discount",
      "stock",
      "availability",
      "quote",
      "order",
    ]
  ) {
    assertFalse(serialized.includes(forbidden));
  }
});
