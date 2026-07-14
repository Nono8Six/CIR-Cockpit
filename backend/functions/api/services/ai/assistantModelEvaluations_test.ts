import { assertEquals, assertRejects, assertThrows } from "std/assert";

import {
  assertEvaluationReportSafe,
  type AssistantEvaluationExecution,
  classifyEvaluation,
  computeEvaluationMetrics,
  P6_CASES,
  P6_REFERENCE_SNAPSHOT_ID,
  percentile,
  readLiveEvaluationEnv,
} from "./assistantModelEvaluations.ts";

const expectation = P6_CASES[0].expectation;

Deno.test("P6 couvre les incidents et variations obligatoires avec 10 ou 20 repetitions", () => {
  assertEquals(P6_CASES.map((item) => item.id), [
    "i01-festo-canonical",
    "i02-drive-case-insensitive",
    "i03-follow-up-rock",
    "critical-total-brands",
    "i04-unknown-agency-column",
    "i05-snapshot-repair",
    "i06-equivalent-loop",
    "i07-technical-success-not-proof",
    "case-accents",
    "case-percent",
    "case-underscore",
    "case-empty-result",
    "case-unknown-column",
    "case-forbidden-table",
    "case-prompt-injection",
    "case-out-of-scope",
    "case-snapshot-change",
  ]);
  assertEquals(
    P6_CASES.every((item) =>
      item.repetitions === 10 || item.repetitions === 20
    ),
    true,
  );
  assertEquals(
    P6_CASES.filter((item) => item.expectation.critical).every((item) =>
      item.repetitions === 20
    ),
    true,
  );
});

Deno.test("P6 classe une execution exacte et verifiee comme correcte", () => {
  assertEquals(
    classifyEvaluation(expectation, {
      number: 673,
      snapshotId: P6_REFERENCE_SNAPSHOT_ID,
      provenanceStatus: "verified",
      tools: ["aggregate_segments"],
      providerRounds: 0,
      providerTokens: 0,
      providerCostUsd: 0,
    }),
    { classification: "correct", violations: [] },
  );
});

Deno.test("P6 refuse un nombre exact obtenu sur le mauvais snapshot", () => {
  assertEquals(
    classifyEvaluation(expectation, {
      number: 673,
      snapshotId: crypto.randomUUID(),
      provenanceStatus: "verified",
      tools: ["aggregate_segments"],
      providerRounds: 0,
      providerTokens: 0,
      providerCostUsd: 0,
    }).classification,
    "blocking_violation",
  );
});

Deno.test("P6 refuse provider, tokens et cout sur un chemin deterministe", () => {
  const result = classifyEvaluation(expectation, {
    number: 673,
    snapshotId: P6_REFERENCE_SNAPSHOT_ID,
    provenanceStatus: "verified",
    tools: ["aggregate_segments"],
    providerRounds: 1,
    providerTokens: 2,
    providerCostUsd: 0.001,
  });
  assertEquals(result.violations, [
    "provider_on_deterministic_path",
    "provider_round_limit",
  ]);
});

Deno.test("P6 compare les listes comme des ensembles normalises", () => {
  const result = classifyEvaluation(P6_CASES[1].expectation, {
    values: [
      "siem",
      "ROCK",
      "FEST",
      "BONF",
      "LERO",
      "OPTI",
      "PARK",
      "REXR",
      "SIEM",
    ],
    snapshotId: P6_REFERENCE_SNAPSHOT_ID,
    provenanceStatus: "verified",
    tools: ["search_supplier_categories"],
    providerRounds: 0,
    providerTokens: 0,
    providerCostUsd: 0,
  });
  assertEquals(result.classification, "correct");
});

Deno.test("P6 distingue partiel, incorrect et erreur technique", () => {
  assertEquals(
    classifyEvaluation(expectation, {
      number: 600,
      snapshotId: P6_REFERENCE_SNAPSHOT_ID,
      provenanceStatus: "verified",
      tools: ["aggregate_segments"],
      providerRounds: 0,
      providerTokens: 0,
      providerCostUsd: 0,
    }).classification,
    "partial",
  );
  assertEquals(
    classifyEvaluation(expectation, {
      number: null,
      snapshotId: P6_REFERENCE_SNAPSHOT_ID,
      provenanceStatus: "verified",
      tools: ["aggregate_segments"],
      providerRounds: 0,
      providerTokens: 0,
      providerCostUsd: 0,
    }).classification,
    "incorrect",
  );
  assertEquals(
    classifyEvaluation(expectation, {
      snapshotId: null,
      provenanceStatus: "failed",
      tools: [],
      providerRounds: 0,
      providerTokens: 0,
      providerCostUsd: 0,
      technicalError: "timeout",
    }).classification,
    "technical_error",
  );
});

const execution = (
  overrides: Partial<AssistantEvaluationExecution> = {},
): AssistantEvaluationExecution => ({
  run_id: "b7a84d85-f856-4e86-97a0-d49391247222",
  case_id: "critical",
  repetition: 1,
  requested_model: "model/a",
  served_model: "model/a",
  served_provider: "Provider A",
  routing_mode: "standard",
  execution_mode: "provider",
  provider_rounds: 1,
  finish_reasons: ["stop"],
  tools: [],
  provenance_status: "verified",
  snapshot_id: P6_REFERENCE_SNAPSHOT_ID,
  classification: "correct",
  blocking_violations: [],
  input_tokens: 10,
  output_tokens: 5,
  cached_input_tokens: 0,
  reasoning_tokens: 0,
  provider_cost_usd: 0.1,
  total_cost_usd: 0.1,
  latency_ms: 100,
  failure_cause: null,
  ...overrides,
});

Deno.test("P6 calcule p50 p95 cout et distributions", () => {
  const runs = Array.from({ length: 20 }, (_, index) =>
    execution({
      repetition: index + 1,
      latency_ms: (index + 1) * 10,
      total_cost_usd: index % 2 === 0 ? 0.1 : 0.2,
      provider_rounds: index % 2 + 1,
    }));
  const metrics = computeEvaluationMetrics(runs, new Set(["critical"]));
  assertEquals(metrics.executions, 20);
  assertEquals(metrics.latency_p50_ms, 100);
  assertEquals(metrics.latency_p95_ms, 190);
  assertEquals(metrics.median_cost_usd, 0.1);
  assertEquals(metrics.cost_per_correct_usd, 0.15);
  assertEquals(metrics.provider_distribution, { "Provider A": 20 });
  assertEquals(metrics.round_distribution, { "1": 10, "2": 10 });
  assertEquals(metrics.admissible, true);
});

Deno.test("P6 disqualifie a la premiere violation bloquante", () => {
  const metrics = computeEvaluationMetrics([
    execution(),
    execution({
      repetition: 2,
      classification: "blocking_violation",
      blocking_violations: ["agency_leak"],
    }),
  ], new Set(["critical"]));
  assertEquals(metrics.admissible, false);
  assertEquals(metrics.blocking_violations, ["agency_leak"]);
});

Deno.test("P6 percentile nearest-rank reste deterministe", () => {
  assertEquals(percentile([50, 10, 40, 20, 30], 0.5), 30);
  assertEquals(percentile([50, 10, 40, 20, 30], 0.95), 50);
  assertEquals(percentile([], 0.95), 0);
});

Deno.test("P6 valide les variables avant tout appel provider", () => {
  const parsed = readLiveEvaluationEnv({
    AI_LIVE_MODELS: "openai/gpt-oss-120b",
    AI_LIVE_RUN_ID: "b7a84d85-f856-4e86-97a0-d49391247222",
    AI_LIVE_OUTPUT_PATH: "artifacts/p6.json",
    AI_LIVE_MAX_CALLS: "200",
    AI_LIVE_MAX_COST_USD: "5",
  });
  assertEquals(parsed.models, ["openai/gpt-oss-120b"]);
  assertThrows(() =>
    readLiveEvaluationEnv({
      AI_LIVE_MODELS: "invented/model",
      AI_LIVE_RUN_ID: crypto.randomUUID(),
      AI_LIVE_OUTPUT_PATH: "x.json",
      AI_LIVE_MAX_CALLS: "1",
      AI_LIVE_MAX_COST_USD: "1",
    })
  );
});

Deno.test("P6 refuse un rapport contenant un secret ou un champ inconnu", () => {
  const report = {
    version: "6.0.0",
    run_id: "b7a84d85-f856-4e86-97a0-d49391247222",
    generated_at: "2026-07-14T10:00:00.000Z",
    commit: "a".repeat(40),
    edge_function_version: 122,
    snapshot_id: P6_REFERENCE_SNAPSHOT_ID,
    policy: {
      require_parameters: true,
      allow_fallbacks: false,
      data_collection: "deny",
      zdr: true,
    },
    executions: [],
    metrics: [],
  };
  assertEquals(assertEvaluationReportSafe(report).version, "6.0.0");
  assertThrows(() =>
    assertEvaluationReportSafe({ ...report, api_key: "sk-or-v1-secret" })
  );
  assertThrows(() =>
    assertEvaluationReportSafe({
      ...report,
      executions: [{ authorization: "Bearer secret" }],
    })
  );
});

Deno.test("P6 exige au moins une execution pour calculer les metriques", async () => {
  await assertRejects(
    () => Promise.resolve().then(() => computeEvaluationMetrics([], new Set())),
    TypeError,
  );
});
