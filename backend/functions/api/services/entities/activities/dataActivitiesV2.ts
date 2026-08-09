import { and, asc, eq, sql } from "drizzle-orm";

import {
  activities,
  activity_attachments,
  activity_corrections,
  activity_history_events,
  activity_participants,
  activity_sources,
} from "../../../../../drizzle/schema.ts";
import type {
  ActivityV2,
  ActivityV2ByLegacyInteractionInput,
  ActivityV2CorrectionInput,
} from "../../../../../../shared/schemas/interaction/activity-v2.schema.ts";
import { activityV2ByLegacyInteractionResponseSchema } from "../../../../../../shared/schemas/interaction/activity-v2.schema.ts";
import { httpError } from "../../../middleware/errorHandler.ts";
import type { AuthContext, DbClient } from "../../../types.ts";
import { ensureAgencyAccess } from "../../data/dataAccess.ts";

const isoTimestamp = (value: string): string => new Date(value).toISOString();
const nullableIsoTimestamp = (value: string | null): string | null =>
  value === null ? null : isoTimestamp(value);

export const getActivityV2ByLegacyInteraction = async (
  db: DbClient,
  authContext: AuthContext,
  requestId: string,
  input: ActivityV2ByLegacyInteractionInput,
): Promise<{ ok: true; request_id: string; activity: ActivityV2 }> => {
  const [activity] = await db.select().from(activities)
    .where(eq(activities.legacy_interaction_id, input.legacy_interaction_id))
    .limit(1);

  if (!activity) {
    throw httpError(404, "NOT_FOUND", "Activité introuvable.");
  }
  ensureAgencyAccess(authContext, activity.agency_id);

  const [participants, sources, attachments, history, corrections] =
    await Promise.all([
      db.select({
        id: activity_participants.id,
        participant_kind: activity_participants.participant_kind,
        internal_profile_id: activity_participants.internal_profile_id,
        external_contact_id: activity_participants.external_contact_id,
        organization_id: activity_participants.organization_id,
        participant_role: activity_participants.participant_role,
      }).from(activity_participants)
        .where(eq(activity_participants.activity_id, activity.id))
        .orderBy(
          asc(activity_participants.created_at),
          asc(activity_participants.id),
        ),
      db.select({
        id: activity_sources.id,
        source_type: activity_sources.source_type,
        source_reference: activity_sources.source_reference,
        source_label: activity_sources.source_label,
        captured_at: activity_sources.captured_at,
      }).from(activity_sources)
        .where(eq(activity_sources.activity_id, activity.id))
        .orderBy(asc(activity_sources.captured_at), asc(activity_sources.id))
        .then((rows) =>
          rows.map((row) => ({
            ...row,
            captured_at: isoTimestamp(row.captured_at),
          }))
        ),
      db.select({
        id: activity_attachments.id,
        source_id: activity_attachments.source_id,
        file_name: activity_attachments.file_name,
        mime_type: activity_attachments.mime_type,
        byte_size: activity_attachments.byte_size,
        checksum_sha256: activity_attachments.checksum_sha256,
        storage_bucket: activity_attachments.storage_bucket,
        storage_object_path: activity_attachments.storage_object_path,
      }).from(activity_attachments)
        .where(eq(activity_attachments.activity_id, activity.id))
        .orderBy(
          asc(activity_attachments.created_at),
          asc(activity_attachments.id),
        ),
      db.select({
        id: activity_history_events.id,
        event_order: activity_history_events.event_order,
        legacy_event_id: activity_history_events.legacy_event_id,
        event_type: activity_history_events.event_type,
        event_domain: activity_history_events.event_domain,
        occurred_at: activity_history_events.occurred_at,
        author_id: activity_history_events.author_id,
        author_label_raw: activity_history_events.author_label_raw,
        content: activity_history_events.content,
        raw_event: activity_history_events.raw_event,
      }).from(activity_history_events)
        .where(eq(activity_history_events.activity_id, activity.id))
        .orderBy(asc(activity_history_events.event_order))
        .then((rows) =>
          rows.map((row) => ({
            ...row,
            occurred_at: nullableIsoTimestamp(row.occurred_at),
          }))
        ),
      db.select({
        id: activity_corrections.id,
        activity_version: activity_corrections.activity_version,
        field_name: activity_corrections.field_name,
        previous_value: activity_corrections.previous_value,
        new_value: activity_corrections.new_value,
        corrected_by: activity_corrections.corrected_by,
        corrected_at: activity_corrections.corrected_at,
        reason: activity_corrections.reason,
      }).from(activity_corrections)
        .where(eq(activity_corrections.activity_id, activity.id))
        .orderBy(
          asc(activity_corrections.activity_version),
          asc(activity_corrections.field_name),
        )
        .then((rows) =>
          rows.map((row) => ({
            ...row,
            corrected_at: isoTimestamp(row.corrected_at),
          }))
        ),
    ]);

  const response = {
    ok: true,
    request_id: requestId,
    activity: {
      ...activity,
      occurred_at: isoTimestamp(activity.occurred_at),
      corrected_at: nullableIsoTimestamp(activity.corrected_at),
      archived_at: nullableIsoTimestamp(activity.archived_at),
      created_at: isoTimestamp(activity.created_at),
      updated_at: isoTimestamp(activity.updated_at),
      participants,
      sources,
      attachments,
      history,
      corrections,
    },
  } as const;
  const parsed = activityV2ByLegacyInteractionResponseSchema.safeParse(
    response,
  );
  if (!parsed.success) {
    throw httpError(
      500,
      "DB_READ_FAILED",
      "Données d'activité invalides.",
      parsed.error.issues.map((issue) => issue.message).join("; "),
    );
  }
  return parsed.data;
};

export const correctActivityV2 = async (
  db: DbClient,
  authContext: AuthContext,
  requestId: string,
  input: ActivityV2CorrectionInput,
): Promise<{ ok: true; request_id: string; activity: ActivityV2 }> => {
  try {
    await db.transaction(async (tx) => {
      const [current] = await tx.select({
        id: activities.id,
        agency_id: activities.agency_id,
      }).from(activities)
        .where(eq(activities.legacy_interaction_id, input.legacy_interaction_id))
        .limit(1);

      if (!current) {
        throw httpError(404, "NOT_FOUND", "Activité introuvable.");
      }
      ensureAgencyAccess(authContext, current.agency_id);

      await tx.execute(sql`select set_config('app.activity_correction_reason', ${input.reason}, true)`);
      const updated = await tx.update(activities)
        .set({
          ...input.changes,
          version: input.expected_version + 1,
          updated_by: authContext.userId,
        })
        .where(and(
          eq(activities.id, current.id),
          eq(activities.version, input.expected_version),
        ))
        .returning({ id: activities.id });

      if (updated.length === 0) {
        throw httpError(
          409,
          "CONFLICT",
          "Cette activité a été modifiée. Rechargez-la avant de corriger.",
        );
      }

      await tx.execute(sql`
        insert into public.activity_history_events (
          activity_id, agency_id, event_order, event_type, event_domain,
          occurred_at, author_id, content, raw_event
        )
        select ${current.id}::uuid, ${current.agency_id}::uuid,
          coalesce(max(event_order), 0) + 1, 'correction', 'activity',
          now(), ${authContext.userId}::uuid, ${`Correction : ${input.reason}`},
          ${JSON.stringify(input.changes)}::jsonb
        from public.activity_history_events
        where activity_id = ${current.id}::uuid
      `);
    });
  } catch (error) {
    if (typeof error === "object" && error !== null) {
      const code = Reflect.get(error, "code");
      if (code === "CONFLICT" || code === "NOT_FOUND" || code === "AUTH_FORBIDDEN") {
        throw error;
      }
      if (code === "40001") {
        throw httpError(409, "CONFLICT", "Cette activité a été modifiée. Rechargez-la avant de corriger.");
      }
      if (code === "23514" || code === "23503") {
        throw httpError(400, "VALIDATION_ERROR", "La correction ne respecte pas les règles de l’activité.");
      }
    }
    throw httpError(500, "DB_WRITE_FAILED", "Impossible de corriger l’activité.");
  }

  return getActivityV2ByLegacyInteraction(db, authContext, requestId, {
    legacy_interaction_id: input.legacy_interaction_id,
  });
};
