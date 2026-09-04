import {
  and,
  asc,
  desc,
  eq,
  gte,
  ilike,
  inArray,
  isNull,
  lte,
  or,
  sql,
} from "drizzle-orm";

import {
  activities,
  activity_history_events,
  activity_sources,
  agencies,
  agency_members,
  entities,
  entity_contacts,
  interactions,
  profiles,
  task_events,
  task_participants,
  task_series,
  task_types,
  tasks,
} from "../../../drizzle/schema.ts";
import {
  type TaskAssignmentInput,
  type TaskCreateInput,
  type TaskCreateResponse,
  taskCreateResponseSchema,
  type TaskDetail,
  taskDetailSchema,
  type TaskExecuteWithActivityInput,
  type TaskExecutionResponse,
  taskExecutionResponseSchema,
  type TaskGetInput,
  type TaskListInput,
  type TaskListResponse,
  taskListResponseSchema,
  type TaskNoteInput,
  type TaskPriorityChangeInput,
  type TaskRecurrenceInput,
  type TaskRecurrenceResponse,
  taskRecurrenceResponseSchema,
  type TaskRescheduleInput,
  type TaskStatusChangeInput,
  type TaskTypeAdminInput,
  type TaskTypeListInput,
  taskTypesResponseSchema,
  type TaskUpdateContentInput,
} from "../../../../shared/schemas/task/task-api.schema.ts";
import {
  type Task,
  type TaskEvent,
  type TaskParticipant,
  taskSchema,
  type TaskSeries,
  taskSeriesSchema,
  taskTypeSchema,
} from "../../../../shared/schemas/task/task-foundation.schema.ts";
import type { AuthContext, DbClient } from "../../types.ts";
import { httpError } from "../../middleware/errorHandler.ts";

const formatIssues = (
  issues: Array<{ path: PropertyKey[]; message: string }>,
) =>
  issues.map((issue) =>
    `${issue.path.map(String).join(".") || "payload"}: ${issue.message}`
  ).join(" | ");

export const readTaskDbErrorCode = (error: unknown): string | undefined => {
  if (typeof error !== "object" || error === null) return undefined;
  const code = Reflect.get(error, "code");
  if (typeof code === "string") return code;
  return readTaskDbErrorCode(Reflect.get(error, "cause"));
};

export const normalizeDatabaseDates = (value: unknown): unknown => {
  if (value instanceof Date) return value.toISOString();
  if (
    typeof value === "string" &&
    /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}(?::?\d{2})?)$/
      .test(value)
  ) {
    const timestamp = new Date(value);
    if (!Number.isNaN(timestamp.valueOf())) return timestamp.toISOString();
  }
  if (Array.isArray(value)) return value.map(normalizeDatabaseDates);
  if (typeof value !== "object" || value === null) return value;
  return Object.fromEntries(
    Object.entries(value).map((
      [key, nested],
    ) => [key, normalizeDatabaseDates(nested)]),
  );
};

const parseOrFail = <T>(
  schema: {
    safeParse: (
      value: unknown,
    ) => {
      success: boolean;
      data?: T;
      error?: { issues: Array<{ path: PropertyKey[]; message: string }> };
    };
  },
  value: unknown,
  label: string,
): T => {
  const parsed = schema.safeParse(normalizeDatabaseDates(value));
  if (!parsed.success) {
    throw httpError(
      500,
      "DB_READ_FAILED",
      `${label} invalide.`,
      formatIssues(parsed.error!.issues),
    );
  }
  return parsed.data!;
};

const isAgencyAdministrator = (auth: AuthContext, agencyId: string) =>
  auth.isSuperAdmin ||
  (auth.role === "agency_admin" && auth.agencyIds.includes(agencyId));

const setAuditActor = (db: DbClient, actorId: string) =>
  db.execute(sql`select private.set_audit_actor(${actorId}::uuid)`);

export const canCreateTaskInAgency = (auth: AuthContext, agencyId: string) =>
  auth.isSuperAdmin || auth.agencyIds.includes(agencyId);

export const canAssignTaskInAgency = (auth: AuthContext, agencyId: string) =>
  isAgencyAdministrator(auth, agencyId);

export const canEditTaskContent = (
  auth: AuthContext,
  task: Pick<Task, "agency_id" | "created_by" | "status">,
) =>
  isAgencyAdministrator(auth, task.agency_id) ||
  (task.created_by === auth.userId &&
    (task.status === "todo" || task.status === "in_progress"));

const isOpenTask = (task: Pick<Task, "status">) =>
  task.status === "todo" || task.status === "in_progress";

export const canChangeTaskAssignment = (
  auth: AuthContext,
  task: Pick<Task, "agency_id" | "created_by" | "status">,
) =>
  isOpenTask(task) &&
  (isAgencyAdministrator(auth, task.agency_id) ||
    task.created_by === auth.userId);

export const canChangeTaskExecution = (
  auth: AuthContext,
  task: Pick<Task, "agency_id" | "responsible_id" | "status">,
) =>
  isOpenTask(task) &&
  (isAgencyAdministrator(auth, task.agency_id) ||
    task.responsible_id === auth.userId);

export const canAddTaskNote = (
  auth: AuthContext,
  task: Pick<Task, "agency_id" | "created_by" | "responsible_id">,
  participants: Array<Pick<TaskParticipant, "profile_id">>,
) =>
  isAgencyAdministrator(auth, task.agency_id) ||
  task.created_by === auth.userId ||
  task.responsible_id === auth.userId ||
  participants.some((participant) => participant.profile_id === auth.userId);

const canManageTaskRecurrence = (
  auth: AuthContext,
  task: Pick<Task, "agency_id" | "created_by" | "responsible_id">,
) =>
  isAgencyAdministrator(auth, task.agency_id) ||
  task.created_by === auth.userId ||
  task.responsible_id === auth.userId;

const canRetryTaskCompletion = (
  auth: AuthContext,
  task: Pick<Task, "agency_id" | "responsible_id">,
) =>
  isAgencyAdministrator(auth, task.agency_id) ||
  task.responsible_id === auth.userId;

export const getTaskStatusTransition = (
  from: Task["status"],
  to: Task["status"],
): "status_changed" | "reopened" => {
  if (
    (from === "todo" &&
      (to === "in_progress" || to === "completed" || to === "canceled")) ||
    (from === "in_progress" && (to === "completed" || to === "canceled")) ||
    ((from === "completed" || from === "canceled") && to === "todo")
  ) {
    return (from === "completed" || from === "canceled")
      ? "reopened"
      : "status_changed";
  }
  throw httpError(
    400,
    "VALIDATION_ERROR",
    "Cette transition de statut n’est pas autorisée.",
  );
};

const requireAgencyAccess = (auth: AuthContext, agencyId: string) => {
  if (!canCreateTaskInAgency(auth, agencyId)) {
    throw httpError(
      403,
      "AUTH_FORBIDDEN",
      "Vous ne pouvez pas créer de tâche dans cette agence.",
    );
  }
};

const assertActiveAgencyMember = async (
  db: DbClient,
  agencyId: string,
  profileId: string,
) => {
  const rows = await db.select({ id: profiles.id })
    .from(agency_members)
    .innerJoin(profiles, eq(profiles.id, agency_members.user_id))
    .where(
      and(
        eq(agency_members.agency_id, agencyId),
        eq(agency_members.user_id, profileId),
        isNull(profiles.archived_at),
      ),
    )
    .limit(1);
  if (!rows[0]) {
    throw httpError(
      400,
      "VALIDATION_ERROR",
      "Le profil assigné doit être actif dans l’agence.",
    );
  }
};

const assertTaskTypeActive = async (db: DbClient, taskTypeId: string) => {
  const rows = await db.select({ id: task_types.id }).from(task_types)
    .where(and(eq(task_types.id, taskTypeId), eq(task_types.is_active, true)))
    .limit(1);
  if (!rows[0]) {
    throw httpError(
      400,
      "VALIDATION_ERROR",
      "Le type de tâche est introuvable ou archivé.",
    );
  }
};

const assertTierLinks = async (
  db: DbClient,
  input: Extract<TaskCreateInput, { kind: "advanced" }>,
) => {
  if (input.scope !== "tier_relation") return;
  const organization = await db.select({ id: entities.id }).from(entities)
    .where(
      and(
        eq(entities.id, input.organization_id!),
        eq(entities.agency_id, input.agency_id),
        isNull(entities.archived_at),
      ),
    ).limit(1);
  if (!organization[0]) {
    throw httpError(
      400,
      "VALIDATION_ERROR",
      "Le Tier doit appartenir à l’agence de la tâche.",
    );
  }
  if (input.contact_id) {
    const contact = await db.select({ id: entity_contacts.id }).from(
      entity_contacts,
    )
      .where(
        and(
          eq(entity_contacts.id, input.contact_id),
          eq(entity_contacts.entity_id, input.organization_id!),
          isNull(entity_contacts.archived_at),
        ),
      ).limit(1);
    if (!contact[0]) {
      throw httpError(
        400,
        "VALIDATION_ERROR",
        "Le contact ne correspond pas au Tier de la tâche.",
      );
    }
  }
  if (input.source_activity_id) {
    const activity = await db.select({ id: activities.id }).from(activities)
      .where(
        and(
          eq(activities.id, input.source_activity_id),
          eq(activities.agency_id, input.agency_id),
          eq(activities.organization_id, input.organization_id!),
        ),
      ).limit(1);
    if (!activity[0]) {
      throw httpError(
        400,
        "VALIDATION_ERROR",
        "L’activité source ne correspond pas au Tier et à l’agence de la tâche.",
      );
    }
  }
};

const getAgencyTimezone = async (db: DbClient, agencyId: string) => {
  const rows = await db.select({ timezone: agencies.timezone }).from(agencies)
    .where(eq(agencies.id, agencyId)).limit(1);
  const timezone = rows[0]?.timezone;
  if (!timezone) {
    throw httpError(404, "AGENCY_NOT_FOUND", "Agence introuvable.");
  }
  return timezone;
};

const taskFields = {
  id: tasks.id,
  agency_id: tasks.agency_id,
  version: tasks.version,
  title: tasks.title,
  description: tasks.description,
  task_type_id: tasks.task_type_id,
  planned_channel: tasks.planned_channel,
  scope: tasks.scope,
  organization_id: tasks.organization_id,
  contact_id: tasks.contact_id,
  source_activity_id: tasks.source_activity_id,
  completion_activity_id: tasks.completion_activity_id,
  created_by: tasks.created_by,
  responsible_id: tasks.responsible_id,
  status: tasks.status,
  priority: tasks.priority,
  due_date: tasks.due_date,
  due_time: tasks.due_time,
  due_timezone: tasks.due_timezone,
  visibility: tasks.visibility,
  completed_at: tasks.completed_at,
  completed_by: tasks.completed_by,
  canceled_at: tasks.canceled_at,
  canceled_by: tasks.canceled_by,
  cancel_reason: tasks.cancel_reason,
  series_id: tasks.series_id,
  previous_task_id: tasks.previous_task_id,
  created_at: tasks.created_at,
  updated_at: tasks.updated_at,
} as const;

const taskTypeFields = {
  id: task_types.id,
  code: task_types.code,
  label: task_types.label,
  sort_order: task_types.sort_order,
  is_active: task_types.is_active,
  created_by: task_types.created_by,
  updated_by: task_types.updated_by,
  created_at: task_types.created_at,
  updated_at: task_types.updated_at,
  archived_at: task_types.archived_at,
} as const;

const isReadableBy = (auth: AuthContext) =>
  auth.isSuperAdmin
    ? undefined
    : auth.agencyIds.length === 0
    ? sql<boolean>`false`
    : sql<boolean>`(
  ${tasks.agency_id} in (${
      sql.join(auth.agencyIds.map((agencyId) => sql`${agencyId}`), sql`, `)
    })
  and (${tasks.visibility} <> 'restricted'
    or ${tasks.created_by} = ${auth.userId}
    or ${tasks.responsible_id} = ${auth.userId}
    or exists (select 1 from public.task_participants p where p.task_id = ${tasks.id} and p.profile_id = ${auth.userId}))
)`;

const escapeLikePattern = (value: string) =>
  value.replaceAll("\\", "\\\\").replaceAll("%", "\\%").replaceAll("_", "\\_");

const loadParticipants = (db: DbClient, taskId: string) =>
  db.select().from(task_participants)
    .where(eq(task_participants.task_id, taskId)).orderBy(
      asc(task_participants.created_at),
    );

const loadEvents = (db: DbClient, taskId: string) =>
  db.select().from(task_events).where(eq(task_events.task_id, taskId)).orderBy(
    asc(task_events.event_order),
  );

const loadTaskDetail = async (
  db: DbClient,
  auth: AuthContext,
  taskId: string,
): Promise<TaskDetail> => {
  const readable = isReadableBy(auth);
  const rows = await db.select(taskFields).from(tasks).where(
    and(eq(tasks.id, taskId), readable),
  ).limit(1);
  const task = rows[0];
  if (!task) throw httpError(404, "NOT_FOUND", "Tâche introuvable.");
  return parseOrFail(taskDetailSchema, {
    task,
    participants: await loadParticipants(db, taskId),
    events: await loadEvents(db, taskId),
  }, "Détail de tâche");
};

const loadTaskForMutation = async (db: DbClient, taskId: string) => {
  const rows = await db.select(taskFields).from(tasks).where(
    eq(tasks.id, taskId),
  ).limit(1);
  if (!rows[0]) throw httpError(404, "NOT_FOUND", "Tâche introuvable.");
  return parseOrFail(taskSchema, rows[0], "Tâche à modifier");
};

export const requireExpectedVersion = (task: Task, expectedVersion: number) => {
  if (task.version !== expectedVersion) {
    throw httpError(
      409,
      "CONFLICT",
      "Cette tâche a été modifiée. Rechargez-la avant de recommencer.",
    );
  }
};

export const nextTaskEventOrder = (lastEventOrder: number | undefined) =>
  (lastEventOrder ?? 0) + 1;

const appendTaskEvent = async (
  db: DbClient,
  task: Pick<Task, "id" | "agency_id" | "version">,
  actorId: string | null,
  eventType: TaskEvent["event_type"],
  previousValue: unknown,
  newValue: unknown,
  note: string | null = null,
) => {
  const rows = await db.select({ event_order: task_events.event_order }).from(
    task_events,
  )
    .where(eq(task_events.task_id, task.id)).orderBy(
      desc(task_events.event_order),
    ).limit(1);
  await db.insert(task_events).values({
    task_id: task.id,
    agency_id: task.agency_id,
    event_order: nextTaskEventOrder(rows[0]?.event_order),
    event_type: eventType,
    actor_kind: actorId === null ? "system" : "user",
    actor_id: actorId,
    task_version: task.version,
    previous_value: previousValue,
    new_value: newValue,
    metadata: {},
    note,
  });
};

const taskSeriesFields = {
  id: task_series.id,
  agency_id: task_series.agency_id,
  interval_value: task_series.interval_value,
  interval_unit: task_series.interval_unit,
  is_active: task_series.is_active,
  task_type_id: task_series.task_type_id,
  title: task_series.title,
  description: task_series.description,
  planned_channel: task_series.planned_channel,
  scope: task_series.scope,
  organization_id: task_series.organization_id,
  contact_id: task_series.contact_id,
  responsible_id: task_series.responsible_id,
  priority: task_series.priority,
  due_time: task_series.due_time,
  due_timezone: task_series.due_timezone,
  visibility: task_series.visibility,
  created_by: task_series.created_by,
  stopped_by: task_series.stopped_by,
  created_at: task_series.created_at,
  stopped_at: task_series.stopped_at,
} as const;

const loadTaskSeries = async (db: DbClient, seriesId: string) => {
  const rows = await db.select(taskSeriesFields).from(task_series).where(
    eq(task_series.id, seriesId),
  ).limit(1);
  if (!rows[0]) {
    throw httpError(404, "NOT_FOUND", "Série de tâches introuvable.");
  }
  return parseOrFail(taskSeriesSchema, rows[0], "Série de tâches");
};

const calendarParts = (timestamp: string, timezone: string) => {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date(timestamp));
  const readPart = (type: "year" | "month" | "day") =>
    Number(parts.find((part) => part.type === type)?.value);
  return {
    year: readPart("year"),
    month: readPart("month"),
    day: readPart("day"),
  };
};

export const calculateNextTaskDueDate = (
  completedAt: string,
  timezone: string,
  intervalValue: number,
  intervalUnit: TaskSeries["interval_unit"],
): string => {
  const { year, month, day } = calendarParts(completedAt, timezone);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (intervalUnit === "month") {
    const targetMonthStart = new Date(
      Date.UTC(year, month - 1 + intervalValue, 1),
    );
    const lastDay = new Date(Date.UTC(
      targetMonthStart.getUTCFullYear(),
      targetMonthStart.getUTCMonth() + 1,
      0,
    )).getUTCDate();
    date.setUTCFullYear(
      targetMonthStart.getUTCFullYear(),
      targetMonthStart.getUTCMonth(),
      Math.min(day, lastDay),
    );
  } else {
    date.setUTCDate(
      date.getUTCDate() + intervalValue * (intervalUnit === "week" ? 7 : 1),
    );
  }
  return date.toISOString().slice(0, 10);
};

const createNextOccurrenceIfActive = async (
  db: DbClient,
  current: Task,
  completedAt: string,
): Promise<string | null> => {
  if (!current.series_id) return null;
  const seriesRows = await db.select(taskSeriesFields).from(task_series).where(
    and(eq(task_series.id, current.series_id), eq(task_series.is_active, true)),
  ).limit(1);
  if (!seriesRows[0]) return null;
  const series = parseOrFail(taskSeriesSchema, seriesRows[0], "Série active");
  const existing = await db.select({ id: tasks.id }).from(tasks).where(
    eq(tasks.previous_task_id, current.id),
  ).limit(1);
  if (existing[0]) return existing[0].id;

  const nextId = crypto.randomUUID();
  await db.insert(tasks).values({
    id: nextId,
    agency_id: series.agency_id,
    title: series.title,
    description: series.description,
    task_type_id: series.task_type_id,
    planned_channel: series.planned_channel,
    scope: series.scope,
    organization_id: series.organization_id,
    contact_id: series.contact_id,
    created_by: series.created_by,
    responsible_id: series.responsible_id,
    status: "todo",
    priority: series.priority,
    due_date: calculateNextTaskDueDate(
      completedAt,
      series.due_timezone,
      series.interval_value,
      series.interval_unit,
    ),
    due_time: series.due_time,
    due_timezone: series.due_timezone,
    visibility: series.visibility,
    series_id: series.id,
    previous_task_id: current.id,
  });
  await db.insert(task_events).values({
    task_id: nextId,
    agency_id: series.agency_id,
    event_order: 1,
    event_type: "created",
    actor_kind: "system",
    actor_id: null,
    task_version: 1,
    metadata: { series_id: series.id, previous_task_id: current.id },
  });
  await appendTaskEvent(
    db,
    { ...current, version: current.version + 1 },
    null,
    "next_occurrence_created",
    null,
    {
      task_id: nextId,
      due_date: calculateNextTaskDueDate(
        completedAt,
        series.due_timezone,
        series.interval_value,
        series.interval_unit,
      ),
    },
  );
  return nextId;
};

const createCompletionActivity = async (
  db: DbClient,
  auth: AuthContext,
  task: Task,
  input: TaskExecuteWithActivityInput,
): Promise<string> => {
  const organizations = await db.select({
    id: entities.id,
    entity_type: entities.entity_type,
    name: entities.name,
  }).from(entities).where(
    and(
      eq(entities.id, task.organization_id!),
      eq(entities.agency_id, task.agency_id),
      isNull(entities.archived_at),
    ),
  ).limit(1);
  const organization = organizations[0];
  if (!organization) {
    throw httpError(
      400,
      "VALIDATION_ERROR",
      "Le Tier de la tâche est introuvable ou archivé.",
    );
  }
  const contactRows = task.contact_id
    ? await db.select({
      id: entity_contacts.id,
      first_name: entity_contacts.first_name,
      last_name: entity_contacts.last_name,
      email: entity_contacts.email,
      phone: entity_contacts.phone,
      service_label: entity_contacts.service_label,
    }).from(entity_contacts).where(
      and(
        eq(entity_contacts.id, task.contact_id),
        eq(entity_contacts.entity_id, organization.id),
        isNull(entity_contacts.archived_at),
      ),
    ).limit(1)
    : [];
  const contact = contactRows[0];
  if (task.contact_id && !contact) {
    throw httpError(
      400,
      "VALIDATION_ERROR",
      "Le contact de la tâche est introuvable ou archivé.",
    );
  }

  await db.insert(interactions).values({
    id: input.idempotency_key,
    agency_id: task.agency_id,
    channel: input.activity.channel,
    entity_type: organization.entity_type,
    contact_service: contact?.service_label ?? "",
    company_name: organization.name,
    contact_name: contact
      ? [contact.first_name, contact.last_name].filter(Boolean).join(" ")
      : "",
    contact_phone: contact?.phone ?? null,
    contact_email: contact?.email ?? null,
    subject: input.activity.subject,
    mega_families: [],
    status: "",
    interaction_type: input.activity.activity_type,
    notes: input.activity.report,
    entity_id: organization.id,
    contact_id: contact?.id ?? null,
    created_by: auth.userId,
    updated_by: auth.userId,
    timeline: [],
    created_at: input.activity.occurred_at,
    last_action_at: input.activity.occurred_at,
  });

  const activityRows = await db.select({ id: activities.id }).from(activities)
    .where(eq(activities.legacy_interaction_id, input.idempotency_key)).limit(
      1,
    );
  const activityId = activityRows[0]?.id;
  if (!activityId) {
    throw httpError(
      500,
      "DB_WRITE_FAILED",
      "Le pont Activity v2 n’a pas matérialisé l’activité.",
    );
  }
  await db.insert(activity_sources).values({
    activity_id: activityId,
    agency_id: task.agency_id,
    source_type: "manual",
    source_reference: task.id,
    source_label: "Réalisation de tâche",
    captured_at: input.activity.occurred_at,
    created_by: auth.userId,
  });
  await db.insert(activity_history_events).values({
    activity_id: activityId,
    agency_id: task.agency_id,
    event_order: 1,
    event_type: "completion",
    event_domain: "activity",
    occurred_at: input.activity.occurred_at,
    author_id: auth.userId,
    content: input.activity.subject,
    raw_event: { source_task_id: task.id },
  });
  return activityId;
};

const executionRetryMatches = async (
  db: DbClient,
  task: Task,
  input: TaskExecuteWithActivityInput,
) => {
  if (!task.completion_activity_id) return false;
  const rows = await db.select({
    agency_id: activities.agency_id,
    organization_id: activities.organization_id,
    contact_id: activities.contact_id,
    occurred_at: activities.occurred_at,
    channel: activities.channel,
    activity_type: activities.activity_type,
    subject: activities.subject,
    report: activities.report,
    legacy_interaction_id: activities.legacy_interaction_id,
  }).from(activities).where(eq(activities.id, task.completion_activity_id))
    .limit(
      1,
    );
  const activity = rows[0];
  if (!activity) return false;
  const occurredAt = new Date(activity.occurred_at).toISOString();
  const expectedOccurredAt = new Date(input.activity.occurred_at).toISOString();
  if (
    activity.agency_id !== task.agency_id ||
    activity.legacy_interaction_id !== input.idempotency_key ||
    activity.organization_id !== task.organization_id ||
    activity.contact_id !== task.contact_id ||
    occurredAt !== expectedOccurredAt ||
    activity.channel !== input.activity.channel ||
    activity.activity_type !== input.activity.activity_type ||
    activity.subject !== input.activity.subject ||
    activity.report !== input.activity.report
  ) {
    throw httpError(
      409,
      "CONFLICT",
      "Cette clé idempotente a déjà été utilisée avec une autre activité.",
    );
  }
  return true;
};

const updateTaskVersion = async (
  db: DbClient,
  task: Task,
  expectedVersion: number,
  values: Record<string, unknown>,
) => {
  const rows = await db.update(tasks).set({
    ...values,
    version: expectedVersion + 1,
    updated_at: new Date().toISOString(),
  }).where(and(eq(tasks.id, task.id), eq(tasks.version, expectedVersion)))
    .returning(taskFields);
  if (!rows[0]) {
    throw httpError(
      409,
      "CONFLICT",
      "Cette tâche a été modifiée. Rechargez-la avant de recommencer.",
    );
  }
  return parseOrFail(taskSchema, rows[0], "Tâche modifiée");
};

export const assertIdempotentCreateMatches = (
  existing: Task,
  input: TaskCreateInput,
): void => {
  if (
    existing.title !== input.title ||
    existing.task_type_id !== input.task_type_id ||
    existing.agency_id !== input.agency_id
  ) {
    throw httpError(
      409,
      "CONFLICT",
      "Cette clé idempotente a déjà été utilisée pour une autre tâche.",
    );
  }
};

export const createTask = async (
  db: DbClient,
  auth: AuthContext,
  _requestId: string,
  input: TaskCreateInput,
): Promise<TaskCreateResponse> => {
  requireAgencyAccess(auth, input.agency_id);
  await assertTaskTypeActive(db, input.task_type_id);
  await assertActiveAgencyMember(db, input.agency_id, auth.userId);
  const advanced = input.kind === "advanced" ? input : undefined;
  if (advanced) {
    await assertTierLinks(db, advanced);
    if (advanced.responsible_id) {
      if (
        advanced.responsible_id !== auth.userId &&
        !canAssignTaskInAgency(auth, input.agency_id)
      ) {
        throw httpError(
          403,
          "AUTH_FORBIDDEN",
          "Seul un responsable d’agence peut assigner une autre personne à la création.",
        );
      }
      await assertActiveAgencyMember(
        db,
        input.agency_id,
        advanced.responsible_id,
      );
    }
    for (const participant of advanced.participants) {
      if (
        participant.profile_id !== auth.userId &&
        !canAssignTaskInAgency(auth, input.agency_id)
      ) {
        throw httpError(
          403,
          "AUTH_FORBIDDEN",
          "Seul un responsable d’agence peut ajouter des participants à la création.",
        );
      }
      await assertActiveAgencyMember(
        db,
        input.agency_id,
        participant.profile_id,
      );
    }
  }
  const timezone = await getAgencyTimezone(db, input.agency_id);
  const taskId = input.idempotency_key;
  try {
    return await db.transaction(async (tx) => {
      await setAuditActor(tx, auth.userId);
      const existing = await tx.select(taskFields).from(tasks).where(
        eq(tasks.id, taskId),
      ).limit(1);
      if (existing[0]) {
        const task = parseOrFail(taskSchema, existing[0], "Tâche idempotente");
        assertIdempotentCreateMatches(task, input);
        return parseOrFail(taskCreateResponseSchema, {
          ...(await loadTaskDetail(tx, auth, taskId)),
          idempotent: true,
        }, "Réponse de création");
      }
      const responsibleId = advanced ? advanced.responsible_id : auth.userId;
      const inserted = await tx.insert(tasks).values({
        id: taskId,
        agency_id: input.agency_id,
        title: input.title,
        task_type_id: input.task_type_id,
        description: advanced?.description ?? null,
        planned_channel: advanced?.planned_channel ?? null,
        scope: advanced?.scope ?? "internal_cir",
        organization_id: advanced?.organization_id ?? null,
        contact_id: advanced?.contact_id ?? null,
        source_activity_id: advanced?.source_activity_id ?? null,
        created_by: auth.userId,
        responsible_id: responsibleId,
        status: "todo",
        priority: advanced?.priority ?? "normal",
        due_date: input.due_date,
        due_time: advanced?.due_time ?? null,
        due_timezone: timezone,
        visibility: advanced?.visibility ?? "restricted",
      }).returning(taskFields);
      const task = parseOrFail(taskSchema, inserted[0], "Tâche créée");
      for (const participant of advanced?.participants ?? []) {
        await tx.insert(task_participants).values({
          task_id: task.id,
          agency_id: task.agency_id,
          profile_id: participant.profile_id,
          participant_role: participant.participant_role,
          added_by: auth.userId,
        });
      }
      await tx.insert(task_events).values({
        id: input.idempotency_key,
        task_id: task.id,
        agency_id: task.agency_id,
        event_order: 1,
        event_type: "created",
        actor_kind: "user",
        actor_id: auth.userId,
        task_version: 1,
        metadata: { idempotency_key: input.idempotency_key },
      });
      return parseOrFail(taskCreateResponseSchema, {
        ...(await loadTaskDetail(tx, auth, task.id)),
        idempotent: false,
      }, "Réponse de création");
    });
  } catch (error) {
    if (
      typeof error === "object" && error !== null &&
      Reflect.get(error, "code") === "CONFLICT"
    ) throw error;
    throw httpError(500, "DB_WRITE_FAILED", "Impossible de créer la tâche.");
  }
};

export const getTask = (
  db: DbClient,
  auth: AuthContext,
  _requestId: string,
  input: TaskGetInput,
) => loadTaskDetail(db, auth, input.task_id);

export const updateTaskContent = async (
  db: DbClient,
  auth: AuthContext,
  _requestId: string,
  input: TaskUpdateContentInput,
): Promise<TaskDetail> => {
  const currentRows = await db.select(taskFields).from(tasks).where(
    eq(tasks.id, input.task_id),
  ).limit(1);
  const current = currentRows[0]
    ? parseOrFail(taskSchema, currentRows[0], "Tâche à modifier")
    : undefined;
  if (!current) throw httpError(404, "NOT_FOUND", "Tâche introuvable.");
  if (!canEditTaskContent(auth, current)) {
    throw httpError(
      403,
      "AUTH_FORBIDDEN",
      "Vous ne pouvez pas modifier le contenu de cette tâche.",
    );
  }
  const organizationId = input.patch.organization_id ?? current.organization_id;
  const contactId = input.patch.contact_id ?? current.contact_id;
  const sourceActivityId = input.patch.source_activity_id ??
    current.source_activity_id;
  if (
    current.scope === "internal_cir" &&
    (organizationId !== null || contactId !== null || sourceActivityId !== null)
  ) {
    throw httpError(
      400,
      "VALIDATION_ERROR",
      "Une tâche interne ne peut pas recevoir de lien Tier ou activité.",
    );
  }
  if (current.scope === "tier_relation") {
    await assertTierLinks(db, {
      kind: "advanced",
      agency_id: current.agency_id,
      title: input.patch.title ?? current.title,
      task_type_id: current.task_type_id,
      due_date: current.due_date,
      idempotency_key: current.id,
      description: input.patch.description ?? current.description,
      planned_channel: input.patch.planned_channel ?? current.planned_channel,
      scope: current.scope,
      organization_id: organizationId,
      contact_id: contactId,
      source_activity_id: sourceActivityId,
      responsible_id: current.responsible_id,
      priority: current.priority,
      due_time: current.due_time,
      visibility: current.visibility,
      participants: [],
    });
  }
  try {
    return await db.transaction(async (tx) => {
      await setAuditActor(tx, auth.userId);
      const updated = await updateTaskVersion(
        tx,
        current,
        input.expected_version,
        input.patch,
      );
      const previousValue = Object.fromEntries(
        Object.keys(input.patch).map((key) => [
          key,
          current[key as keyof Task],
        ]),
      );
      await appendTaskEvent(
        tx,
        updated,
        auth.userId,
        "content_changed",
        previousValue,
        input.patch,
      );
      return loadTaskDetail(tx, auth, input.task_id);
    });
  } catch (error) {
    if (
      typeof error === "object" && error !== null &&
      Reflect.get(error, "code") === "CONFLICT"
    ) throw error;
    throw httpError(500, "DB_WRITE_FAILED", "Impossible de modifier la tâche.");
  }
};

export const updateTaskAssignment = async (
  db: DbClient,
  auth: AuthContext,
  _requestId: string,
  input: TaskAssignmentInput,
): Promise<TaskDetail> => {
  const current = await loadTaskForMutation(db, input.task_id);
  requireExpectedVersion(current, input.expected_version);
  const participants = await loadParticipants(db, current.id);
  const canManage = canChangeTaskAssignment(auth, current) ||
    canChangeTaskExecution(auth, current);
  if (input.action === "claim") {
    if (
      !isOpenTask(current) || current.status !== "todo" ||
      current.responsible_id !== null ||
      !canCreateTaskInAgency(auth, current.agency_id)
    ) {
      throw httpError(
        403,
        "AUTH_FORBIDDEN",
        "Cette tâche de file ne peut pas être réclamée.",
      );
    }
  } else if (!canManage) {
    throw httpError(
      403,
      "AUTH_FORBIDDEN",
      "Vous ne pouvez pas modifier l’affectation de cette tâche.",
    );
  }
  if (
    input.action === "assign" && input.responsible_id !== null &&
    input.responsible_id !== auth.userId &&
    !isAgencyAdministrator(auth, current.agency_id)
  ) {
    throw httpError(
      403,
      "AUTH_FORBIDDEN",
      "Seul un responsable d’agence peut réassigner une autre personne.",
    );
  }
  if (
    (input.action === "add_participant" ||
      input.action === "remove_participant") &&
    input.profile_id !== auth.userId &&
    !isAgencyAdministrator(auth, current.agency_id) &&
    current.responsible_id !== auth.userId
  ) {
    throw httpError(
      403,
      "AUTH_FORBIDDEN",
      "Vous ne pouvez pas modifier ce participant.",
    );
  }
  if (input.action === "assign" && input.responsible_id) {
    await assertActiveAgencyMember(db, current.agency_id, input.responsible_id);
  }
  if (input.action === "claim") {
    await assertActiveAgencyMember(db, current.agency_id, auth.userId);
  }
  if (input.action === "add_participant") {
    await assertActiveAgencyMember(db, current.agency_id, input.profile_id);
  }
  try {
    return await db.transaction(async (tx) => {
      await setAuditActor(tx, auth.userId);
      if (input.action === "assign" || input.action === "claim") {
        const responsibleId = input.action === "claim"
          ? auth.userId
          : input.responsible_id;
        const updated = await updateTaskVersion(
          tx,
          current,
          input.expected_version,
          { responsible_id: responsibleId },
        );
        await appendTaskEvent(tx, updated, auth.userId, "responsible_changed", {
          responsible_id: current.responsible_id,
        }, { responsible_id: responsibleId });
      } else if (input.action === "add_participant") {
        const exists = participants.some((participant) =>
          participant.profile_id === input.profile_id &&
          participant.participant_role === input.participant_role
        );
        if (exists) {
          throw httpError(
            409,
            "CONFLICT",
            "Ce participant possède déjà ce rôle.",
          );
        }
        const updated = await updateTaskVersion(
          tx,
          current,
          input.expected_version,
          {},
        );
        await tx.insert(task_participants).values({
          task_id: current.id,
          agency_id: current.agency_id,
          profile_id: input.profile_id,
          participant_role: input.participant_role,
          added_by: auth.userId,
        });
        await appendTaskEvent(
          tx,
          updated,
          auth.userId,
          "participant_added",
          null,
          {
            profile_id: input.profile_id,
            participant_role: input.participant_role,
          },
        );
      } else {
        const exists = participants.some((participant) =>
          participant.profile_id === input.profile_id &&
          participant.participant_role === input.participant_role
        );
        if (!exists) {
          throw httpError(404, "NOT_FOUND", "Participant introuvable.");
        }
        const updated = await updateTaskVersion(
          tx,
          current,
          input.expected_version,
          {},
        );
        await tx.delete(task_participants).where(
          and(
            eq(task_participants.task_id, current.id),
            eq(task_participants.profile_id, input.profile_id),
            eq(task_participants.participant_role, input.participant_role),
          ),
        );
        await appendTaskEvent(tx, updated, auth.userId, "participant_removed", {
          profile_id: input.profile_id,
          participant_role: input.participant_role,
        }, null);
      }
      return loadTaskDetail(tx, auth, current.id);
    });
  } catch (error) {
    if (
      typeof error === "object" && error !== null &&
      ["CONFLICT", "NOT_FOUND"].includes(String(Reflect.get(error, "code")))
    ) throw error;
    throw httpError(
      500,
      "DB_WRITE_FAILED",
      "Impossible de modifier l’affectation de la tâche.",
    );
  }
};

export const rescheduleTask = async (
  db: DbClient,
  auth: AuthContext,
  _requestId: string,
  input: TaskRescheduleInput,
): Promise<TaskDetail> => {
  const current = await loadTaskForMutation(db, input.task_id);
  requireExpectedVersion(current, input.expected_version);
  if (!canChangeTaskExecution(auth, current)) {
    throw httpError(
      403,
      "AUTH_FORBIDDEN",
      "Vous ne pouvez pas reporter cette tâche.",
    );
  }
  try {
    return await db.transaction(async (tx) => {
      await setAuditActor(tx, auth.userId);
      const updated = await updateTaskVersion(
        tx,
        current,
        input.expected_version,
        { due_date: input.due_date, due_time: input.due_time ?? null },
      );
      await appendTaskEvent(
        tx,
        updated,
        auth.userId,
        "due_changed",
        { due_date: current.due_date, due_time: current.due_time },
        { due_date: input.due_date, due_time: input.due_time ?? null },
        input.reason ?? null,
      );
      return loadTaskDetail(tx, auth, current.id);
    });
  } catch (error) {
    if (
      typeof error === "object" && error !== null &&
      Reflect.get(error, "code") === "CONFLICT"
    ) throw error;
    throw httpError(500, "DB_WRITE_FAILED", "Impossible de reporter la tâche.");
  }
};

export const changeTaskPriority = async (
  db: DbClient,
  auth: AuthContext,
  _requestId: string,
  input: TaskPriorityChangeInput,
): Promise<TaskDetail> => {
  const current = await loadTaskForMutation(db, input.task_id);
  requireExpectedVersion(current, input.expected_version);
  if (!canChangeTaskExecution(auth, current)) {
    throw httpError(
      403,
      "AUTH_FORBIDDEN",
      "Vous ne pouvez pas modifier la priorité de cette tâche.",
    );
  }
  try {
    return await db.transaction(async (tx) => {
      await setAuditActor(tx, auth.userId);
      const updated = await updateTaskVersion(
        tx,
        current,
        input.expected_version,
        { priority: input.priority },
      );
      await appendTaskEvent(tx, updated, auth.userId, "priority_changed", {
        priority: current.priority,
      }, { priority: input.priority });
      return loadTaskDetail(tx, auth, current.id);
    });
  } catch (error) {
    if (
      typeof error === "object" && error !== null &&
      Reflect.get(error, "code") === "CONFLICT"
    ) throw error;
    throw httpError(
      500,
      "DB_WRITE_FAILED",
      "Impossible de modifier la priorité de la tâche.",
    );
  }
};

export const changeTaskStatus = async (
  db: DbClient,
  auth: AuthContext,
  _requestId: string,
  input: TaskStatusChangeInput,
): Promise<TaskDetail> => {
  const current = await loadTaskForMutation(db, input.task_id);
  if (current.status === "completed" && input.status === "completed") {
    if (!canRetryTaskCompletion(auth, current)) {
      throw httpError(
        403,
        "AUTH_FORBIDDEN",
        "Vous ne pouvez pas terminer cette tâche.",
      );
    }
    return loadTaskDetail(db, auth, current.id);
  }
  requireExpectedVersion(current, input.expected_version);
  const eventType = getTaskStatusTransition(current.status, input.status);
  const canReopen = input.status === "todo" &&
    (isAgencyAdministrator(auth, current.agency_id) ||
      current.responsible_id === auth.userId);
  if (!canChangeTaskExecution(auth, current) && !canReopen) {
    throw httpError(
      403,
      "AUTH_FORBIDDEN",
      "Vous ne pouvez pas modifier le statut de cette tâche.",
    );
  }
  const now = new Date().toISOString();
  const values = input.status === "completed"
    ? {
      status: input.status,
      completed_at: now,
      completed_by: auth.userId,
      canceled_at: null,
      canceled_by: null,
      cancel_reason: null,
    }
    : input.status === "canceled"
    ? {
      status: input.status,
      completed_at: null,
      completed_by: null,
      canceled_at: now,
      canceled_by: auth.userId,
      cancel_reason: input.cancel_reason ?? null,
    }
    : {
      status: input.status,
      completed_at: null,
      completed_by: null,
      canceled_at: null,
      canceled_by: null,
      cancel_reason: null,
    };
  try {
    return await db.transaction(async (tx) => {
      await setAuditActor(tx, auth.userId);
      const updated = await updateTaskVersion(
        tx,
        current,
        input.expected_version,
        values,
      );
      await appendTaskEvent(tx, updated, auth.userId, eventType, {
        status: current.status,
      }, {
        status: input.status,
        cancel_reason: input.status === "canceled"
          ? input.cancel_reason ?? null
          : null,
      });
      if (input.status === "completed") {
        await createNextOccurrenceIfActive(tx, current, now);
      }
      return loadTaskDetail(tx, auth, current.id);
    });
  } catch (error) {
    if (
      typeof error === "object" && error !== null &&
      Reflect.get(error, "code") === "CONFLICT"
    ) throw error;
    throw httpError(
      500,
      "DB_WRITE_FAILED",
      "Impossible de modifier le statut de la tâche.",
    );
  }
};

export const addTaskNote = async (
  db: DbClient,
  auth: AuthContext,
  _requestId: string,
  input: TaskNoteInput,
): Promise<TaskDetail> => {
  const current = await loadTaskForMutation(db, input.task_id);
  requireExpectedVersion(current, input.expected_version);
  const participants = await loadParticipants(db, current.id);
  if (!canAddTaskNote(auth, current, participants)) {
    throw httpError(
      403,
      "AUTH_FORBIDDEN",
      "Vous ne pouvez pas ajouter une note à cette tâche.",
    );
  }
  try {
    return await db.transaction(async (tx) => {
      await setAuditActor(tx, auth.userId);
      const updated = await updateTaskVersion(
        tx,
        current,
        input.expected_version,
        {},
      );
      await appendTaskEvent(
        tx,
        updated,
        auth.userId,
        "note_added",
        null,
        null,
        input.note,
      );
      return loadTaskDetail(tx, auth, current.id);
    });
  } catch (error) {
    if (
      typeof error === "object" && error !== null &&
      Reflect.get(error, "code") === "CONFLICT"
    ) throw error;
    throw httpError(500, "DB_WRITE_FAILED", "Impossible d’ajouter la note.");
  }
};

export const executeTaskWithActivity = async (
  db: DbClient,
  auth: AuthContext,
  _requestId: string,
  input: TaskExecuteWithActivityInput,
): Promise<TaskExecutionResponse> => {
  try {
    return await db.transaction(async (tx) => {
      await setAuditActor(tx, auth.userId);
      await tx.execute(sql`
        select id from public.tasks
        where id = ${input.task_id}::uuid and version = ${input.expected_version}
        for update
      `);
      const current = await loadTaskForMutation(tx, input.task_id);
      if (current.status === "completed") {
        if (!canRetryTaskCompletion(auth, current)) {
          throw httpError(
            403,
            "AUTH_FORBIDDEN",
            "Vous ne pouvez pas exécuter cette tâche.",
          );
        }
        if (!(await executionRetryMatches(tx, current, input))) {
          throw httpError(
            409,
            "CONFLICT",
            "Cette tâche est déjà terminée par une autre exécution.",
          );
        }
        const next = await tx.select({ id: tasks.id }).from(tasks).where(
          eq(tasks.previous_task_id, current.id),
        ).limit(1);
        return parseOrFail(taskExecutionResponseSchema, {
          ...(await loadTaskDetail(tx, auth, current.id)),
          activity_id: current.completion_activity_id,
          next_occurrence_id: next[0]?.id ?? null,
          idempotent: true,
        }, "Réponse d’exécution de tâche");
      }
      requireExpectedVersion(current, input.expected_version);
      if (!canChangeTaskExecution(auth, current)) {
        throw httpError(
          403,
          "AUTH_FORBIDDEN",
          "Vous ne pouvez pas exécuter cette tâche.",
        );
      }
      if (current.scope !== "tier_relation" || !current.organization_id) {
        throw httpError(
          400,
          "VALIDATION_ERROR",
          "Seule une tâche liée à un Tier peut créer une activité de réalisation.",
        );
      }

      const activityId = await createCompletionActivity(
        tx,
        auth,
        current,
        input,
      );
      const completedAt = new Date().toISOString();
      const updated = await updateTaskVersion(
        tx,
        current,
        input.expected_version,
        {
          status: "completed",
          completion_activity_id: activityId,
          completed_at: completedAt,
          completed_by: auth.userId,
          canceled_at: null,
          canceled_by: null,
          cancel_reason: null,
        },
      );
      await appendTaskEvent(
        tx,
        updated,
        auth.userId,
        "completion_activity_created",
        null,
        { activity_id: activityId },
        null,
      );
      await appendTaskEvent(
        tx,
        updated,
        auth.userId,
        "status_changed",
        { status: current.status },
        { status: "completed" },
      );
      const nextOccurrenceId = await createNextOccurrenceIfActive(
        tx,
        current,
        completedAt,
      );
      return parseOrFail(taskExecutionResponseSchema, {
        ...(await loadTaskDetail(tx, auth, current.id)),
        activity_id: activityId,
        next_occurrence_id: nextOccurrenceId,
        idempotent: false,
      }, "Réponse d’exécution de tâche");
    });
  } catch (error) {
    const code = readTaskDbErrorCode(error);
    if (
      ["CONFLICT", "AUTH_FORBIDDEN", "VALIDATION_ERROR", "NOT_FOUND"].includes(
        String(code),
      )
    ) {
      throw error;
    }
    if (code === "23505") {
      throw httpError(
        409,
        "CONFLICT",
        "Cette exécution a déjà été enregistrée.",
      );
    }
    throw httpError(
      500,
      "DB_WRITE_FAILED",
      "Impossible d’exécuter la tâche avec son activité.",
    );
  }
};

export const updateTaskRecurrence = async (
  db: DbClient,
  auth: AuthContext,
  _requestId: string,
  input: TaskRecurrenceInput,
): Promise<TaskRecurrenceResponse> => {
  try {
    return await db.transaction(async (tx) => {
      await setAuditActor(tx, auth.userId);
      await tx.execute(sql`
        select id from public.tasks
        where id = ${input.task_id}::uuid and version = ${input.expected_version}
        for update
      `);
      const current = await loadTaskForMutation(tx, input.task_id);
      if (!canManageTaskRecurrence(auth, current)) {
        throw httpError(
          403,
          "AUTH_FORBIDDEN",
          "Vous ne pouvez pas modifier la récurrence de cette tâche.",
        );
      }

      if (input.action === "configure") {
        if (current.series_id) {
          if (current.series_id !== input.idempotency_key) {
            throw httpError(
              409,
              "CONFLICT",
              "Cette tâche appartient déjà à une autre série.",
            );
          }
          const series = await loadTaskSeries(tx, current.series_id);
          if (
            series.interval_value !== input.interval_value ||
            series.interval_unit !== input.interval_unit
          ) {
            throw httpError(
              409,
              "CONFLICT",
              "Cette clé idempotente correspond à une autre récurrence.",
            );
          }
          return parseOrFail(taskRecurrenceResponseSchema, {
            ...(await loadTaskDetail(tx, auth, current.id)),
            series,
            idempotent: true,
          }, "Réponse de récurrence");
        }
        requireExpectedVersion(current, input.expected_version);
        if (!isOpenTask(current)) {
          throw httpError(
            400,
            "VALIDATION_ERROR",
            "La récurrence se configure sur une tâche ouverte.",
          );
        }
        const inserted = await tx.insert(task_series).values({
          id: input.idempotency_key,
          agency_id: current.agency_id,
          interval_value: input.interval_value,
          interval_unit: input.interval_unit,
          task_type_id: current.task_type_id,
          title: current.title,
          description: current.description,
          planned_channel: current.planned_channel,
          scope: current.scope,
          organization_id: current.organization_id,
          contact_id: current.contact_id,
          responsible_id: current.responsible_id,
          priority: current.priority,
          due_time: current.due_time,
          due_timezone: current.due_timezone,
          visibility: current.visibility,
          created_by: auth.userId,
        }).returning(taskSeriesFields);
        const series = parseOrFail(
          taskSeriesSchema,
          inserted[0],
          "Série créée",
        );
        const updated = await updateTaskVersion(
          tx,
          current,
          input.expected_version,
          {
            series_id: series.id,
          },
        );
        await appendTaskEvent(
          tx,
          updated,
          auth.userId,
          "series_attached",
          null,
          {
            series_id: series.id,
            interval_value: series.interval_value,
            interval_unit: series.interval_unit,
          },
        );
        return parseOrFail(taskRecurrenceResponseSchema, {
          ...(await loadTaskDetail(tx, auth, current.id)),
          series,
          idempotent: false,
        }, "Réponse de récurrence");
      }

      if (!current.series_id) {
        throw httpError(
          400,
          "VALIDATION_ERROR",
          "Cette tâche n’appartient à aucune série.",
        );
      }
      const series = await loadTaskSeries(tx, current.series_id);
      if (!series.is_active) {
        return parseOrFail(taskRecurrenceResponseSchema, {
          ...(await loadTaskDetail(tx, auth, current.id)),
          series,
          idempotent: true,
        }, "Réponse d’arrêt de récurrence");
      }
      requireExpectedVersion(current, input.expected_version);
      const stoppedAt = new Date().toISOString();
      const stoppedRows = await tx.update(task_series).set({
        is_active: false,
        stopped_by: auth.userId,
        stopped_at: stoppedAt,
      }).where(
        and(eq(task_series.id, series.id), eq(task_series.is_active, true)),
      )
        .returning(taskSeriesFields);
      if (!stoppedRows[0]) {
        throw httpError(409, "CONFLICT", "La série a déjà été modifiée.");
      }
      const stopped = parseOrFail(
        taskSeriesSchema,
        stoppedRows[0],
        "Série arrêtée",
      );
      const updated = await updateTaskVersion(
        tx,
        current,
        input.expected_version,
        {},
      );
      await appendTaskEvent(
        tx,
        updated,
        auth.userId,
        "series_stopped",
        { is_active: true },
        { is_active: false },
      );
      return parseOrFail(taskRecurrenceResponseSchema, {
        ...(await loadTaskDetail(tx, auth, current.id)),
        series: stopped,
        idempotent: false,
      }, "Réponse d’arrêt de récurrence");
    });
  } catch (error) {
    const code = readTaskDbErrorCode(error);
    if (
      ["CONFLICT", "AUTH_FORBIDDEN", "VALIDATION_ERROR", "NOT_FOUND"].includes(
        String(code),
      )
    ) {
      throw error;
    }
    if (code === "23505") {
      throw httpError(409, "CONFLICT", "Cette récurrence existe déjà.");
    }
    throw httpError(
      500,
      "DB_WRITE_FAILED",
      "Impossible de modifier la récurrence de la tâche.",
    );
  }
};

export const listTasks = async (
  db: DbClient,
  auth: AuthContext,
  _requestId: string,
  input: TaskListInput,
): Promise<TaskListResponse> => {
  if (
    input.agency_id && !auth.isSuperAdmin &&
    !auth.agencyIds.includes(input.agency_id)
  ) throw httpError(403, "AUTH_FORBIDDEN", "Agence non autorisée.");
  const searchPattern = input.search
    ? `%${escapeLikePattern(input.search)}%`
    : undefined;
  const conditions = [
    isReadableBy(auth),
    input.agency_id ? eq(tasks.agency_id, input.agency_id) : undefined,
    input.status?.length ? inArray(tasks.status, input.status) : undefined,
    input.task_type_id?.length
      ? inArray(tasks.task_type_id, input.task_type_id)
      : undefined,
    input.priority?.length
      ? inArray(tasks.priority, input.priority)
      : undefined,
    input.responsible_id === null
      ? isNull(tasks.responsible_id)
      : input.responsible_id
      ? eq(tasks.responsible_id, input.responsible_id)
      : undefined,
    input.organization_id
      ? eq(tasks.organization_id, input.organization_id)
      : undefined,
    input.contact_id ? eq(tasks.contact_id, input.contact_id) : undefined,
    input.activity_id
      ? or(
        eq(tasks.source_activity_id, input.activity_id),
        eq(tasks.completion_activity_id, input.activity_id),
      )
      : undefined,
    input.due_from ? gte(tasks.due_date, input.due_from) : undefined,
    input.due_to ? lte(tasks.due_date, input.due_to) : undefined,
    input.contributor_id
      ? sql<
        boolean
      >`exists (select 1 from public.task_participants p where p.task_id = ${tasks.id} and p.profile_id = ${input.contributor_id})`
      : undefined,
    searchPattern
      ? or(
        ilike(tasks.title, searchPattern),
        ilike(task_types.label, searchPattern),
        sql<
          boolean
        >`exists (select 1 from public.entities e where e.id = ${tasks.organization_id} and e.name ilike ${searchPattern} escape '\\')`,
        sql<
          boolean
        >`exists (select 1 from public.entity_contacts c where c.id = ${tasks.contact_id} and concat_ws(' ', c.first_name, c.last_name) ilike ${searchPattern} escape '\\')`,
        sql<
          boolean
        >`exists (select 1 from public.profiles p where p.id = ${tasks.responsible_id} and concat_ws(' ', p.display_name, p.first_name, p.last_name) ilike ${searchPattern} escape '\\')`,
        sql<
          boolean
        >`exists (select 1 from public.task_participants tp join public.profiles p on p.id = tp.profile_id where tp.task_id = ${tasks.id} and tp.participant_role = 'contributor' and concat_ws(' ', p.display_name, p.first_name, p.last_name) ilike ${searchPattern} escape '\\')`,
      )
      : undefined,
  ];
  const where = and(...conditions);
  const overdueExpression = sql<boolean>`(
    ${tasks.status} in ('todo', 'in_progress') and (
      (${tasks.due_time} is null and ${tasks.due_date} < (now() at time zone ${tasks.due_timezone})::date)
      or (${tasks.due_time} is not null and (${tasks.due_date} + ${tasks.due_time}) at time zone ${tasks.due_timezone} < now())
    )
  )`;
  const priorityOrder = sql<number>`case ${tasks.priority} when 'urgent' then 1 when 'high' then 2 else 3 end`;
  const direction = input.direction === "desc" ? desc : asc;
  const orderBy = input.sort === "created"
    ? [direction(tasks.created_at), asc(tasks.id)]
    : input.sort === "priority"
    ? [direction(priorityOrder), asc(tasks.due_date), asc(tasks.due_time), asc(tasks.id)]
    : [desc(overdueExpression), direction(tasks.due_date), direction(tasks.due_time), asc(priorityOrder), asc(tasks.id)];
  const [rows, counted] = await Promise.all([
    db.select({
      task: taskFields,
      task_type: taskTypeFields,
      organization_name: entities.name,
      contact_name: sql<string | null>`nullif(trim(concat_ws(' ', ${entity_contacts.first_name}, ${entity_contacts.last_name})), '')`,
      responsible_name: sql<string | null>`nullif(trim(concat_ws(' ', ${profiles.display_name}, ${profiles.first_name}, ${profiles.last_name})), '')`,
      is_overdue: overdueExpression,
    }).from(tasks)
      .innerJoin(task_types, eq(task_types.id, tasks.task_type_id))
      .leftJoin(entities, eq(entities.id, tasks.organization_id))
      .leftJoin(entity_contacts, eq(entity_contacts.id, tasks.contact_id))
      .leftJoin(profiles, eq(profiles.id, tasks.responsible_id))
      .where(where)
      .orderBy(...orderBy)
      .limit(input.page_size).offset((input.page - 1) * input.page_size),
    db.select({ total: sql<number>`count(*)::int` }).from(tasks).innerJoin(
      task_types,
      eq(task_types.id, tasks.task_type_id),
    ).where(where),
  ]);
  const items = await Promise.all(rows.map(async (row) => ({
    task: row.task,
    task_type: row.task_type,
    organization_name: row.organization_name,
    contact_name: row.contact_name,
    responsible_name: row.responsible_name,
    is_overdue: row.is_overdue,
    contributors:
      (await db.select({ profile_id: task_participants.profile_id }).from(
        task_participants,
      ).where(
        and(
          eq(task_participants.task_id, row.task.id),
          eq(task_participants.participant_role, "contributor"),
        ),
      )).map((participant) => participant.profile_id),
  })));
  return parseOrFail(taskListResponseSchema, {
    items,
    page: input.page,
    page_size: input.page_size,
    total: counted[0]?.total ?? 0,
  }, "Liste de tâches");
};

export const listTaskTypes = async (
  db: DbClient,
  _auth: AuthContext,
  _requestId: string,
  input: TaskTypeListInput,
) => {
  const rows = await db.select(taskTypeFields).from(task_types).where(
    input.include_archived ? undefined : eq(task_types.is_active, true),
  ).orderBy(asc(task_types.sort_order), asc(task_types.label));
  return parseOrFail(
    taskTypesResponseSchema,
    { task_types: rows },
    "Liste des types de tâche",
  );
};

export const administerTaskTypes = async (
  db: DbClient,
  callerId: string,
  _requestId: string,
  input: TaskTypeAdminInput,
) => {
  const timestamp = new Date().toISOString();
  try {
    return await db.transaction(async (tx) => {
      await setAuditActor(tx, callerId);
      const rows = input.action === "create"
        ? await tx.insert(task_types).values({
          code: input.code,
          label: input.label,
          sort_order: input.sort_order,
          created_by: callerId,
          updated_by: callerId,
        }).returning(taskTypeFields)
        : input.action === "rename"
        ? await tx.update(task_types).set({
          label: input.label,
          updated_by: callerId,
          updated_at: timestamp,
        }).where(
          and(
            eq(task_types.id, input.task_type_id),
            eq(task_types.is_active, true),
          ),
        ).returning(taskTypeFields)
        : input.action === "reorder"
        ? await tx.update(task_types).set({
          sort_order: input.sort_order,
          updated_by: callerId,
          updated_at: timestamp,
        }).where(
          and(
            eq(task_types.id, input.task_type_id),
            eq(task_types.is_active, true),
          ),
        ).returning(taskTypeFields)
        : await tx.update(task_types).set({
          is_active: false,
          archived_at: timestamp,
          updated_by: callerId,
          updated_at: timestamp,
        }).where(
          and(
            eq(task_types.id, input.task_type_id),
            eq(task_types.is_active, true),
          ),
        ).returning(taskTypeFields);
      if (!rows[0]) {
        throw httpError(
          404,
          "NOT_FOUND",
          "Type de tâche introuvable ou déjà archivé.",
        );
      }
      return parseOrFail(taskTypeSchema, rows[0], "Type de tâche");
    });
  } catch (error) {
    if (
      typeof error === "object" && error !== null &&
      Reflect.get(error, "code") === "NOT_FOUND"
    ) throw error;
    const code = typeof error === "object" && error !== null
      ? Reflect.get(error, "code")
      : undefined;
    if (code === "23505") {
      throw httpError(
        409,
        "CONFLICT",
        "Ce code ou libellé de type existe déjà.",
      );
    }
    throw httpError(
      500,
      "DB_WRITE_FAILED",
      "Impossible d’administrer le type de tâche.",
    );
  }
};
