import { describe, expect, it } from "vitest";

import {
  taskEventSchema,
  taskParticipantSchema,
  taskSchema,
  taskSeriesSchema,
  taskTypeSchema,
} from "../task/task-foundation.schema";

const id = "0e23d347-af53-448d-b8e3-c4e29f222743";
const otherId = "6bc1c202-e8f2-4e94-892b-c4702df3e2d8";
const now = "2026-08-11T09:00:00.000Z";

const openTierTask = {
  id,
  agency_id: id,
  version: 1,
  title: "Relancer le client",
  description: null,
  task_type_id: id,
  planned_channel: "Téléphone",
  scope: "tier_relation",
  organization_id: otherId,
  contact_id: null,
  source_activity_id: null,
  completion_activity_id: null,
  created_by: id,
  responsible_id: null,
  status: "todo",
  priority: "normal",
  due_date: "2026-08-12",
  due_time: null,
  due_timezone: "Europe/Paris",
  visibility: "tier",
  completed_at: null,
  completed_by: null,
  canceled_at: null,
  canceled_by: null,
  cancel_reason: null,
  series_id: null,
  previous_task_id: null,
  created_at: now,
  updated_at: now,
} as const;

describe("task foundation schemas", () => {
  it("accepts a queue task linked to a Tier", () => {
    expect(taskSchema.safeParse(openTierTask).success).toBe(true);
  });

  it("enforces scope, visibility and closure markers", () => {
    expect(
      taskSchema.safeParse({
        ...openTierTask,
        scope: "internal_cir",
        visibility: "restricted",
      }).success,
    ).toBe(false);

    expect(
      taskSchema.safeParse({
        ...openTierTask,
        status: "completed",
        completed_at: now,
        completed_by: id,
        responsible_id: id,
      }).success,
    ).toBe(true);

    expect(
      taskSchema.safeParse({
        ...openTierTask,
        status: "completed",
        completed_at: now,
        responsible_id: id,
      }).success,
    ).toBe(false);

    expect(
      taskSchema.safeParse({
        ...openTierTask,
        due_timezone: "Europe/Nowhere",
      }).success,
    ).toBe(false);
  });

  it("rejects unknown values and oversized event metadata", () => {
    expect(
      taskParticipantSchema.safeParse({
        task_id: id,
        agency_id: id,
        profile_id: otherId,
        participant_role: "observer",
        added_by: id,
        created_at: now,
      }).success,
    ).toBe(false);

    expect(
      taskEventSchema.safeParse({
        id,
        task_id: id,
        agency_id: id,
        event_order: 1,
        event_type: "created",
        actor_kind: "user",
        actor_id: id,
        occurred_at: now,
        task_version: 1,
        previous_value: null,
        new_value: null,
        metadata: { payload: "x".repeat(17_000) },
        note: null,
      }).success,
    ).toBe(false);
  });

  it("defines governed task types and recurrence snapshots", () => {
    expect(
      taskTypeSchema.safeParse({
        id,
        code: "customer_follow_up",
        label: "Relance client",
        sort_order: 10,
        is_active: true,
        created_by: id,
        updated_by: id,
        created_at: now,
        updated_at: now,
        archived_at: null,
      }).success,
    ).toBe(true);

    expect(
      taskSeriesSchema.safeParse({
        id,
        agency_id: id,
        interval_value: 2,
        interval_unit: "week",
        is_active: true,
        task_type_id: id,
        title: "Point bimensuel",
        description: null,
        planned_channel: null,
        scope: "internal_cir",
        organization_id: null,
        contact_id: null,
        responsible_id: id,
        priority: "normal",
        due_time: "09:30",
        due_timezone: "Europe/Paris",
        visibility: "agency",
        created_by: id,
        stopped_by: null,
        created_at: now,
        stopped_at: null,
      }).success,
    ).toBe(true);

    expect(
      taskSeriesSchema.safeParse({
        id,
        agency_id: id,
        interval_value: 1,
        interval_unit: "day",
        is_active: true,
        task_type_id: id,
        title: "Point quotidien",
        description: null,
        planned_channel: null,
        scope: "internal_cir",
        organization_id: null,
        contact_id: null,
        responsible_id: id,
        priority: "normal",
        due_time: "09:30:00",
        due_timezone: "Europe/Paris",
        visibility: "agency",
        created_by: id,
        stopped_by: null,
        created_at: now,
        stopped_at: null,
      }).success,
    ).toBe(true);
  });
});
