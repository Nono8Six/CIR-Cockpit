import { z } from "zod/v4";

import {
  aiDiagnosisCostSchema,
  aiDiagnosisUsageSchema,
  apiSuccessSchema,
  nonEmptyStringSchema,
  nullableTextSchema,
  uuidSchema,
} from "./ai.schema.ts";

const jsonObjectSchema = z.record(z.string(), z.json());

export const aiAssistantPageContextSchema = z.strictObject({
  surface: z.enum(["pricing.references"], {
    error: "Surface assistant invalide.",
  }).optional(),
  import_id: uuidSchema.optional(),
  run_id: uuidSchema.optional(),
  target_snapshot_id: uuidSchema.optional(),
  base_snapshot_id: uuidSchema.nullable().optional(),
  active_tab: z.string().trim().min(1, { error: "Onglet actif invalide." }).max(
    80,
    { error: "Onglet actif trop long." },
  ).optional(),
  file_kind: z.enum(["classification", "segments_grids"], {
    error: "Type de fichier invalide.",
  }).optional(),
});

export const aiAssistantMessageSchema = z.strictObject({
  role: z.enum(["user", "assistant"], { error: "Role de message invalide." }),
  content: z.string().trim().min(1, { error: "Message requis." }).max(4000, {
    error: "Message trop long.",
  }),
});

const assistantBoundedTermsSchema = z.array(
  z.string().trim().min(1, { error: "Terme de contexte requis." }).max(80, {
    error: "Terme de contexte trop long.",
  }),
).max(8, { error: "Maximum 8 termes de contexte." });

const assistantBoundedBrandsSchema = z.array(
  z.string().trim().min(1, { error: "Marque de contexte requise." }).max(
    120,
    { error: "Marque de contexte trop longue." },
  ),
).max(50, { error: "Maximum 50 marques de contexte." });

export const aiAssistantConversationContextSchema = z.strictObject({
  version: z.literal(1),
  surface: z.literal("pricing.references"),
  domain: z.literal("pricing_references"),
  intent: z.enum([
    "segment_count",
    "supplier_category_search",
    "supplier_brand_count",
    "supplier_brand_check",
  ]),
  dimension: z.enum(["cat_fab", "brand"]),
  snapshot_id: uuidSchema,
  import_id: uuidSchema.nullable(),
  filters: z.strictObject({
    requested_terms: assistantBoundedTermsSchema,
    canonical_terms: assistantBoundedTermsSchema,
    query_terms: assistantBoundedTermsSchema,
    marques: assistantBoundedBrandsSchema,
    mode: z.enum(["any", "all"]),
  }),
  result_summary: z.strictObject({
    matching_brands: assistantBoundedBrandsSchema,
    distinct_brand_count: z.number().int().nonnegative(),
    segment_rows: z.number().int().nonnegative(),
  }),
  created_at: z.iso.datetime({ error: "Date de contexte invalide." }),
  expires_at: z.iso.datetime({ error: "Expiration de contexte invalide." }),
});

export const aiAssistantAskInputSchema = z.strictObject({
  client_request_id: uuidSchema,
  question: z.string().trim().min(1, { error: "Question requise." }).max(2000, {
    error: "Question trop longue.",
  }),
  history: z.array(aiAssistantMessageSchema).max(12, {
    error: "Historique limite a 12 messages.",
  }).default([]),
  page_context: aiAssistantPageContextSchema,
  conversation_context: aiAssistantConversationContextSchema.nullable()
    .default(null),
});

export const aiAssistantCitationSchema = z.strictObject({
  tool: nonEmptyStringSchema("Nom outil requis."),
  label: nonEmptyStringSchema("Libelle source requis."),
  ref: jsonObjectSchema,
});

export const aiAssistantToolCallTraceSchema = z.strictObject({
  name: nonEmptyStringSchema("Nom outil requis."),
  arguments: jsonObjectSchema,
  ok: z.boolean(),
  row_count: z.number().int().nonnegative().nullable(),
  duration_ms: z.number().int().nonnegative(),
});

export const aiAssistantAskResponseSchema = apiSuccessSchema.extend({
  ai_available: z.boolean(),
  answer: nullableTextSchema,
  citations: z.array(aiAssistantCitationSchema),
  tool_trace: z.array(aiAssistantToolCallTraceSchema),
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
export type AiAssistantAskResponse = z.infer<
  typeof aiAssistantAskResponseSchema
>;
export type AiAssistantStatusResponse = z.infer<
  typeof aiAssistantStatusResponseSchema
>;
