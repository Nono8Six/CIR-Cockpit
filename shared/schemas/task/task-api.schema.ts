import { z } from "zod/v4";

import {
  taskParticipantRoleSchema,
  taskParticipantSchema,
  taskEventSchema,
  taskPrioritySchema,
  taskScopeSchema,
  taskStatusSchema,
  taskTypeSchema,
  taskSchema,
  taskVisibilitySchema,
} from "./task-foundation.schema.ts";
import { uuidSchema } from "../admin/auth.schema.ts";

const titleSchema = z.string().trim().min(1, "Titre requis").max(200, "Titre trop long");
const optionalTextSchema = z.string().trim().min(1, "Texte requis").max(5_000, "Texte trop long").nullable().optional();
const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date invalide");
const timeSchema = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Heure invalide").nullable().optional();
const requestKeySchema = uuidSchema.describe("Clé idempotente générée une seule fois par action utilisateur.");

export const taskParticipantInputSchema = z.strictObject({
  profile_id: uuidSchema,
  participant_role: taskParticipantRoleSchema,
});

const taskCreationBaseSchema = z.strictObject({
  agency_id: uuidSchema,
  title: titleSchema,
  task_type_id: uuidSchema,
  due_date: dateSchema,
  idempotency_key: requestKeySchema,
});

export const taskQuickCreateInputSchema = taskCreationBaseSchema.extend({
  kind: z.literal("quick"),
});

export const taskAdvancedCreateInputSchema = taskCreationBaseSchema.extend({
  kind: z.literal("advanced"),
  description: optionalTextSchema,
  planned_channel: z.string().trim().min(1).max(100).nullable().optional(),
  scope: taskScopeSchema,
  organization_id: uuidSchema.nullable(),
  contact_id: uuidSchema.nullable().optional(),
  source_activity_id: uuidSchema.nullable().optional(),
  responsible_id: uuidSchema.nullable(),
  priority: taskPrioritySchema.default("normal"),
  due_time: timeSchema,
  visibility: taskVisibilitySchema,
  participants: z.array(taskParticipantInputSchema).max(100).default([]),
}).superRefine((input, context) => {
  if (input.scope === "tier_relation" && (input.organization_id === null || input.visibility !== "tier")) {
    context.addIssue({ code: "custom", path: ["organization_id"], message: "Une tâche Tier exige une organisation et une visibilité Tier." });
  }
  if (input.scope === "internal_cir" && (
    input.organization_id !== null ||
    (input.contact_id !== null && input.contact_id !== undefined) ||
    (input.source_activity_id !== null && input.source_activity_id !== undefined) ||
    input.visibility === "tier"
  )) {
    context.addIssue({ code: "custom", path: ["scope"], message: "Une tâche interne ne peut pas porter de lien Tier." });
  }
});

export const taskCreateInputSchema = z.discriminatedUnion("kind", [
  taskQuickCreateInputSchema,
  taskAdvancedCreateInputSchema,
]);

export const taskGetInputSchema = z.strictObject({ task_id: uuidSchema });

export const taskUpdateContentInputSchema = z.strictObject({
  task_id: uuidSchema,
  expected_version: z.number().int().positive(),
  patch: z.strictObject({
    title: titleSchema.optional(),
    description: optionalTextSchema,
    planned_channel: z.string().trim().min(1).max(100).nullable().optional(),
    organization_id: uuidSchema.nullable().optional(),
    contact_id: uuidSchema.nullable().optional(),
    source_activity_id: uuidSchema.nullable().optional(),
  }).refine((patch) => Object.keys(patch).length > 0, "Au moins un champ doit être modifié."),
});

const taskMutationBaseSchema = z.strictObject({
  task_id: uuidSchema,
  expected_version: z.number().int().positive(),
});

export const taskAssignmentInputSchema = z.discriminatedUnion("action", [
  taskMutationBaseSchema.extend({
    action: z.literal("assign"),
    responsible_id: uuidSchema.nullable(),
  }),
  taskMutationBaseSchema.extend({ action: z.literal("claim") }),
  taskMutationBaseSchema.extend({
    action: z.literal("add_participant"),
    profile_id: uuidSchema,
    participant_role: taskParticipantRoleSchema,
  }),
  taskMutationBaseSchema.extend({
    action: z.literal("remove_participant"),
    profile_id: uuidSchema,
    participant_role: taskParticipantRoleSchema,
  }),
]);

export const taskRescheduleInputSchema = taskMutationBaseSchema.extend({
  due_date: dateSchema,
  due_time: timeSchema,
  reason: z.string().trim().min(1).max(1_000).nullable().optional(),
});

export const taskPriorityChangeInputSchema = taskMutationBaseSchema.extend({
  priority: taskPrioritySchema,
});

export const taskStatusChangeInputSchema = taskMutationBaseSchema.extend({
  status: taskStatusSchema,
  cancel_reason: z.string().trim().min(1).max(1_000).nullable().optional(),
}).superRefine((input, context) => {
  if (input.status !== "canceled" && input.cancel_reason !== undefined) {
    context.addIssue({ code: "custom", path: ["cancel_reason"], message: "Le motif est réservé à l'annulation." });
  }
});

export const taskNoteInputSchema = taskMutationBaseSchema.extend({
  note: z.string().trim().min(1, "Note requise").max(1_000, "Note trop longue"),
});

export const taskListInputSchema = z.strictObject({
  agency_id: uuidSchema.optional(),
  search: z.string().trim().min(1).max(120).optional(),
  status: z.array(taskStatusSchema).max(4).optional(),
  task_type_id: z.array(uuidSchema).max(50).optional(),
  priority: z.array(taskPrioritySchema).max(3).optional(),
  responsible_id: uuidSchema.optional(),
  contributor_id: uuidSchema.optional(),
  due_from: dateSchema.optional(),
  due_to: dateSchema.optional(),
  page: z.number().int().min(1).default(1),
  page_size: z.number().int().min(1).max(100).default(50),
});

const taskTypeCreateSchema = z.strictObject({
  action: z.literal("create"),
  code: z.string().trim().regex(/^[a-z0-9_]+$/, "Code invalide").min(1).max(80),
  label: z.string().trim().min(1).max(120),
  sort_order: z.number().int().min(0).default(0),
});
const taskTypeRenameSchema = z.strictObject({ action: z.literal("rename"), task_type_id: uuidSchema, label: z.string().trim().min(1).max(120) });
const taskTypeReorderSchema = z.strictObject({ action: z.literal("reorder"), task_type_id: uuidSchema, sort_order: z.number().int().min(0) });
const taskTypeArchiveSchema = z.strictObject({ action: z.literal("archive"), task_type_id: uuidSchema });
export const taskTypeAdminInputSchema = z.discriminatedUnion("action", [
  taskTypeCreateSchema, taskTypeRenameSchema, taskTypeReorderSchema, taskTypeArchiveSchema,
]);

export const taskTypeListInputSchema = z.strictObject({ include_archived: z.boolean().default(false) });

export const taskDetailSchema = z.strictObject({
  task: taskSchema,
  participants: z.array(taskParticipantSchema),
  events: z.array(taskEventSchema),
});
export const taskListRowSchema = z.strictObject({
  task: taskSchema,
  task_type: taskTypeSchema,
  contributors: z.array(uuidSchema),
});
export const taskListResponseSchema = z.strictObject({
  items: z.array(taskListRowSchema),
  page: z.number().int().positive(),
  page_size: z.number().int().positive(),
  total: z.number().int().nonnegative(),
});
export const taskCreateResponseSchema = taskDetailSchema.extend({ idempotent: z.boolean() });
export const taskTypesResponseSchema = z.strictObject({ task_types: z.array(taskTypeSchema) });

export type TaskCreateInput = z.infer<typeof taskCreateInputSchema>;
export type TaskGetInput = z.infer<typeof taskGetInputSchema>;
export type TaskUpdateContentInput = z.infer<typeof taskUpdateContentInputSchema>;
export type TaskAssignmentInput = z.infer<typeof taskAssignmentInputSchema>;
export type TaskRescheduleInput = z.infer<typeof taskRescheduleInputSchema>;
export type TaskPriorityChangeInput = z.infer<typeof taskPriorityChangeInputSchema>;
export type TaskStatusChangeInput = z.infer<typeof taskStatusChangeInputSchema>;
export type TaskNoteInput = z.infer<typeof taskNoteInputSchema>;
export type TaskListInput = z.infer<typeof taskListInputSchema>;
export type TaskTypeAdminInput = z.infer<typeof taskTypeAdminInputSchema>;
export type TaskTypeListInput = z.infer<typeof taskTypeListInputSchema>;
export type TaskCreateResponse = z.infer<typeof taskCreateResponseSchema>;
export type TaskDetail = z.infer<typeof taskDetailSchema>;
export type TaskListResponse = z.infer<typeof taskListResponseSchema>;
