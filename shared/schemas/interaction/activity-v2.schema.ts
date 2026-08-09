import { z } from "zod/v4";

const uuidSchema = z.uuid({ error: "Identifiant invalide." });
const timestampSchema = z.iso.datetime({ offset: true });
const nonEmptyTextSchema = z.string().trim().min(1, "Valeur requise.");

export const activityLifecycleSchema = z.enum([
  "draft",
  "recorded",
  "corrected",
  "archived",
]);

export const activityEventDomainSchema = z.enum([
  "activity",
  "task",
  "opportunity",
  "quote_order",
  "compatibility",
]);

export const activityV2ParticipantSchema = z.strictObject({
  id: uuidSchema,
  participant_kind: z.enum(["internal", "external"]),
  internal_profile_id: uuidSchema.nullable(),
  external_contact_id: uuidSchema.nullable(),
  organization_id: uuidSchema.nullable(),
  participant_role: nonEmptyTextSchema,
});

export const activityV2SourceSchema = z.strictObject({
  id: uuidSchema,
  source_type: z.enum([
    "legacy_interaction",
    "manual",
    "import",
    "email",
    "document",
  ]),
  source_reference: nonEmptyTextSchema,
  source_label: z.string().nullable(),
  captured_at: timestampSchema,
});

export const activityV2AttachmentSchema = z.strictObject({
  id: uuidSchema,
  source_id: uuidSchema.nullable(),
  file_name: nonEmptyTextSchema,
  mime_type: z.string().nullable(),
  byte_size: z.coerce.number().int().nonnegative().nullable(),
  checksum_sha256: z.string().regex(/^[0-9a-f]{64}$/).nullable(),
  storage_bucket: z.string().nullable(),
  storage_object_path: z.string().nullable(),
});

export const activityV2HistoryEventSchema = z.strictObject({
  id: uuidSchema,
  event_order: z.number().int().positive(),
  legacy_event_id: z.string().nullable(),
  event_type: nonEmptyTextSchema,
  event_domain: activityEventDomainSchema,
  occurred_at: timestampSchema.nullable(),
  author_id: uuidSchema.nullable(),
  author_label_raw: z.string().nullable(),
  content: nonEmptyTextSchema,
  raw_event: z.record(z.string(), z.unknown()).nullable(),
});

export const activityV2CorrectionSchema = z.strictObject({
  id: uuidSchema,
  activity_version: z.number().int().min(2),
  field_name: nonEmptyTextSchema,
  previous_value: z.string().nullable(),
  new_value: z.string().nullable(),
  corrected_by: uuidSchema,
  corrected_at: timestampSchema,
  reason: z.string().nullable(),
});

export const activityV2Schema = z.strictObject({
  id: uuidSchema,
  legacy_interaction_id: nonEmptyTextSchema.nullable(),
  agency_id: uuidSchema,
  author_id: uuidSchema,
  created_by: uuidSchema,
  updated_by: uuidSchema.nullable(),
  legacy_updated_by_raw: z.string().nullable(),
  occurred_at: timestampSchema,
  channel: nonEmptyTextSchema,
  activity_type: nonEmptyTextSchema,
  subject: nonEmptyTextSchema,
  report: z.string().nullable(),
  organization_id: uuidSchema.nullable(),
  contact_id: uuidSchema.nullable(),
  lifecycle_status: activityLifecycleSchema,
  version: z.number().int().positive(),
  corrected_at: timestampSchema.nullable(),
  archived_at: timestampSchema.nullable(),
  created_at: timestampSchema,
  updated_at: timestampSchema,
  participants: z.array(activityV2ParticipantSchema),
  sources: z.array(activityV2SourceSchema),
  attachments: z.array(activityV2AttachmentSchema),
  history: z.array(activityV2HistoryEventSchema),
  corrections: z.array(activityV2CorrectionSchema),
});

export const activityV2ByLegacyInteractionInputSchema = z.strictObject({
  legacy_interaction_id: nonEmptyTextSchema,
});

export const activityV2CorrectionInputSchema = z.strictObject({
  legacy_interaction_id: nonEmptyTextSchema,
  expected_version: z.number().int().positive("Version attendue invalide."),
  reason: z.string().trim().min(1, "Motif de correction requis.").max(500, "Motif de correction trop long."),
  changes: z.strictObject({
    occurred_at: timestampSchema.optional(),
    channel: nonEmptyTextSchema.optional(),
    activity_type: nonEmptyTextSchema.optional(),
    subject: nonEmptyTextSchema.optional(),
    report: z.string().trim().max(5000, "Compte rendu trop long.").nullable().optional(),
    organization_id: uuidSchema.nullable().optional(),
    contact_id: uuidSchema.nullable().optional(),
  }).refine((changes) => Object.keys(changes).length > 0, {
    message: "Au moins un champ doit être corrigé.",
  }),
});

export const activityV2ByLegacyInteractionResponseSchema = z.strictObject({
  ok: z.literal(true),
  request_id: uuidSchema,
  activity: activityV2Schema,
});

export type ActivityV2 = z.infer<typeof activityV2Schema>;
export type ActivityV2ByLegacyInteractionInput = z.infer<
  typeof activityV2ByLegacyInteractionInputSchema
>;
export type ActivityV2CorrectionInput = z.infer<typeof activityV2CorrectionInputSchema>;
