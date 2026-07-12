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

export const aiAssistantAskInputSchema = z.strictObject({
  client_request_id: uuidSchema,
  question: z.string().trim().min(1, { error: "Question requise." }).max(2000, {
    error: "Question trop longue.",
  }),
  history: z.array(aiAssistantMessageSchema).max(12, {
    error: "Historique limite a 12 messages.",
  }).default([]),
  page_context: aiAssistantPageContextSchema,
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
