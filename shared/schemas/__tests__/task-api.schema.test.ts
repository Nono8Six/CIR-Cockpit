import { describe, expect, it } from "vitest";

import {
  taskAssignmentInputSchema,
  taskCreateInputSchema,
  taskListInputSchema,
  taskNoteInputSchema,
  taskPriorityChangeInputSchema,
  taskRescheduleInputSchema,
  taskStatusChangeInputSchema,
  taskTypeAdminInputSchema,
  taskUpdateContentInputSchema,
} from "../task/task-api.schema";

const id = "0e23d347-af53-448d-b8e3-c4e29f222743";
const otherId = "6bc1c202-e8f2-4e94-892b-c4702df3e2d8";
const base = { agency_id: id, title: "Relancer CIR", task_type_id: id, due_date: "2026-08-12", idempotency_key: id };

describe("task API schemas", () => {
  it("rejects unknown fields and malformed idempotency keys", () => {
    expect(taskCreateInputSchema.safeParse({ ...base, kind: "quick", unexpected: true }).success).toBe(false);
    expect(taskCreateInputSchema.safeParse({ ...base, kind: "quick", idempotency_key: "not-a-uuid" }).success).toBe(false);
  });

  it("rejects invalid advanced scope and incompatible links", () => {
    expect(taskCreateInputSchema.safeParse({
      ...base, kind: "advanced", scope: "tier_relation", organization_id: null, visibility: "tier",
    }).success).toBe(false);
    expect(taskCreateInputSchema.safeParse({
      ...base, kind: "advanced", scope: "internal_cir", organization_id: id, visibility: "agency",
    }).success).toBe(false);
    expect(taskCreateInputSchema.safeParse({
      ...base, kind: "advanced", scope: "internal_cir", organization_id: null, visibility: "agency", responsible_id: id,
    }).success).toBe(true);
  });

  it("bounds server pagination and administrative actions", () => {
    expect(taskListInputSchema.safeParse({ page: 1, page_size: 101 }).success).toBe(false);
    expect(taskTypeAdminInputSchema.safeParse({ action: "create", code: "Bad Code", label: "Type" }).success).toBe(false);
    expect(taskTypeAdminInputSchema.safeParse({ action: "archive", task_type_id: id, extra: true }).success).toBe(false);
    expect(taskUpdateContentInputSchema.safeParse({ task_id: id, expected_version: 0, patch: { title: "Nouveau titre" } }).success).toBe(false);
    expect(taskUpdateContentInputSchema.safeParse({ task_id: id, expected_version: 1, patch: {} }).success).toBe(false);
  });

  it("accepts only explicit lifecycle and collaboration actions", () => {
    expect(taskStatusChangeInputSchema.safeParse({
      task_id: id, expected_version: 2, status: "completed",
    }).success).toBe(true);
    expect(taskStatusChangeInputSchema.safeParse({
      task_id: id, expected_version: 2, status: "canceled", cancel_reason: "Client indisponible",
    }).success).toBe(true);
    expect(taskStatusChangeInputSchema.safeParse({
      task_id: id, expected_version: 2, status: "canceled", cancel_reason: " ",
    }).success).toBe(false);
    expect(taskAssignmentInputSchema.safeParse({
      task_id: id, expected_version: 2, action: "claim",
    }).success).toBe(true);
    expect(taskAssignmentInputSchema.safeParse({
      task_id: id, expected_version: 2, action: "assign", responsible_id: otherId,
    }).success).toBe(true);
    expect(taskAssignmentInputSchema.safeParse({
      task_id: id, expected_version: 2, action: "add_participant", profile_id: otherId, participant_role: "contributor",
    }).success).toBe(true);
    expect(taskAssignmentInputSchema.safeParse({
      task_id: id, expected_version: 2, action: "claim", responsible_id: id,
    }).success).toBe(false);
    expect(taskRescheduleInputSchema.safeParse({
      task_id: id, expected_version: 2, due_date: "2026-08-20", due_time: null,
    }).success).toBe(true);
    expect(taskPriorityChangeInputSchema.safeParse({
      task_id: id, expected_version: 2, priority: "urgent",
    }).success).toBe(true);
    expect(taskNoteInputSchema.safeParse({
      task_id: id, expected_version: 2, note: "Compte rendu envoyé",
    }).success).toBe(true);
  });
});
