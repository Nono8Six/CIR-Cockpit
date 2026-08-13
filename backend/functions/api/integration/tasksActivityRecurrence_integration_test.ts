import { assert, assertEquals } from "std/assert";
import postgres from "postgres";

import {
  CAN_RUN_NETWORK_INTEGRATION,
  getApi,
  getIntegrationIdentities,
  postApi,
  readBoolean,
  readString,
  readValue,
} from "./helpers.ts";

type ProbeScope = {
  organizationId: string;
  contactId: string;
  entityType: string;
  organizationName: string;
};

const asRecord = (value: unknown): Record<string, unknown> | null =>
  typeof value === "object" && value !== null && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;

const readTask = (payload: unknown): Record<string, unknown> => {
  const task = asRecord(readValue(payload, "task"));
  assert(task, "La réponse doit contenir la tâche.");
  return task;
};

const getProbeScope = async (
  database: postgres.Sql,
  agencyId: string,
): Promise<ProbeScope> => {
  const rows = await database.unsafe<ProbeScope[]>(
    `select e.id as "organizationId", c.id as "contactId",
            e.entity_type as "entityType", e.name as "organizationName"
     from public.entities e
     join public.entity_contacts c on c.entity_id = e.id and c.archived_at is null
     where e.agency_id = $1::uuid and e.archived_at is null
     limit 1`,
    [agencyId],
  );
  assert(
    rows[0],
    "Aucun Tier avec contact et Activity ne permet la probe B3-4.",
  );
  return rows[0];
};

Deno.test({
  name:
    "B3-4 atomically correlates Activity v2 and creates one recurrent occurrence",
  ignore: !CAN_RUN_NETWORK_INTEGRATION,
  fn: async () => {
    const databaseUrl = Deno.env.get("DATABASE_URL")?.trim();
    assert(databaseUrl, "Base de données d intégration absente.");
    const database = postgres(databaseUrl, { max: 1, prepare: false });
    const identities = await getIntegrationIdentities();
    const agencyId = identities.user.agencyId;
    const scope = await getProbeScope(database, agencyId);
    const suffix = crypto.randomUUID().replaceAll("-", "");
    let taskTypeId = "";
    const taskIds: string[] = [];
    const activityIds: string[] = [];
    const interactionIds: string[] = [];

    const createTask = async (
      title: string,
      scopeName: "tier_relation" | "internal_cir",
    ) => {
      const taskId = crypto.randomUUID();
      taskIds.push(taskId);
      const response = await postApi(
        "tasks.create",
        identities.user.accessToken,
        {
          kind: "advanced",
          agency_id: agencyId,
          title,
          task_type_id: taskTypeId,
          due_date: "2026-08-20",
          idempotency_key: taskId,
          scope: scopeName,
          organization_id: scopeName === "tier_relation"
            ? scope.organizationId
            : null,
          contact_id: scopeName === "tier_relation" ? scope.contactId : null,
          responsible_id: identities.user.userId,
          visibility: scopeName === "tier_relation" ? "tier" : "restricted",
          participants: [],
        },
      );
      assertEquals(response.status, 200, JSON.stringify(response.payload));
      return taskId;
    };

    try {
      const type = await postApi(
        "task-types.admin",
        identities.admin.accessToken,
        {
          action: "create",
          code: `b3_4_probe_${suffix}`,
          label: `B3-4 probe ${suffix.slice(0, 8)}`,
          sort_order: 9999,
        },
      );
      assertEquals(type.status, 200, JSON.stringify(type.payload));
      taskTypeId = readString(type.payload, "id");
      assert(taskTypeId, "Type de tâche B3-4 absent.");

      const failingTaskId = await createTask(
        `B3-4 atomicité ${suffix}`,
        "tier_relation",
      );
      const collisionInteractionId = crypto.randomUUID();
      interactionIds.push(collisionInteractionId);
      await database.begin(async (transaction) => {
        await transaction.unsafe("select private.set_audit_actor($1::uuid)", [
          identities.user.userId,
        ]);
        await transaction.unsafe(
          `insert into public.interactions (
             id, agency_id, channel, entity_type, contact_service, company_name,
             contact_name, contact_phone, contact_email, subject, mega_families,
             status, interaction_type, notes, entity_id, contact_id,
             created_by, updated_by, timeline, created_at, last_action_at
           ) values (
             $1::text, $2::uuid, 'Téléphone', $3::text, '', $4::text,
             '', '0102030405', null, $5::text, '{}'::text[], '', 'Appel de probe',
             null, $6::uuid, $7::uuid, $8::uuid, $8::uuid, '[]'::jsonb,
             now(), now()
           )`,
          [
            collisionInteractionId,
            agencyId,
            scope.entityType,
            scope.organizationName,
            `Collision B3-4 ${suffix}`,
            scope.organizationId,
            scope.contactId,
            identities.user.userId,
          ],
        );
      });
      const collisionActivities = await database.unsafe<Array<{ id: string }>>(
        "select id from public.activities where legacy_interaction_id = $1::text",
        [collisionInteractionId],
      );
      assert(collisionActivities[0]?.id, "Activity de collision absente.");
      activityIds.push(collisionActivities[0].id);
      const failedExecution = await postApi(
        "tasks.execute-with-activity",
        identities.user.accessToken,
        {
          task_id: failingTaskId,
          expected_version: 1,
          idempotency_key: collisionInteractionId,
          activity: {
            occurred_at: new Date().toISOString(),
            channel: "Téléphone",
            activity_type: "Appel de probe",
            subject: `Échec atomique ${suffix}`,
            report: null,
          },
        },
      );
      assertEquals(
        failedExecution.status,
        409,
        JSON.stringify(failedExecution.payload),
      );
      const failedTask = await getApi(
        "tasks.get",
        identities.user.accessToken,
        {
          task_id: failingTaskId,
        },
      );
      assertEquals(failedTask.status, 200);
      assertEquals(readString(readTask(failedTask.payload), "status"), "todo");
      assertEquals(readValue(readTask(failedTask.payload), "version"), 1);
      assertEquals(
        (readValue(failedTask.payload, "events") as unknown[]).length,
        1,
      );

      const canceledTaskId = await createTask(
        `B3-4 annulation ${suffix}`,
        "tier_relation",
      );
      const canceled = await postApi(
        "tasks.change-status",
        identities.user.accessToken,
        {
          task_id: canceledTaskId,
          expected_version: 1,
          status: "canceled",
          cancel_reason: "Probe B3-4",
        },
      );
      assertEquals(canceled.status, 200);
      assertEquals(
        readValue(readTask(canceled.payload), "completion_activity_id"),
        null,
      );

      const internalTaskId = await createTask(
        `B3-4 interne ${suffix}`,
        "internal_cir",
      );
      const internalSeriesId = crypto.randomUUID();
      const internalSeries = await postApi(
        "tasks.recurrence",
        identities.user.accessToken,
        {
          action: "configure",
          task_id: internalTaskId,
          expected_version: 1,
          idempotency_key: internalSeriesId,
          interval_value: 2,
          interval_unit: "week",
        },
      );
      assertEquals(internalSeries.status, 200);
      const internalCompleted = await postApi(
        "tasks.change-status",
        identities.user.accessToken,
        { task_id: internalTaskId, expected_version: 2, status: "completed" },
      );
      assertEquals(internalCompleted.status, 200);
      assertEquals(
        readValue(
          readTask(internalCompleted.payload),
          "completion_activity_id",
        ),
        null,
      );
      const internalRetry = await postApi(
        "tasks.change-status",
        identities.user.accessToken,
        { task_id: internalTaskId, expected_version: 2, status: "completed" },
      );
      assertEquals(internalRetry.status, 200);

      const clientTaskId = await createTask(
        `B3-4 client ${suffix}`,
        "tier_relation",
      );
      const seriesId = crypto.randomUUID();
      const configured = await postApi(
        "tasks.recurrence",
        identities.user.accessToken,
        {
          action: "configure",
          task_id: clientTaskId,
          expected_version: 1,
          idempotency_key: seriesId,
          interval_value: 1,
          interval_unit: "day",
        },
      );
      assertEquals(configured.status, 200, JSON.stringify(configured.payload));
      assertEquals(readBoolean(configured.payload, "idempotent"), false);
      const configuredRetry = await postApi(
        "tasks.recurrence",
        identities.user.accessToken,
        {
          action: "configure",
          task_id: clientTaskId,
          expected_version: 1,
          idempotency_key: seriesId,
          interval_value: 1,
          interval_unit: "day",
        },
      );
      assertEquals(configuredRetry.status, 200);
      assertEquals(readBoolean(configuredRetry.payload, "idempotent"), true);
      const beforeCompletion = await database.unsafe<Array<{ count: number }>>(
        "select count(*)::int as count from public.tasks where previous_task_id = $1::uuid",
        [clientTaskId],
      );
      assertEquals(beforeCompletion[0]?.count, 0);

      const activityId = crypto.randomUUID();
      interactionIds.push(activityId);
      const executionInput = {
        task_id: clientTaskId,
        expected_version: 2,
        idempotency_key: activityId,
        activity: {
          occurred_at: new Date().toISOString(),
          channel: "Téléphone",
          activity_type: "Appel de probe",
          subject: `Réalisation B3-4 ${suffix}`,
          report: "Compte rendu transactionnel",
        },
      };
      const executed = await postApi(
        "tasks.execute-with-activity",
        identities.user.accessToken,
        executionInput,
      );
      assertEquals(executed.status, 200, JSON.stringify(executed.payload));
      assertEquals(readBoolean(executed.payload, "idempotent"), false);
      const completionActivityId = readString(executed.payload, "activity_id");
      assert(completionActivityId, "Identifiant Activity v2 absent.");
      activityIds.push(completionActivityId);
      const nextOccurrenceId = readString(
        executed.payload,
        "next_occurrence_id",
      );
      assert(nextOccurrenceId, "Occurrence suivante absente.");
      taskIds.push(nextOccurrenceId);

      const executionRetry = await postApi(
        "tasks.execute-with-activity",
        identities.user.accessToken,
        executionInput,
      );
      assertEquals(
        executionRetry.status,
        200,
        JSON.stringify(executionRetry.payload),
      );
      assertEquals(readBoolean(executionRetry.payload, "idempotent"), true);
      assertEquals(
        readString(executionRetry.payload, "next_occurrence_id"),
        nextOccurrenceId,
      );

      const correlation = await database.unsafe<
        Array<{
          activityCount: number;
          interactionCount: number;
          participantCount: number;
          sourceCount: number;
          nextCount: number;
          dueFromCompletion: boolean;
        }>
      >(
        `select
           (select count(*)::int from public.activities where id = $1::uuid and legacy_interaction_id = $3::text) as "activityCount",
           (select count(*)::int from public.interactions where id = $3::text) as "interactionCount",
           (select count(*)::int from public.activity_participants where activity_id = $1::uuid) as "participantCount",
           (select count(*)::int from public.activity_sources where activity_id = $1::uuid) as "sourceCount",
           (select count(*)::int from public.tasks where previous_task_id = $2::uuid) as "nextCount",
           (select n.due_date = ((t.completed_at at time zone t.due_timezone)::date + 1)
              from public.tasks t join public.tasks n on n.previous_task_id = t.id
             where t.id = $2::uuid) as "dueFromCompletion"`,
        [completionActivityId, clientTaskId, activityId],
      );
      assertEquals(correlation[0], {
        activityCount: 1,
        interactionCount: 1,
        participantCount: 2,
        sourceCount: 2,
        nextCount: 1,
        dueFromCompletion: true,
      });

      const stopped = await postApi(
        "tasks.recurrence",
        identities.user.accessToken,
        { action: "stop", task_id: nextOccurrenceId, expected_version: 1 },
      );
      assertEquals(stopped.status, 200, JSON.stringify(stopped.payload));
      assertEquals(readBoolean(stopped.payload, "idempotent"), false);
      const stoppedRetry = await postApi(
        "tasks.recurrence",
        identities.user.accessToken,
        { action: "stop", task_id: nextOccurrenceId, expected_version: 1 },
      );
      assertEquals(stoppedRetry.status, 200);
      assertEquals(readBoolean(stoppedRetry.payload, "idempotent"), true);

      const absence = await database.unsafe<
        Array<{
          canceledActivities: number;
          internalActivities: number;
          internalNext: number;
        }>
      >(
        `select
           (select count(*)::int from public.activity_sources where source_reference = $1::text) as "canceledActivities",
           (select count(*)::int from public.activity_sources where source_reference = $2::text) as "internalActivities",
           (select count(*)::int from public.tasks where previous_task_id = $2::uuid) as "internalNext"`,
        [canceledTaskId, internalTaskId],
      );
      assertEquals(absence[0], {
        canceledActivities: 0,
        internalActivities: 0,
        internalNext: 1,
      });
    } finally {
      if (taskTypeId) {
        await database.begin(async (transaction) => {
          await transaction.unsafe("select private.set_audit_actor($1::uuid)", [
            identities.admin.userId,
          ]);
          await transaction.unsafe(
            "delete from public.task_events where task_id in (select id from public.tasks where task_type_id = $1::uuid)",
            [taskTypeId],
          );
          await transaction.unsafe(
            "delete from public.task_participants where task_id in (select id from public.tasks where task_type_id = $1::uuid)",
            [taskTypeId],
          );
          await transaction.unsafe(
            "delete from public.tasks where task_type_id = $1::uuid and previous_task_id is not null",
            [taskTypeId],
          );
          await transaction.unsafe(
            "delete from public.tasks where task_type_id = $1::uuid",
            [taskTypeId],
          );
          for (const activityId of activityIds) {
            await transaction.unsafe(
              "delete from public.activity_history_events where activity_id = $1::uuid",
              [activityId],
            );
            await transaction.unsafe(
              "delete from public.activity_participants where activity_id = $1::uuid",
              [activityId],
            );
            await transaction.unsafe(
              "delete from public.activity_sources where activity_id = $1::uuid",
              [activityId],
            );
            await transaction.unsafe(
              "delete from public.activities where id = $1::uuid",
              [activityId],
            );
          }
          for (const interactionId of interactionIds) {
            await transaction.unsafe(
              "delete from public.interactions where id = $1::text",
              [interactionId],
            );
          }
          await transaction.unsafe(
            "delete from public.task_series where task_type_id = $1::uuid",
            [taskTypeId],
          );
          await transaction.unsafe(
            "delete from public.task_types where id = $1::uuid",
            [taskTypeId],
          );
          if (taskIds.length > 0) {
            await transaction.unsafe(
              "delete from public.audit_logs where entity_id = any($1::text[])",
              [taskIds.concat(activityIds, interactionIds, taskTypeId)],
            );
          }
        });
      }
      await database.end({ timeout: 0 });
    }
  },
});
