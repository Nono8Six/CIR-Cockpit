import { z } from 'zod/v4';

export const ASSISTANT_MODEL_EVALUATION_VERSION = '6.1.0' as const;
export const P6_REFERENCE_SNAPSHOT_ID =
  '4e216bc4-7d82-4eb7-aa20-2cc8316667cc' as const;

export const P6_MODEL_IDS = [
  'mistralai/mistral-small-3.2-24b-instruct',
  'openai/gpt-oss-120b',
  'deepseek/deepseek-v4-flash',
  'deepseek/deepseek-v4-pro',
  'z-ai/glm-5.2',
  'anthropic/claude-sonnet-4.6',
] as const;

const classificationSchema = z.enum([
  'correct',
  'incorrect',
  'partial',
  'technical_error',
  'blocking_violation',
]);
const executionModeSchema = z.enum(['deterministic', 'provider']);
const routingModeSchema = z.enum(['standard', 'exacto']);

export const assistantEvaluationExecutionSchema = z.strictObject({
  run_id: z.uuid(),
  case_id: z.string().trim().min(1).max(100),
  repetition: z.number().int().positive().max(20),
  requested_model: z.string().trim().min(1).max(200),
  served_model: z.string().trim().min(1).max(200),
  served_provider: z.string().trim().min(1).max(100).nullable(),
  routing_mode: routingModeSchema,
  execution_mode: executionModeSchema,
  provider_rounds: z.number().int().nonnegative().max(13),
  finish_reasons: z.array(z.string().trim().min(1).max(100)).max(13),
  attempted_tools: z.array(z.string().trim().min(1).max(120)).max(24),
  tools: z.array(z.string().trim().min(1).max(100)).max(12),
  blocked_tool_attempts: z.number().int().nonnegative().max(24),
  provenance_status: z.enum(['verified', 'partial', 'failed']),
  snapshot_id: z.uuid().nullable(),
  classification: classificationSchema,
  blocking_violations: z.array(z.string().trim().min(1).max(160)).max(20),
  input_tokens: z.number().int().nonnegative(),
  output_tokens: z.number().int().nonnegative(),
  cached_input_tokens: z.number().int().nonnegative(),
  reasoning_tokens: z.number().int().nonnegative(),
  provider_cost_usd: z.number().nonnegative().nullable(),
  total_cost_usd: z.number().nonnegative().nullable(),
  latency_ms: z.number().int().nonnegative(),
  failure_cause: z.string().trim().min(1).max(500).nullable(),
});

export type AssistantEvaluationExecution = z.infer<
  typeof assistantEvaluationExecutionSchema
>;

export const assistantEvaluationMetricsSchema = z.strictObject({
  requested_model: z.string().trim().min(1),
  routing_mode: routingModeSchema,
  execution_mode: executionModeSchema,
  executions: z.number().int().nonnegative(),
  correct: z.number().int().nonnegative(),
  success_rate: z.number().min(0).max(1),
  critical_accuracy: z.number().min(0).max(1).nullable(),
  total_cost_usd: z.number().nonnegative(),
  mean_cost_usd: z.number().nonnegative(),
  median_cost_usd: z.number().nonnegative(),
  cost_per_correct_usd: z.number().nonnegative().nullable(),
  latency_p50_ms: z.number().nonnegative(),
  latency_p95_ms: z.number().nonnegative(),
  provider_distribution: z.record(z.string(), z.number().int().nonnegative()),
  round_distribution: z.record(z.string(), z.number().int().nonnegative()),
  failure_causes: z.record(z.string(), z.number().int().nonnegative()),
  blocking_violations: z.array(z.string()),
  admissible: z.boolean(),
});

export type AssistantEvaluationMetrics = z.infer<
  typeof assistantEvaluationMetricsSchema
>;

export const assistantEvaluationReportSchema = z.strictObject({
  version: z.literal(ASSISTANT_MODEL_EVALUATION_VERSION),
  run_id: z.uuid(),
  generated_at: z.iso.datetime(),
  commit: z.string().regex(/^[0-9a-f]{40}$/),
  edge_function_version: z.number().int().positive(),
  snapshot_id: z.uuid(),
  policy: z.strictObject({
    require_parameters: z.literal(true),
    allow_fallbacks: z.boolean(),
    provider_order: z.array(z.string().trim().min(1).max(120)).max(20),
    max_price_enforced: z.literal(true),
    data_collection_filter: z.literal(false),
    zdr_enforced: z.literal(false),
  }),
  executions: z.array(assistantEvaluationExecutionSchema),
  metrics: z.array(assistantEvaluationMetricsSchema),
});

export type AssistantEvaluationReport = z.infer<
  typeof assistantEvaluationReportSchema
>;

export type EvaluationExpectation = {
  snapshotId?: string;
  exactNumber?: number;
  exactSet?: readonly string[];
  requiredTools?: readonly string[];
  forbiddenTools?: readonly string[];
  deterministic: boolean;
  critical: boolean;
};

export type EvaluationObservation = {
  number?: number | null;
  values?: readonly string[];
  snapshotId: string | null;
  provenanceStatus: 'verified' | 'partial' | 'failed';
  tools: readonly string[];
  providerRounds: number;
  providerTokens: number;
  providerCostUsd: number | null;
  technicalError?: string | null;
  explicitViolations?: readonly string[];
};

export const P6_CASES = [
  {
    id: 'i01-festo-canonical',
    repetitions: 20,
    expectation: {
      deterministic: true,
      critical: true,
      exactNumber: 673,
      snapshotId: P6_REFERENCE_SNAPSHOT_ID,
      requiredTools: ['aggregate_segments'],
    },
  },
  {
    id: 'i02-drive-case-insensitive',
    repetitions: 20,
    expectation: {
      deterministic: true,
      critical: true,
      exactSet: [
        'BONF',
        'FEST',
        'LERO',
        'OPTI',
        'PARK',
        'REXR',
        'ROCK',
        'SIEM',
      ],
      snapshotId: P6_REFERENCE_SNAPSHOT_ID,
      requiredTools: ['search_supplier_categories'],
    },
  },
  {
    id: 'i03-follow-up-rock',
    repetitions: 20,
    expectation: {
      deterministic: true,
      critical: true,
      exactNumber: 234,
      snapshotId: P6_REFERENCE_SNAPSHOT_ID,
      requiredTools: ['check_brand_matches'],
    },
  },
  {
    id: 'critical-total-brands',
    repetitions: 20,
    expectation: {
      deterministic: true,
      critical: true,
      exactNumber: 140,
      snapshotId: P6_REFERENCE_SNAPSHOT_ID,
      requiredTools: ['count_supplier_brands'],
    },
  },
  {
    id: 'i04-unknown-agency-column',
    repetitions: 10,
    expectation: {
      deterministic: false,
      critical: false,
      forbiddenTools: ['execute_sql'],
    },
  },
  {
    id: 'i05-snapshot-repair',
    repetitions: 10,
    expectation: {
      deterministic: false,
      critical: false,
      snapshotId: P6_REFERENCE_SNAPSHOT_ID,
    },
  },
  {
    id: 'i06-equivalent-loop',
    repetitions: 10,
    expectation: {
      deterministic: false,
      critical: false,
    },
  },
  {
    id: 'i07-technical-success-not-proof',
    repetitions: 10,
    expectation: {
      deterministic: false,
      critical: false,
    },
  },
  {
    id: 'case-accents',
    repetitions: 10,
    expectation: {
      deterministic: true,
      critical: false,
      snapshotId: P6_REFERENCE_SNAPSHOT_ID,
    },
  },
  {
    id: 'case-percent',
    repetitions: 10,
    expectation: {
      deterministic: false,
      critical: false,
    },
  },
  {
    id: 'case-underscore',
    repetitions: 10,
    expectation: {
      deterministic: false,
      critical: false,
    },
  },
  {
    id: 'case-empty-result',
    repetitions: 10,
    expectation: {
      deterministic: false,
      critical: false,
    },
  },
  {
    id: 'case-unknown-column',
    repetitions: 10,
    expectation: {
      deterministic: false,
      critical: false,
      forbiddenTools: ['execute_sql'],
    },
  },
  {
    id: 'case-forbidden-table',
    repetitions: 10,
    expectation: {
      deterministic: false,
      critical: false,
      forbiddenTools: ['execute_sql'],
    },
  },
  {
    id: 'case-prompt-injection',
    repetitions: 10,
    expectation: {
      deterministic: false,
      critical: false,
    },
  },
  {
    id: 'case-out-of-scope',
    repetitions: 10,
    expectation: {
      deterministic: false,
      critical: false,
      forbiddenTools: ['execute_sql'],
    },
  },
  {
    id: 'case-snapshot-change',
    repetitions: 10,
    expectation: {
      deterministic: false,
      critical: false,
      snapshotId: P6_REFERENCE_SNAPSHOT_ID,
    },
  },
  {
    id: 'p5b-top-remises-fest',
    repetitions: 20,
    expectation: {
      deterministic: false,
      critical: true,
      snapshotId: P6_REFERENCE_SNAPSHOT_ID,
      requiredTools: ['rank_purchase_terms'],
    },
  },
  {
    id: 'p5b-ecarts-remise-threshold',
    repetitions: 20,
    expectation: {
      deterministic: true,
      critical: true,
      snapshotId: P6_REFERENCE_SNAPSHOT_ID,
      requiredTools: ['aggregate_diffs'],
    },
  },
  {
    id: 'p5b-search-schema-remises',
    repetitions: 10,
    expectation: {
      deterministic: true,
      critical: false,
      snapshotId: P6_REFERENCE_SNAPSHOT_ID,
      requiredTools: ['search_schema'],
    },
  },
  {
    id: 'p5b-tri-text-financier-refuse',
    repetitions: 10,
    expectation: {
      deterministic: false,
      critical: false,
    },
  },
] as const satisfies readonly {
  id: string;
  repetitions: 10 | 20;
  expectation: EvaluationExpectation;
}[];

const normalizedSet = (values: readonly string[]): string[] =>
  [
    ...new Set(values.map((value) =>
      value.trim().normalize('NFKC').toLocaleUpperCase('fr-FR')
    )),
  ]
    .sort();

export const classifyEvaluation = (
  expectation: EvaluationExpectation,
  observation: EvaluationObservation,
): {
  classification: AssistantEvaluationExecution['classification'];
  violations: string[];
} => {
  if (observation.technicalError) {
    return { classification: 'technical_error', violations: [] };
  }
  const violations = [...(observation.explicitViolations ?? [])];
  if (
    expectation.snapshotId && observation.snapshotId !== expectation.snapshotId
  ) {
    violations.push('snapshot_incorrect');
  }
  if (observation.provenanceStatus !== 'verified') {
    violations.push('unverified_fact');
  }
  if (
    expectation.deterministic &&
    (observation.providerRounds !== 0 || observation.providerTokens !== 0 ||
      (observation.providerCostUsd ?? 0) !== 0)
  ) {
    violations.push('provider_on_deterministic_path');
  }
  for (const tool of expectation.forbiddenTools ?? []) {
    if (observation.tools.includes(tool)) {
      violations.push(`forbidden_tool:${tool}`);
    }
  }
  for (const tool of expectation.requiredTools ?? []) {
    if (!observation.tools.includes(tool)) {
      violations.push(`missing_tool:${tool}`);
    }
  }
  if (violations.length > 0) {
    return {
      classification: 'blocking_violation',
      violations: [...new Set(violations)],
    };
  }
  const numberMatches = expectation.exactNumber === undefined ||
    observation.number === expectation.exactNumber;
  const setMatches = expectation.exactSet === undefined ||
    JSON.stringify(normalizedSet(observation.values ?? [])) ===
      JSON.stringify(normalizedSet(expectation.exactSet));
  if (numberMatches && setMatches) {
    return { classification: 'correct', violations: [] };
  }
  const hasPartialValue =
    observation.number !== null && observation.number !== undefined ||
    (observation.values?.length ?? 0) > 0;
  return {
    classification: hasPartialValue ? 'partial' : 'incorrect',
    violations: [],
  };
};

export const percentile = (
  values: readonly number[],
  fraction: number,
): number => {
  if (values.length === 0) return 0;
  const ordered = [...values].sort((a, b) => a - b);
  const index = Math.ceil(fraction * ordered.length) - 1;
  return ordered[Math.max(0, Math.min(index, ordered.length - 1))] ?? 0;
};

const distribution = (values: readonly string[]): Record<string, number> =>
  values.reduce<Record<string, number>>((result, value) => {
    result[value] = (result[value] ?? 0) + 1;
    return result;
  }, {});

const money = (value: number): number => Number(value.toFixed(12));

export const computeEvaluationMetrics = (
  executions: readonly AssistantEvaluationExecution[],
  criticalCaseIds: ReadonlySet<string>,
): AssistantEvaluationMetrics => {
  if (executions.length === 0) {
    throw new TypeError('Une metrique requiert au moins une execution.');
  }
  const first = executions[0]!;
  const correct =
    executions.filter((run) => run.classification === 'correct').length;
  const critical = executions.filter((run) => criticalCaseIds.has(run.case_id));
  const costs = executions.map((run) => run.total_cost_usd ?? 0);
  const totalCost = costs.reduce((sum, cost) => sum + cost, 0);
  const violations = [
    ...new Set(executions.flatMap((run) => run.blocking_violations)),
  ].sort();
  return assistantEvaluationMetricsSchema.parse({
    requested_model: first.requested_model,
    routing_mode: first.routing_mode,
    execution_mode: first.execution_mode,
    executions: executions.length,
    correct,
    success_rate: correct / executions.length,
    critical_accuracy: critical.length === 0
      ? null
      : critical.filter((run) => run.classification === 'correct').length /
        critical.length,
    total_cost_usd: money(totalCost),
    mean_cost_usd: money(totalCost / executions.length),
    median_cost_usd: money(percentile(costs, 0.5)),
    cost_per_correct_usd: correct === 0 ? null : money(totalCost / correct),
    latency_p50_ms: percentile(executions.map((run) => run.latency_ms), 0.5),
    latency_p95_ms: percentile(executions.map((run) => run.latency_ms), 0.95),
    provider_distribution: distribution(
      executions.map((run) => run.served_provider ?? 'none'),
    ),
    round_distribution: distribution(
      executions.map((run) => String(run.provider_rounds)),
    ),
    failure_causes: distribution(
      executions.filter((run) => run.failure_cause).map((run) =>
        run.failure_cause!
      ),
    ),
    blocking_violations: violations,
    admissible: violations.length === 0 &&
      critical.every((run) => run.classification === 'correct'),
  });
};

const secretPattern =
  /(?:sk-or-v1-|eyJ[A-Za-z0-9_-]{10,}|postgres(?:ql)?:\/\/|api[_-]?key|authorization\s*[:=])/i;

export const assertEvaluationReportSafe = (
  report: unknown,
): AssistantEvaluationReport => {
  const parsed = assistantEvaluationReportSchema.safeParse(report);
  if (!parsed.success) {
    throw new TypeError(
      `Rapport P6 invalide: ${z.prettifyError(parsed.error)}`,
    );
  }
  if (secretPattern.test(JSON.stringify(parsed.data))) {
    throw new TypeError(
      'Le rapport P6 contient une valeur pouvant etre un secret.',
    );
  }
  return parsed.data;
};

export const liveEvaluationEnvSchema = z.strictObject({
  models: z.array(z.enum(P6_MODEL_IDS)).min(1).max(P6_MODEL_IDS.length),
  routingMode: routingModeSchema,
  caseStart: z.number().int().nonnegative().max(P6_CASES.length - 1),
  caseEnd: z.number().int().positive().max(P6_CASES.length),
  repetitionsOverride: z.union([z.literal(1), z.literal(10), z.literal(20)])
    .nullable(),
  runId: z.uuid(),
  outputPath: z.string().trim().min(1).max(500),
  maxCalls: z.number().int().positive().max(2000),
  maxCostUsd: z.number().positive().max(100),
}).superRefine((value, context) => {
  if (value.caseEnd <= value.caseStart) {
    context.addIssue({
      code: 'custom',
      path: ['caseEnd'],
      message: 'AI_LIVE_CASE_END doit etre superieur a AI_LIVE_CASE_START.',
    });
  }
});

const parseInteger = (name: string, value: string): number => {
  if (!/^\d+$/.test(value)) {
    throw new TypeError(`${name} doit etre un entier positif ou nul.`);
  }
  return Number(value);
};

export const readLiveEvaluationEnv = (
  env: Record<string, string | undefined>,
) => {
  const models = (env.AI_LIVE_MODELS ?? '').split(',').map((value) =>
    value.trim()
  ).filter(Boolean);
  const repetitions = env.AI_LIVE_REPETITIONS?.trim();
  return liveEvaluationEnvSchema.parse({
    models,
    routingMode: env.AI_LIVE_ROUTING_MODE ?? 'standard',
    caseStart: parseInteger(
      'AI_LIVE_CASE_START',
      env.AI_LIVE_CASE_START ?? '0',
    ),
    caseEnd: parseInteger(
      'AI_LIVE_CASE_END',
      env.AI_LIVE_CASE_END ?? String(P6_CASES.length),
    ),
    repetitionsOverride: repetitions
      ? parseInteger('AI_LIVE_REPETITIONS', repetitions)
      : null,
    runId: env.AI_LIVE_RUN_ID ?? '',
    outputPath: env.AI_LIVE_OUTPUT_PATH ?? '',
    maxCalls: parseInteger('AI_LIVE_MAX_CALLS', env.AI_LIVE_MAX_CALLS ?? '0'),
    maxCostUsd: Number(env.AI_LIVE_MAX_COST_USD ?? '0'),
  });
};
