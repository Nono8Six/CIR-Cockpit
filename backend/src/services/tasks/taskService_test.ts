import { test } from "vitest";
import { assertEquals, assertThrows } from "#test/assert";

import {
  assertIdempotentCreateMatches,
  calculateNextTaskDueDate,
  canAddTaskNote,
  canAssignTaskInAgency,
  canChangeTaskAssignment,
  canChangeTaskExecution,
  canCreateTaskInAgency,
  canEditTaskContent,
  getTaskStatusTransition,
  nextTaskEventOrder,
  normalizeDatabaseDates,
  readTaskDbErrorCode,
  requireExpectedVersion,
} from "./taskService.ts";

const id = "0e23d347-af53-448d-b8e3-c4e29f222743";
const auth = {
  userId: id,
  role: "tcs" as const,
  agencyIds: [id],
  activeAgencyId: id,
  isSuperAdmin: false,
};
const task = {
  id,
  agency_id: id,
  version: 1,
  title: "Relancer",
  description: null,
  task_type_id: id,
  planned_channel: null,
  scope: "internal_cir" as const,
  organization_id: null,
  contact_id: null,
  source_activity_id: null,
  completion_activity_id: null,
  created_by: id,
  responsible_id: id,
  status: "todo" as const,
  priority: "normal" as const,
  due_date: "2026-08-12",
  due_time: null,
  due_timezone: "Europe/Paris",
  visibility: "restricted" as const,
  completed_at: null,
  completed_by: null,
  canceled_at: null,
  canceled_by: null,
  cancel_reason: null,
  series_id: null,
  previous_task_id: null,
  created_at: "2026-08-11T00:00:00.000Z",
  updated_at: "2026-08-11T00:00:00.000Z",
};
const input = {
  kind: "quick" as const,
  agency_id: id,
  title: "Relancer",
  task_type_id: id,
  due_date: "2026-08-12",
  idempotency_key: id,
};

test("a TCS creates only inside an assigned agency and cannot assign another user", () => {
  assertEquals(canCreateTaskInAgency(auth, id), true);
  assertEquals(
    canCreateTaskInAgency(auth, "6bc1c202-e8f2-4e94-892b-c4702df3e2d8"),
    false,
  );
  assertEquals(canAssignTaskInAgency(auth, id), false);
  assertEquals(canEditTaskContent(auth, task), true);
  assertEquals(
    canEditTaskContent(auth, {
      ...task,
      created_by: "6bc1c202-e8f2-4e94-892b-c4702df3e2d8",
    }),
    false,
  );
});

test("an identical retry is accepted and an idempotency-key reuse is rejected", () => {
  assertIdempotentCreateMatches(task, input);
  assertThrows(
    () =>
      assertIdempotentCreateMatches(task, { ...input, title: "Autre tâche" }),
    Error,
    "clé idempotente",
  );
});

test("database timestamp values are normalized before strict contract parsing", () => {
  assertEquals(
    normalizeDatabaseDates({
      created_at: new Date("2026-08-11T07:51:02.000Z"),
    }),
    {
      created_at: "2026-08-11T07:51:02.000Z",
    },
  );
  assertEquals(
    normalizeDatabaseDates({
      created_at: "2026-08-11 07:51:02.123456+00",
    }),
    {
      created_at: "2026-08-11T07:51:02.123Z",
    },
  );
});

test("B3-3 lifecycle only permits documented transitions and records reopening", () => {
  assertEquals(getTaskStatusTransition("todo", "completed"), "status_changed");
  assertEquals(getTaskStatusTransition("completed", "todo"), "reopened");
  assertEquals(getTaskStatusTransition("canceled", "todo"), "reopened");
  assertThrows(
    () => getTaskStatusTransition("todo", "todo"),
    Error,
    "transition",
  );
  assertThrows(
    () => getTaskStatusTransition("completed", "in_progress"),
    Error,
    "transition",
  );
});

test("B3-3 field rights distinguish creator, responsible, contributor and follower", () => {
  const responsibleId = "6bc1c202-e8f2-4e94-892b-c4702df3e2d8";
  const contributorId = "35d1bfd0-dd2b-45de-8ac3-333333333333";
  const followerId = "35d1bfd0-dd2b-45de-8ac3-444444444444";
  const assignedTask = { ...task, responsible_id: responsibleId };
  const responsible = { ...auth, userId: responsibleId };
  const contributor = { ...auth, userId: contributorId };
  const follower = { ...auth, userId: followerId };

  assertEquals(canChangeTaskExecution(responsible, assignedTask), true);
  assertEquals(canChangeTaskExecution(contributor, assignedTask), false);
  assertEquals(canChangeTaskExecution(follower, assignedTask), false);
  assertEquals(canChangeTaskAssignment(auth, assignedTask), true);
  assertEquals(canChangeTaskAssignment(responsible, assignedTask), false);
  assertEquals(
    canAddTaskNote(contributor, assignedTask, [
      { profile_id: contributorId },
    ]),
    true,
  );
  assertEquals(
    canAddTaskNote(follower, assignedTask, [
      { profile_id: followerId },
    ]),
    true,
  );
  assertEquals(
    canAddTaskNote(
      { ...auth, userId: "35d1bfd0-dd2b-45de-8ac3-555555555555" },
      assignedTask,
      [],
    ),
    false,
  );

  const agencyAdmin = {
    ...auth,
    userId: "35d1bfd0-dd2b-45de-8ac3-666666666666",
    role: "agency_admin" as const,
  };
  const superAdmin = {
    ...auth,
    userId: "35d1bfd0-dd2b-45de-8ac3-777777777777",
    agencyIds: [],
    isSuperAdmin: true,
  };
  assertEquals(canChangeTaskAssignment(agencyAdmin, assignedTask), true);
  assertEquals(canChangeTaskExecution(agencyAdmin, assignedTask), true);
  assertEquals(canChangeTaskExecution(superAdmin, assignedTask), true);
});

test("B3-3 increments event order and rejects an obsolete task version", () => {
  assertEquals(nextTaskEventOrder(undefined), 1);
  assertEquals(nextTaskEventOrder(7), 8);
  requireExpectedVersion(task, 1);
  assertThrows(() => requireExpectedVersion(task, 2), Error, "Rechargez-la");
});

test("B3-4 calculates recurrence from the local completion date without month overflow", () => {
  assertEquals(
    calculateNextTaskDueDate(
      "2026-01-31T22:30:00.000Z",
      "Europe/Paris",
      1,
      "month",
    ),
    "2026-02-28",
  );
  assertEquals(
    calculateNextTaskDueDate(
      "2026-03-28T23:30:00.000Z",
      "Europe/Paris",
      2,
      "week",
    ),
    "2026-04-12",
  );
  assertEquals(
    calculateNextTaskDueDate(
      "2028-02-28T23:30:00.000Z",
      "Europe/Paris",
      1,
      "day",
    ),
    "2028-03-01",
  );
});

test("B3-4 reads a PostgreSQL code wrapped by the Drizzle transaction error", () => {
  assertEquals(
    readTaskDbErrorCode({ cause: { cause: { code: "23505" } } }),
    "23505",
  );
  assertEquals(readTaskDbErrorCode({ cause: new Error("échec") }), undefined);
});
