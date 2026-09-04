import { assert, assertEquals } from "#test/assert";
import postgres from "postgres";

import { CAN_RUN_NETWORK_INTEGRATION, apiBaseUrl, corsOrigin, getApi, getIntegrationIdentities, postApi, readBoolean, readString, readValue, integrationTest } from "./helpers.ts";

const asRecord = (value: unknown): Record<string, unknown> | null =>
  typeof value === "object" && value !== null && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;

const readTask = (payload: unknown): Record<string, unknown> => {
  const detail = asRecord(payload);
  const task = detail ? asRecord(detail.task) : null;
  assert(task, "La réponse doit contenir la tâche.");
  return task;
};

const signInProbeUser = async (
  email: string,
  password: string,
): Promise<string> => {
  const url = process.env["SUPABASE_URL"]?.trim();
  const anonKey = process.env["SUPABASE_ANON_KEY"]?.trim();
  assert(url && anonKey, "Configuration Supabase d intégration absente.");
  const response = await fetch(`${url}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { "Content-Type": "application/json", apikey: anonKey },
    body: JSON.stringify({ email, password }),
  });
  const payload = await response.json() as Record<string, unknown>;
  assert(
    response.ok,
    `Connexion du compte de probe refusée (${response.status}).`,
  );
  const token = typeof payload.access_token === "string"
    ? payload.access_token
    : "";
  assert(token, "Jeton de session du compte de probe absent.");
  return token;
};

const promoteProbeToAgencyAdmin = async (userId: string, actorId: string) => {
  const databaseUrl = process.env["DATABASE_URL"]?.trim();
  assert(databaseUrl, "Base de données d intégration absente.");
  const database = postgres(databaseUrl, { max: 1, prepare: false });
  try {
    await database.begin(async (transaction) => {
      await transaction.unsafe(
        "select private.set_audit_actor($1::uuid)",
        [actorId],
      );
      await transaction.unsafe(
        "update public.profiles set role = 'agency_admin' where id = $1::uuid",
        [userId],
      );
    });
  } finally {
    await database.end({ timeout: 0 });
  }
};

type ProbeTierScope = {
  agencyId: string;
  organizationId: string;
  contactId: string;
};

const getProbeTierScope = async (): Promise<ProbeTierScope> => {
  const databaseUrl = process.env["DATABASE_URL"]?.trim();
  assert(databaseUrl, "Base de données d intégration absente.");
  const database = postgres(databaseUrl, { max: 1, prepare: false });
  try {
    const rows = await database.unsafe<ProbeTierScope[]>(
      `select e.agency_id as "agencyId", e.id as "organizationId", c.id as "contactId"
       from public.entities e
       join public.entity_contacts c on c.entity_id = e.id and c.archived_at is null
       where e.archived_at is null
       limit 1`,
    );
    const scope = rows[0];
    assert(scope, "Aucun Tier avec contact actif ne permet la probe.");
    return scope;
  } finally {
    await database.end({ timeout: 0 });
  }
};

const archiveProbeProfile = async (userId: string, actorId: string) => {
  const databaseUrl = process.env["DATABASE_URL"]?.trim();
  assert(databaseUrl, "Base de données d intégration absente.");
  const database = postgres(databaseUrl, { max: 1, prepare: false });
  try {
    await database.begin(async (transaction) => {
      await transaction.unsafe("select private.set_audit_actor($1::uuid)", [
        actorId,
      ]);
      await transaction.unsafe(
        "update public.profiles set archived_at = now() where id = $1::uuid",
        [userId],
      );
    });
  } finally {
    await database.end({ timeout: 0 });
  }
};

const cleanupTaskProbe = async (taskTypeId: string, actorId: string) => {
  const databaseUrl = process.env["DATABASE_URL"]?.trim();
  assert(databaseUrl, "Base de données d intégration absente.");
  const database = postgres(databaseUrl, { max: 1, prepare: false });
  try {
    await database.begin(async (transaction) => {
      await transaction.unsafe("select private.set_audit_actor($1::uuid)", [
        actorId,
      ]);
      const taskRows = await transaction.unsafe<Array<{ id: string }>>(
        "select id from public.tasks where task_type_id = $1::uuid",
        [taskTypeId],
      );
      const taskIds = taskRows.map(({ id }) => id);
      await transaction.unsafe(
        "delete from public.task_events where task_id = any($1::uuid[])",
        [taskIds],
      );
      await transaction.unsafe(
        "delete from public.task_participants where task_id = any($1::uuid[])",
        [taskIds],
      );
      await transaction.unsafe(
        "delete from public.task_series where task_type_id = $1::uuid",
        [taskTypeId],
      );
      await transaction.unsafe(
        "delete from public.tasks where task_type_id = $1::uuid",
        [taskTypeId],
      );
      await transaction.unsafe(
        "delete from public.task_types where id = $1::uuid",
        [taskTypeId],
      );
      await transaction.unsafe(
        "delete from public.audit_logs where entity_id = any($1::text[])",
        [taskIds.concat(taskTypeId)],
      );
    });
  } finally {
    await database.end({ timeout: 0 });
  }
};

const assertTaskRoutesCors = async () => {
  for (
    const route of [
      "task-types.list",
      "task-types.admin",
      "tasks.create",
      "tasks.get",
      "tasks.update-content",
      "tasks.update-assignment",
      "tasks.reschedule",
      "tasks.change-priority",
      "tasks.change-status",
      "tasks.add-note",
      "tasks.execute-with-activity",
      "tasks.recurrence",
      "tasks.list",
    ]
  ) {
    const response = await fetch(`${apiBaseUrl}/trpc/${route}`, {
      method: "OPTIONS",
      headers: {
        Origin: corsOrigin,
        "Access-Control-Request-Method": "POST",
      },
    });
    assertEquals(response.status, 200, `Preflight CORS refusé pour ${route}.`);
  }
};

integrationTest({
  name:
    "B3-2 tasks enforce authenticated contracts, rights, version and idempotence",
  ignore: !CAN_RUN_NETWORK_INTEGRATION,
  fn: async () => {
    await assertTaskRoutesCors();
    const identities = await getIntegrationIdentities();
    const probeTierScope = await getProbeTierScope();
    const agencyId = probeTierScope.agencyId;
    const runId = crypto.randomUUID();
    const suffix = runId.replaceAll("-", "");
    const taskTypeCode = `b3_2_probe_runtime_${suffix}`;
    const tcsEmail = `b3-2-probe-tcs-${suffix}@test.invalid`;
    const agencyAdminEmail = `b3-2-probe-admin-${suffix}@test.invalid`;
    const observerEmail = `b3-2-probe-observer-${suffix}@test.invalid`;
    const password = `B3!${suffix}aA`;
    let taskTypeId = "";
    let tcsId = "";
    let agencyAdminId = "";
    let observerId = "";

    try {
      const createdType = await postApi(
        "task-types.admin",
        identities.admin.accessToken,
        {
          action: "create",
          code: taskTypeCode,
          label: `B3-2 probe ${suffix.slice(0, 8)}`,
          sort_order: 9999,
        },
      );
      assertEquals(
        createdType.status,
        200,
        `Création du type de probe: ${JSON.stringify(createdType.payload)}`,
      );
      taskTypeId = readString(createdType.payload, "id");
      assert(taskTypeId, "Type de tâche de probe absent.");

      const createTcs = await postApi(
        "admin.users",
        identities.admin.accessToken,
        {
          action: "create",
          email: tcsEmail,
          first_name: "B3",
          last_name: "Probe TCS",
          role: "tcs",
          agency_ids: [agencyId],
          password,
        },
      );
      assertEquals(createTcs.status, 200);
      tcsId = readString(createTcs.payload, "user_id");
      assert(tcsId, "Identifiant du TCS de probe absent.");

      const createAgencyAdmin = await postApi(
        "admin.users",
        identities.admin.accessToken,
        {
          action: "create",
          email: agencyAdminEmail,
          first_name: "B3",
          last_name: "Probe Admin",
          role: "tcs",
          agency_ids: [agencyId],
          password,
        },
      );
      assertEquals(
        createAgencyAdmin.status,
        200,
        `Création de l administrateur de probe: ${
          JSON.stringify(createAgencyAdmin.payload)
        }`,
      );
      agencyAdminId = readString(createAgencyAdmin.payload, "user_id");
      assert(agencyAdminId, "Identifiant de l administrateur de probe absent.");
      await promoteProbeToAgencyAdmin(agencyAdminId, identities.admin.userId);

      const createObserver = await postApi(
        "admin.users",
        identities.admin.accessToken,
        {
          action: "create",
          email: observerEmail,
          first_name: "B3",
          last_name: "Probe Observer",
          role: "tcs",
          agency_ids: [agencyId],
          password,
        },
      );
      assertEquals(createObserver.status, 200);
      observerId = readString(createObserver.payload, "user_id");
      assert(observerId, "Identifiant de l observateur de probe absent.");

      const tcsToken = await signInProbeUser(tcsEmail, password);
      const agencyAdminToken = await signInProbeUser(
        agencyAdminEmail,
        password,
      );
      const observerToken = await signInProbeUser(observerEmail, password);

      const typeList = await getApi("task-types.list", tcsToken, {});
      assertEquals(typeList.status, 200);
      const typeRows = readValue(typeList.payload, "task_types");
      assert(
        Array.isArray(typeRows) &&
          typeRows.some((row) => readString(row, "id") === taskTypeId),
      );

      const taskId = crypto.randomUUID();
      const taskTitle = `B3-2 probe runtime ${suffix}`;
      const quickInput = {
        kind: "quick",
        agency_id: agencyId,
        title: taskTitle,
        task_type_id: taskTypeId,
        due_date: "2026-08-12",
        idempotency_key: taskId,
      };
      const quick = await postApi("tasks.create", tcsToken, quickInput);
      assertEquals(quick.status, 200);
      assertEquals(readBoolean(quick.payload, "idempotent"), false);
      assertEquals(readString(readTask(quick.payload), "id"), taskId);
      assertEquals(
        readString(readTask(quick.payload), "responsible_id"),
        tcsId,
      );

      const retry = await postApi("tasks.create", tcsToken, quickInput);
      assertEquals(retry.status, 200);
      assertEquals(readBoolean(retry.payload, "idempotent"), true);
      assertEquals(readString(readTask(retry.payload), "id"), taskId);

      const detail = await getApi("tasks.get", tcsToken, { task_id: taskId });
      assertEquals(detail.status, 200);
      assertEquals(readString(readTask(detail.payload), "title"), taskTitle);

      const restrictedForObserver = await getApi("tasks.get", observerToken, {
        task_id: taskId,
      });
      assertEquals(restrictedForObserver.status, 404);

      const search = await getApi("tasks.list", tcsToken, {
        agency_id: agencyId,
        search: taskTitle,
        page: 1,
        page_size: 10,
      });
      assertEquals(search.status, 200);
      const items = readValue(search.payload, "items");
      assert(
        Array.isArray(items) &&
          items.some((row) => readString(asRecord(row)?.task, "id") === taskId),
      );

      const update = await postApi("tasks.update-content", tcsToken, {
        task_id: taskId,
        expected_version: 1,
        patch: { title: `${taskTitle} mis à jour` },
      });
      assertEquals(update.status, 200);
      assertEquals(readValue(readTask(update.payload), "version"), 2);

      const staleUpdate = await postApi("tasks.update-content", tcsToken, {
        task_id: taskId,
        expected_version: 1,
        patch: { title: `${taskTitle} écrasé` },
      });
      assertEquals(staleUpdate.status, 409);
      assertEquals(readString(staleUpdate.payload, "code"), "CONFLICT");

      const invalidPayload = await postApi("tasks.create", tcsToken, {});
      assertEquals(invalidPayload.status, 400);
      assertEquals(
        readString(invalidPayload.payload, "code"),
        "INVALID_PAYLOAD",
      );

      const foreignAgency = await postApi("tasks.create", tcsToken, {
        ...quickInput,
        idempotency_key: crypto.randomUUID(),
        agency_id: crypto.randomUUID(),
      });
      assertEquals(foreignAgency.status, 403);
      assertEquals(readString(foreignAgency.payload, "code"), "AUTH_FORBIDDEN");

      const forbiddenAssignment = await postApi("tasks.create", tcsToken, {
        kind: "advanced",
        agency_id: agencyId,
        title: `${taskTitle} assignation interdite`,
        task_type_id: taskTypeId,
        due_date: "2026-08-12",
        idempotency_key: crypto.randomUUID(),
        scope: "internal_cir",
        organization_id: null,
        responsible_id: agencyAdminId,
        visibility: "agency",
        participants: [],
      });
      assertEquals(
        forbiddenAssignment.status,
        403,
        `Assignation TCS interdite: ${
          JSON.stringify(forbiddenAssignment.payload)
        }`,
      );
      assertEquals(
        readString(forbiddenAssignment.payload, "code"),
        "AUTH_FORBIDDEN",
      );

      const delegatedTaskId = crypto.randomUUID();
      const delegated = await postApi("tasks.create", agencyAdminToken, {
        kind: "advanced",
        agency_id: agencyId,
        title: `${taskTitle} assignation autorisée`,
        task_type_id: taskTypeId,
        due_date: "2026-08-12",
        idempotency_key: delegatedTaskId,
        scope: "internal_cir",
        organization_id: null,
        responsible_id: tcsId,
        visibility: "agency",
        participants: [
          { profile_id: tcsId, participant_role: "contributor" },
          { profile_id: tcsId, participant_role: "follower" },
        ],
      });
      assertEquals(delegated.status, 200);
      assertEquals(
        readString(readTask(delegated.payload), "responsible_id"),
        tcsId,
      );
      const delegatedParticipants = readValue(
        delegated.payload,
        "participants",
      );
      assert(
        Array.isArray(delegatedParticipants) &&
          delegatedParticipants.length === 2,
      );

      const queue = await postApi("tasks.create", agencyAdminToken, {
        kind: "advanced",
        agency_id: agencyId,
        title: `${taskTitle} file d agence`,
        task_type_id: taskTypeId,
        due_date: "2026-08-12",
        idempotency_key: crypto.randomUUID(),
        scope: "internal_cir",
        organization_id: null,
        responsible_id: null,
        visibility: "agency",
        participants: [],
      });
      assertEquals(queue.status, 200);
      assertEquals(readValue(readTask(queue.payload), "responsible_id"), null);

      const queueStartWithoutResponsible = await postApi(
        "tasks.change-status",
        tcsToken,
        {
          task_id: readString(readTask(queue.payload), "id"),
          expected_version: 1,
          status: "in_progress",
        },
      );
      assertEquals(queueStartWithoutResponsible.status, 403);
      assertEquals(
        readString(queueStartWithoutResponsible.payload, "code"),
        "AUTH_FORBIDDEN",
      );

      const tierTaskId = crypto.randomUUID();
      const tierTask = await postApi("tasks.create", tcsToken, {
        kind: "advanced",
        agency_id: agencyId,
        title: `${taskTitle} relation Tier`,
        task_type_id: taskTypeId,
        due_date: "2026-08-12",
        idempotency_key: tierTaskId,
        scope: "tier_relation",
        organization_id: probeTierScope.organizationId,
        contact_id: probeTierScope.contactId,
        source_activity_id: null,
        responsible_id: tcsId,
        visibility: "tier",
        participants: [],
      });
      assertEquals(tierTask.status, 200);
      const tierVisibleToObserver = await getApi("tasks.get", observerToken, {
        task_id: tierTaskId,
      });
      assertEquals(tierVisibleToObserver.status, 200);

      const mismatchedContact = await postApi("tasks.create", tcsToken, {
        kind: "advanced",
        agency_id: agencyId,
        title: `${taskTitle} contact incohérent`,
        task_type_id: taskTypeId,
        due_date: "2026-08-12",
        idempotency_key: crypto.randomUUID(),
        scope: "tier_relation",
        organization_id: probeTierScope.organizationId,
        contact_id: crypto.randomUUID(),
        source_activity_id: null,
        responsible_id: tcsId,
        visibility: "tier",
        participants: [],
      });
      assertEquals(mismatchedContact.status, 400);
      assertEquals(
        readString(mismatchedContact.payload, "code"),
        "VALIDATION_ERROR",
      );

      const claimQueue = await postApi("tasks.update-assignment", tcsToken, {
        task_id: readString(readTask(queue.payload), "id"),
        expected_version: 1,
        action: "claim",
      });
      assertEquals(claimQueue.status, 200);
      assertEquals(
        readString(readTask(claimQueue.payload), "responsible_id"),
        tcsId,
      );
      const queueStarted = await postApi("tasks.change-status", tcsToken, {
        task_id: readString(readTask(queue.payload), "id"),
        expected_version: 2,
        status: "in_progress",
      });
      assertEquals(queueStarted.status, 200);

      const delegatedStarted = await postApi("tasks.change-status", tcsToken, {
        task_id: delegatedTaskId,
        expected_version: 1,
        status: "in_progress",
      });
      assertEquals(delegatedStarted.status, 200);
      const reprioritized = await postApi("tasks.change-priority", tcsToken, {
        task_id: delegatedTaskId,
        expected_version: 2,
        priority: "urgent",
      });
      assertEquals(reprioritized.status, 200);
      const rescheduled = await postApi("tasks.reschedule", agencyAdminToken, {
        task_id: delegatedTaskId,
        expected_version: 3,
        due_date: "2026-08-20",
        due_time: "14:30",
        reason: "Accord client",
      });
      assertEquals(rescheduled.status, 200);
      const note = await postApi("tasks.add-note", observerToken, {
        task_id: delegatedTaskId,
        expected_version: 4,
        note: "Note de suiveur",
      });
      assertEquals(note.status, 403);
      const addContributor = await postApi(
        "tasks.update-assignment",
        agencyAdminToken,
        {
          task_id: delegatedTaskId,
          expected_version: 4,
          action: "add_participant",
          profile_id: observerId,
          participant_role: "contributor",
        },
      );
      assertEquals(addContributor.status, 200);
      const contributorNote = await postApi("tasks.add-note", observerToken, {
        task_id: delegatedTaskId,
        expected_version: 5,
        note: "Note contributeur",
      });
      assertEquals(contributorNote.status, 200);
      const forbiddenContributorCompletion = await postApi(
        "tasks.change-status",
        observerToken,
        {
          task_id: delegatedTaskId,
          expected_version: 6,
          status: "completed",
        },
      );
      assertEquals(forbiddenContributorCompletion.status, 403);
      const completed = await postApi("tasks.change-status", tcsToken, {
        task_id: delegatedTaskId,
        expected_version: 6,
        status: "completed",
      });
      assertEquals(completed.status, 200);
      const staleReschedule = await postApi("tasks.reschedule", tcsToken, {
        task_id: delegatedTaskId,
        expected_version: 6,
        due_date: "2026-08-21",
      });
      assertEquals(staleReschedule.status, 409);
      assertEquals(readString(staleReschedule.payload, "code"), "CONFLICT");
      const reopened = await postApi("tasks.change-status", agencyAdminToken, {
        task_id: delegatedTaskId,
        expected_version: 7,
        status: "todo",
      });
      assertEquals(reopened.status, 200);
      const history = await getApi("tasks.get", tcsToken, {
        task_id: delegatedTaskId,
      });
      assertEquals(history.status, 200);
      const events = readValue(history.payload, "events");
      assert(
        Array.isArray(events) && events.length >= 8,
        "Historique B3-3 incomplet.",
      );
      assertEquals(
        events.map((event) => readValue(event, "event_order")),
        Array.from({ length: events.length }, (_value, index) => index + 1),
      );
      assert(
        events.some((event) => readString(event, "event_type") === "reopened"),
        "La réouverture doit être historisée.",
      );

      await archiveProbeProfile(observerId, identities.admin.userId);
      const archivedAssignment = await postApi(
        "tasks.create",
        agencyAdminToken,
        {
          kind: "advanced",
          agency_id: agencyId,
          title: `${taskTitle} profil archivé`,
          task_type_id: taskTypeId,
          due_date: "2026-08-12",
          idempotency_key: crypto.randomUUID(),
          scope: "internal_cir",
          organization_id: null,
          responsible_id: observerId,
          visibility: "agency",
          participants: [],
        },
      );
      assertEquals(archivedAssignment.status, 400);
      assertEquals(
        readString(archivedAssignment.payload, "code"),
        "VALIDATION_ERROR",
      );

      const forbiddenTypeAdmin = await postApi(
        "task-types.admin",
        agencyAdminToken,
        {
          action: "archive",
          task_type_id: taskTypeId,
        },
      );
      assertEquals(forbiddenTypeAdmin.status, 403);
      assertEquals(
        readString(forbiddenTypeAdmin.payload, "code"),
        "AUTH_FORBIDDEN",
      );

      const canceledTaskId = crypto.randomUUID();
      const canceledTask = await postApi("tasks.create", tcsToken, {
        kind: "quick",
        agency_id: agencyId,
        title: `${taskTitle} annulation`,
        task_type_id: taskTypeId,
        due_date: "2026-08-12",
        idempotency_key: canceledTaskId,
      });
      assertEquals(canceledTask.status, 200);
      const canceled = await postApi("tasks.change-status", tcsToken, {
        task_id: canceledTaskId,
        expected_version: 1,
        status: "canceled",
        cancel_reason: "Recette B3-7",
      });
      assertEquals(canceled.status, 200);
      assertEquals(
        readValue(readTask(canceled.payload), "completion_activity_id"),
        null,
      );
      const canceledList = await getApi("tasks.list", tcsToken, {
        agency_id: agencyId,
        status: ["canceled"],
        search: `${taskTitle} annulation`,
        page: 1,
        page_size: 10,
      });
      assertEquals(canceledList.status, 200);
      assertEquals(readValue(canceledList.payload, "total"), 1);

      for (
        const input of [
          {
            action: "rename",
            task_type_id: taskTypeId,
            label: `B3-7 type ${suffix.slice(0, 8)}`,
          },
          { action: "reorder", task_type_id: taskTypeId, sort_order: 9998 },
          { action: "archive", task_type_id: taskTypeId },
        ]
      ) {
        const response = await postApi(
          "task-types.admin",
          identities.admin.accessToken,
          input,
        );
        assertEquals(response.status, 200, JSON.stringify(response.payload));
      }
      const archivedTypes = await getApi(
        "task-types.list",
        identities.admin.accessToken,
        { include_archived: true },
      );
      assertEquals(archivedTypes.status, 200);
      const archivedRows = readValue(archivedTypes.payload, "task_types");
      assert(
        Array.isArray(archivedRows) &&
          archivedRows.some((row) =>
            readString(row, "id") === taskTypeId &&
            readBoolean(row, "is_active") === false
          ),
      );
      const historicalAfterArchive = await getApi("tasks.list", tcsToken, {
        agency_id: agencyId,
        search: taskTitle,
        page: 1,
        page_size: 50,
      });
      assertEquals(historicalAfterArchive.status, 200);
      assert(
        Number(readValue(historicalAfterArchive.payload, "total")) > 0,
        "Les tâches historiques doivent rester lisibles après archivage du type.",
      );
      const createWithArchivedType = await postApi("tasks.create", tcsToken, {
        ...quickInput,
        idempotency_key: crypto.randomUUID(),
        title: `${taskTitle} type archivé`,
      });
      assertEquals(createWithArchivedType.status, 400);
      assertEquals(
        readString(createWithArchivedType.payload, "code"),
        "VALIDATION_ERROR",
      );
    } finally {
      if (taskTypeId) {
        await cleanupTaskProbe(taskTypeId, identities.admin.userId);
      }
      for (const userId of [observerId, agencyAdminId, tcsId]) {
        if (!userId) continue;
        const deleted = await postApi(
          "admin.users",
          identities.admin.accessToken,
          { action: "delete", user_id: userId },
        );
        assertEquals(
          deleted.status,
          200,
          `Nettoyage du compte de probe ${userId}: ${
            JSON.stringify(deleted.payload)
          }`,
        );
      }
    }
  },
});
