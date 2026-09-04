import { z } from "zod/v4";

import {
  pricingReferenceDiffObjectTypeSchema,
  pricingReferenceFileKindSchema,
} from "../../../../../shared/schemas/pricing/references.schema.ts";

const uuidSchema = z.uuid({ error: "Identifiant invalide." });
const nonEmptyStringSchema = z.string().trim().min(1, {
  error: "Identifiant requis.",
});

export const referenceWatchFactTrustSchema = z.enum([
  "trusted_computed",
  "untrusted_source_text",
]);

export const referenceWatchRunSummarySourceSchema = z.strictObject({
  origin: z.literal("run_summary"),
  run_id: uuidSchema,
  base_snapshot_id: uuidSchema.nullable(),
  target_snapshot_id: uuidSchema,
  field: nonEmptyStringSchema,
});

export const referenceWatchDiffRowSourceSchema = z.strictObject({
  origin: z.literal("diff_row"),
  run_id: uuidSchema,
  base_snapshot_id: uuidSchema.nullable(),
  target_snapshot_id: uuidSchema,
  diff_id: uuidSchema,
  object_type: pricingReferenceDiffObjectTypeSchema,
  field: nonEmptyStringSchema.optional(),
});

export const referenceWatchSourceSchema = z.discriminatedUnion("origin", [
  referenceWatchRunSummarySourceSchema,
  referenceWatchDiffRowSourceSchema,
]);

export const referenceWatchFactSchema = z.strictObject({
  kind: z.literal("fact"),
  id: nonEmptyStringSchema,
  value: z.unknown(),
  source: referenceWatchSourceSchema,
  trust: referenceWatchFactTrustSchema,
});

export const referenceWatchMissingSchema = z.strictObject({
  kind: z.literal("missing"),
  id: nonEmptyStringSchema,
  expected: nonEmptyStringSchema,
  reason: nonEmptyStringSchema,
  source: referenceWatchSourceSchema,
});

export const referenceWatchAmbiguousSchema = z.strictObject({
  kind: z.literal("ambiguous"),
  id: nonEmptyStringSchema,
  candidates: z.array(z.unknown()),
  reason: nonEmptyStringSchema,
  source: referenceWatchSourceSchema,
  trust: z.literal("untrusted_source_text"),
});

export const referenceWatchRunSchema = z.strictObject({
  run_id: uuidSchema,
  base_snapshot_id: uuidSchema.nullable(),
  target_snapshot_id: uuidSchema,
  computed_at: nonEmptyStringSchema,
  status: z.literal("computed"),
  initial_import: z.boolean(),
  skipped_file_kinds: z.array(pricingReferenceFileKindSchema),
});

export const referenceWatchBoundsSchema = z.strictObject({
  top_changes: z.number().int().positive(),
  max_bytes: z.number().int().positive(),
  used_bytes: z.number().int().nonnegative(),
  truncated: z.boolean(),
});

export const referenceWatchFactsSchema = z.strictObject({
  run: referenceWatchRunSchema,
  bounds: referenceWatchBoundsSchema,
  facts: z.array(referenceWatchFactSchema),
  missing: z.array(referenceWatchMissingSchema),
  ambiguous: z.array(referenceWatchAmbiguousSchema),
});

export type ReferenceWatchFactTrust = z.infer<
  typeof referenceWatchFactTrustSchema
>;
export type ReferenceWatchSource = z.infer<typeof referenceWatchSourceSchema>;
export type ReferenceWatchFact = z.infer<typeof referenceWatchFactSchema>;
export type ReferenceWatchMissing = z.infer<typeof referenceWatchMissingSchema>;
export type ReferenceWatchAmbiguous = z.infer<
  typeof referenceWatchAmbiguousSchema
>;
export type ReferenceWatchFacts = z.infer<typeof referenceWatchFactsSchema>;
