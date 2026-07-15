import { z } from 'zod/v4';

import {
  aiDiagnosisCostSchema,
  aiDiagnosisUsageSchema,
  apiSuccessSchema,
  nonEmptyStringSchema,
  nullableTextSchema,
  uuidSchema,
} from './ai.schema.ts';

const jsonObjectSchema = z.record(z.string(), z.json());

export const aiAssistantPageContextSchema = z.strictObject({
  surface: z.enum(['pricing.references'], {
    error: 'Surface assistant invalide.',
  }).optional(),
  import_id: uuidSchema.optional(),
  run_id: uuidSchema.optional(),
  target_snapshot_id: uuidSchema.optional(),
  base_snapshot_id: uuidSchema.nullable().optional(),
  active_tab: z.string().trim().min(1, { error: 'Onglet actif invalide.' }).max(
    80,
    { error: 'Onglet actif trop long.' },
  ).optional(),
  file_kind: z.enum(['classification', 'segments_grids'], {
    error: 'Type de fichier invalide.',
  }).optional(),
});

export const aiAssistantMessageSchema = z.strictObject({
  role: z.enum(['user', 'assistant'], { error: 'Role de message invalide.' }),
  content: z.string().trim().min(1, { error: 'Message requis.' }).max(4000, {
    error: 'Message trop long.',
  }),
});

const assistantBoundedTermsSchema = z.array(
  z.string().trim().min(1, { error: 'Terme de contexte requis.' }).max(80, {
    error: 'Terme de contexte trop long.',
  }),
).max(8, { error: 'Maximum 8 termes de contexte.' });

const assistantBoundedBrandsSchema = z.array(
  z.string().trim().min(1, { error: 'Marque de contexte requise.' }).max(
    120,
    { error: 'Marque de contexte trop longue.' },
  ),
).max(50, { error: 'Maximum 50 marques de contexte.' });

const aiAssistantConversationContextBaseShape = {
  version: z.literal(1),
  surface: z.literal('pricing.references'),
  domain: z.literal('pricing_references'),
  import_id: uuidSchema.nullable(),
  created_at: z.iso.datetime({ error: 'Date de contexte invalide.' }),
  expires_at: z.iso.datetime({ error: 'Expiration de contexte invalide.' }),
};

const aiAssistantResultConversationContextSchema = z.strictObject({
  ...aiAssistantConversationContextBaseShape,
  kind: z.literal('result'),
  intent: z.enum([
    'segment_count',
    'supplier_category_search',
    'supplier_brand_count',
    'supplier_brand_check',
  ]),
  dimension: z.enum(['cat_fab', 'brand']),
  snapshot_id: uuidSchema,
  filters: z.strictObject({
    requested_terms: assistantBoundedTermsSchema,
    canonical_terms: assistantBoundedTermsSchema,
    query_terms: assistantBoundedTermsSchema,
    marques: assistantBoundedBrandsSchema,
    mode: z.enum(['any', 'all']),
  }),
  result_summary: z.strictObject({
    matching_brands: assistantBoundedBrandsSchema,
    distinct_brand_count: z.number().int().nonnegative(),
    segment_rows: z.number().int().nonnegative(),
  }),
});

const aiAssistantPendingClarificationContextSchema = z.strictObject({
  ...aiAssistantConversationContextBaseShape,
  kind: z.literal('pending_clarification'),
  intent: z.literal('supplier_category_search'),
  requested_terms: assistantBoundedTermsSchema.min(1, {
    error: 'Une clarification requiert au moins un terme.',
  }),
  options: z.tuple([z.literal('cat_fab'), z.literal('fam_cir')]),
  target_snapshot_id: uuidSchema.nullable(),
});

export const aiAssistantConversationContextSchema = z.discriminatedUnion(
  'kind',
  [
    aiAssistantResultConversationContextSchema,
    aiAssistantPendingClarificationContextSchema,
  ],
);

export const aiAssistantAskInputSchema = z.strictObject({
  client_request_id: uuidSchema,
  question: z.string().trim().min(1, { error: 'Question requise.' }).max(2000, {
    error: 'Question trop longue.',
  }),
  history: z.array(aiAssistantMessageSchema).max(12, {
    error: 'Historique limite a 12 messages.',
  }).default([]),
  page_context: aiAssistantPageContextSchema,
  conversation_context: aiAssistantConversationContextSchema.nullable()
    .default(null),
});

export const aiAssistantCitationSchema = z.strictObject({
  tool: nonEmptyStringSchema('Nom outil requis.'),
  label: nonEmptyStringSchema('Libelle source requis.'),
  ref: jsonObjectSchema,
});

const aiAssistantPublicValueSchema = z.union([
  z.string().max(4000),
  z.number().finite(),
  z.boolean(),
  z.null(),
  z.array(z.union([z.string().max(160), z.number().finite(), z.boolean()])).max(
    50,
  ),
]);

export const aiAssistantEvidenceFactSchema = z.strictObject({
  label: z.string().trim().min(1).max(160),
  tool: z.string().trim().min(1).max(80),
  snapshot_id: uuidSchema,
  result_field: z.string().trim().min(1).max(120),
  source_value: aiAssistantPublicValueSchema,
  displayed_value: aiAssistantPublicValueSchema,
  derivation: z.enum(['direct', 'count']),
}).superRefine((fact, context) => {
  if (fact.derivation === 'count') {
    if (
      !Array.isArray(fact.source_value) ||
      fact.displayed_value !== fact.source_value.length
    ) {
      context.addIssue({
        code: 'custom',
        message:
          'Le compte derive doit correspondre a la taille de la liste source.',
        path: ['displayed_value'],
      });
    }
  } else if (
    JSON.stringify(fact.source_value) !== JSON.stringify(fact.displayed_value)
  ) {
    context.addIssue({
      code: 'custom',
      message: 'Une valeur directe doit correspondre a sa valeur source.',
      path: ['displayed_value'],
    });
  }
});

export const aiAssistantPublicExecutionSchema = z.strictObject({
  tool: z.string().trim().min(1).max(80),
  ok: z.boolean(),
  duration_ms: z.number().int().nonnegative(),
  row_count: z.number().int().nonnegative().nullable(),
  snapshot_id: uuidSchema.nullable(),
  requested_filters: z.record(z.string(), aiAssistantPublicValueSchema),
  canonical_filters: z.record(z.string(), aiAssistantPublicValueSchema),
  server_filters: z.record(z.string(), aiAssistantPublicValueSchema),
  sql_attempt: z.number().int().positive().max(4).nullable(),
  executed_sql: z.string().trim().min(1).max(12000).nullable(),
  error_code: z.string().trim().min(1).max(80).nullable(),
}).superRefine((execution, context) => {
  if (
    execution.tool !== 'execute_readonly_sql' && execution.executed_sql !== null
  ) {
    context.addIssue({
      code: 'custom',
      message: 'Le SQL public est reserve au fallback SQL.',
      path: ['executed_sql'],
    });
  }
  if (!execution.ok && execution.executed_sql !== null) {
    context.addIssue({
      code: 'custom',
      message: 'Une requete refusee ne peut pas etre affichee comme executee.',
      path: ['executed_sql'],
    });
  }
});

export const aiAssistantEvidenceSchema = z.strictObject({
  status: z.enum(['verified', 'partial', 'failed']),
  intent: z.string().trim().min(1).max(120),
  dimension: z.string().trim().min(1).max(120).nullable(),
  facts: z.array(aiAssistantEvidenceFactSchema).max(50),
  executions: z.array(aiAssistantPublicExecutionSchema).max(12),
}).superRefine((evidence, context) => {
  if (evidence.status === 'verified' && evidence.facts.length === 0) {
    context.addIssue({
      code: 'custom',
      message: 'Un resultat verifie requiert au moins un fait prouve.',
      path: ['facts'],
    });
  }
  if (evidence.status === 'failed' && evidence.facts.length > 0) {
    context.addIssue({
      code: 'custom',
      message: 'Un echec complet ne peut pas contenir de fait verifie.',
      path: ['facts'],
    });
  }
});

export const aiAssistantToolCallTraceSchema = z.strictObject({
  name: nonEmptyStringSchema('Nom outil requis.'),
  arguments: jsonObjectSchema,
  ok: z.boolean(),
  executed: z.boolean().default(true),
  blocked_reason: z.string().trim().min(1, {
    error: 'Motif de blocage outil requis.',
  }).max(160, { error: 'Motif de blocage outil trop long.' }).nullable()
    .default(null),
  row_count: z.number().int().nonnegative().nullable(),
  duration_ms: z.number().int().nonnegative(),
}).superRefine((trace, context) => {
  if (!trace.executed && trace.ok) {
    context.addIssue({
      code: 'custom',
      message: 'Un outil non execute ne peut pas etre marque comme reussi.',
      path: ['ok'],
    });
  }
  if (!trace.executed && trace.blocked_reason === null) {
    context.addIssue({
      code: 'custom',
      message: 'Un outil non execute requiert un motif de blocage.',
      path: ['blocked_reason'],
    });
  }
  if (trace.executed && trace.blocked_reason !== null) {
    context.addIssue({
      code: 'custom',
      message: 'Un outil execute ne peut pas porter de motif de blocage.',
      path: ['blocked_reason'],
    });
  }
});

export const aiAssistantAskResponseSchema = apiSuccessSchema.extend({
  ai_available: z.boolean(),
  answer: nullableTextSchema,
  citations: z.array(aiAssistantCitationSchema),
  tool_trace: z.array(aiAssistantToolCallTraceSchema),
  evidence: aiAssistantEvidenceSchema.default({
    status: 'failed',
    intent: 'unknown',
    dimension: null,
    facts: [],
    executions: [],
  }),
  usage: aiDiagnosisUsageSchema.nullable(),
  cost: aiDiagnosisCostSchema.nullable(),
  fallback_reason: nullableTextSchema,
  model_id: nullableTextSchema,
  truncated: z.boolean(),
  conversation_context: aiAssistantConversationContextSchema.nullable()
    .default(null),
});

export const aiAssistantStatusResponseSchema = z.strictObject({
  enabled: z.boolean(),
  model_id: nullableTextSchema,
  reason: nullableTextSchema,
});

export type AiAssistantPageContext = z.infer<
  typeof aiAssistantPageContextSchema
>;
export type AiAssistantMessage = z.infer<typeof aiAssistantMessageSchema>;
export type AiAssistantConversationContext = z.infer<
  typeof aiAssistantConversationContextSchema
>;
export type AiAssistantAskInput = z.infer<typeof aiAssistantAskInputSchema>;
export type AiAssistantCitation = z.infer<typeof aiAssistantCitationSchema>;
export type AiAssistantToolCallTrace = z.infer<
  typeof aiAssistantToolCallTraceSchema
>;
export type AiAssistantEvidence = z.infer<typeof aiAssistantEvidenceSchema>;
export type AiAssistantAskResponse = z.infer<
  typeof aiAssistantAskResponseSchema
>;
export type AiAssistantStatusResponse = z.infer<
  typeof aiAssistantStatusResponseSchema
>;
