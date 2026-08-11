import { z } from "zod/v4";

const uuidSchema = z.uuid({ error: "Identifiant invalide." });
const timestampSchema = z.iso.datetime({ offset: true });
const dateSchema = z.iso.date();
const timeSchema = z.string().regex(
  /^([01]\d|2[0-3]):[0-5]\d(?::[0-5]\d(?:\.\d{1,6})?)?$/,
  "Heure locale invalide.",
);
const titleSchema = z.string().trim().min(1, "Titre requis.").max(
  200,
  "Titre trop long.",
);
const descriptionSchema = z.string().trim().min(1).max(5_000).nullable();
const timezoneSchema = z.string().trim().min(1).max(100).refine((timezone) => {
  try {
    new Intl.DateTimeFormat("fr-FR", { timeZone: timezone });
    return true;
  } catch {
    return false;
  }
}, "Fuseau IANA invalide.");

export const taskScopeSchema = z.enum(["tier_relation", "internal_cir"]);
export const taskStatusSchema = z.enum([
  "todo",
  "in_progress",
  "completed",
  "canceled",
]);
export const taskPrioritySchema = z.enum(["normal", "high", "urgent"]);
export const taskVisibilitySchema = z.enum(["tier", "agency", "restricted"]);
export const taskParticipantRoleSchema = z.enum(["contributor", "follower"]);
export const taskIntervalUnitSchema = z.enum(["day", "week", "month"]);
export const taskActorKindSchema = z.enum(["user", "system"]);
export const taskEventTypeSchema = z.enum([
  "created",
  "content_changed",
  "type_changed",
  "link_changed",
  "responsible_changed",
  "participant_added",
  "participant_removed",
  "due_changed",
  "priority_changed",
  "status_changed",
  "reopened",
  "note_added",
  "series_attached",
  "series_stopped",
  "next_occurrence_created",
  "completion_activity_created",
]);

export const taskTypeSchema = z.strictObject({
  id: uuidSchema,
  code: z.string().trim().min(1).max(80).regex(/^[a-z0-9_]+$/),
  label: z.string().trim().min(1).max(120),
  sort_order: z.number().int().nonnegative(),
  is_active: z.boolean(),
  created_by: uuidSchema,
  updated_by: uuidSchema,
  created_at: timestampSchema,
  updated_at: timestampSchema,
  archived_at: timestampSchema.nullable(),
}).refine(
  (taskType) => taskType.is_active === (taskType.archived_at === null),
  {
    message: "L'archivage ne correspond pas à l'état du type.",
    path: ["archived_at"],
  },
);

export const taskSchema = z.strictObject({
  id: uuidSchema,
  agency_id: uuidSchema,
  version: z.number().int().positive(),
  title: titleSchema,
  description: descriptionSchema,
  task_type_id: uuidSchema,
  planned_channel: z.string().trim().min(1).max(100).nullable(),
  scope: taskScopeSchema,
  organization_id: uuidSchema.nullable(),
  contact_id: uuidSchema.nullable(),
  source_activity_id: uuidSchema.nullable(),
  completion_activity_id: uuidSchema.nullable(),
  created_by: uuidSchema,
  responsible_id: uuidSchema.nullable(),
  status: taskStatusSchema,
  priority: taskPrioritySchema,
  due_date: dateSchema,
  due_time: timeSchema.nullable(),
  due_timezone: timezoneSchema,
  visibility: taskVisibilitySchema,
  completed_at: timestampSchema.nullable(),
  completed_by: uuidSchema.nullable(),
  canceled_at: timestampSchema.nullable(),
  canceled_by: uuidSchema.nullable(),
  cancel_reason: z.string().trim().min(1).max(1_000).nullable(),
  series_id: uuidSchema.nullable(),
  previous_task_id: uuidSchema.nullable(),
  created_at: timestampSchema,
  updated_at: timestampSchema,
}).superRefine((task, context) => {
  if (task.scope === "tier_relation") {
    if (task.organization_id === null || task.visibility !== "tier") {
      context.addIssue({
        code: "custom",
        message:
          "Une tâche Tier exige une organisation et une visibilité Tier.",
      });
    }
  } else if (
    task.organization_id !== null ||
    task.contact_id !== null ||
    task.source_activity_id !== null ||
    task.completion_activity_id !== null ||
    task.visibility === "tier"
  ) {
    context.addIssue({
      code: "custom",
      message: "Une tâche interne ne peut pas porter de lien Tier ou Activité.",
    });
  }

  if (task.status === "in_progress" && task.responsible_id === null) {
    context.addIssue({
      code: "custom",
      message: "Une tâche en cours exige un responsable.",
    });
  }

  const hasCompletedAt = task.completed_at !== null;
  const hasCompletedBy = task.completed_by !== null;
  const hasCanceledAt = task.canceled_at !== null;
  const hasCanceledBy = task.canceled_by !== null;
  if (
    task.status === "completed"
      ? !hasCompletedAt || !hasCompletedBy || hasCanceledAt || hasCanceledBy ||
        task.cancel_reason !== null
      : hasCompletedAt || hasCompletedBy
  ) {
    context.addIssue({
      code: "custom",
      message: "Les marqueurs de complétion ne correspondent pas au statut.",
    });
  }
  if (
    task.status === "canceled"
      ? !hasCanceledAt || !hasCanceledBy || hasCompletedAt || hasCompletedBy
      : hasCanceledAt || hasCanceledBy || task.cancel_reason !== null
  ) {
    context.addIssue({
      code: "custom",
      message: "Les marqueurs d'annulation ne correspondent pas au statut.",
    });
  }
});

export const taskParticipantSchema = z.strictObject({
  task_id: uuidSchema,
  agency_id: uuidSchema,
  profile_id: uuidSchema,
  participant_role: taskParticipantRoleSchema,
  added_by: uuidSchema,
  created_at: timestampSchema,
});

export const taskEventSchema = z.strictObject({
  id: uuidSchema,
  task_id: uuidSchema,
  agency_id: uuidSchema,
  event_order: z.number().int().positive(),
  event_type: taskEventTypeSchema,
  actor_kind: taskActorKindSchema,
  actor_id: uuidSchema.nullable(),
  occurred_at: timestampSchema,
  task_version: z.number().int().positive(),
  previous_value: z.unknown().nullable(),
  new_value: z.unknown().nullable(),
  metadata: z.record(z.string(), z.unknown()),
  note: z.string().trim().min(1).max(1_000).nullable(),
}).superRefine((event, context) => {
  if ((event.actor_kind === "user") !== (event.actor_id !== null)) {
    context.addIssue({
      code: "custom",
      message: "L'acteur ne correspond pas à son type.",
      path: ["actor_id"],
    });
  }
  const payloadSize = new TextEncoder().encode(JSON.stringify([
    event.previous_value,
    event.new_value,
    event.metadata,
  ])).length;
  if (payloadSize > 16_384) {
    context.addIssue({
      code: "custom",
      message: "Métadonnées trop volumineuses.",
      path: ["metadata"],
    });
  }
});

export const taskSeriesSchema = z.strictObject({
  id: uuidSchema,
  agency_id: uuidSchema,
  interval_value: z.number().int().positive(),
  interval_unit: taskIntervalUnitSchema,
  is_active: z.boolean(),
  task_type_id: uuidSchema,
  title: titleSchema,
  description: descriptionSchema,
  planned_channel: z.string().trim().min(1).max(100).nullable(),
  scope: taskScopeSchema,
  organization_id: uuidSchema.nullable(),
  contact_id: uuidSchema.nullable(),
  responsible_id: uuidSchema.nullable(),
  priority: taskPrioritySchema,
  due_time: timeSchema.nullable(),
  due_timezone: timezoneSchema,
  visibility: taskVisibilitySchema,
  created_by: uuidSchema,
  stopped_by: uuidSchema.nullable(),
  created_at: timestampSchema,
  stopped_at: timestampSchema.nullable(),
}).superRefine((series, context) => {
  if (series.scope === "tier_relation") {
    if (series.organization_id === null || series.visibility !== "tier") {
      context.addIssue({
        code: "custom",
        message:
          "Une série Tier exige une organisation et une visibilité Tier.",
      });
    }
  } else if (
    series.organization_id !== null || series.contact_id !== null ||
    series.visibility === "tier"
  ) {
    context.addIssue({
      code: "custom",
      message: "Une série interne ne peut pas porter de lien Tier.",
    });
  }
  const stopMarkersAreValid = series.is_active
    ? series.stopped_at === null && series.stopped_by === null
    : series.stopped_at !== null && series.stopped_by !== null;
  if (!stopMarkersAreValid) {
    context.addIssue({
      code: "custom",
      message:
        "Les marqueurs d'arrêt ne correspondent pas à l'état de la série.",
    });
  }
});

export type Task = z.infer<typeof taskSchema>;
export type TaskEvent = z.infer<typeof taskEventSchema>;
export type TaskParticipant = z.infer<typeof taskParticipantSchema>;
export type TaskSeries = z.infer<typeof taskSeriesSchema>;
export type TaskType = z.infer<typeof taskTypeSchema>;
