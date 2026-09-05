import { assert, assertEquals } from "#test/assert";
import postgres from "postgres";

import { getSupabaseAdmin } from "../middleware/auth/auth.ts";
import {
  CAN_RUN_NETWORK_INTEGRATION,
  getIntegrationIdentities,
  postApi,
  readEntityFromPayload,
  readString,
  integrationTest,
} from "./helpers.ts";

type ProbeState = {
  adminId: string;
  adminToken: string;
  userAId: string;
  userAToken: string;
  agencyAId: string;
  userBId: string;
  userBToken: string;
  agencyBId: string;
  entityAId: string;
  entityBId: string;
};

const signInProbeUser = async (
  email: string,
  password: string,
): Promise<string> => {
  const url = process.env["SUPABASE_URL"]?.trim().replace(/\/+$/, "");
  const anonKey = process.env["SUPABASE_ANON_KEY"]?.trim();
  assert(url && anonKey, "Configuration Supabase d integration absente.");

  const response = await fetch(`${url}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { "Content-Type": "application/json", apikey: anonKey },
    body: JSON.stringify({ email, password }),
  });
  const payload = await response.json() as Record<string, unknown>;
  assert(
    response.ok,
    `Connexion du compte de probe refusee (${response.status}).`,
  );
  const token = typeof payload.access_token === "string"
    ? payload.access_token
    : "";
  assert(token, "Jeton de session du compte de probe absent.");
  return token;
};

const findSecondAgencyId = async (excludedAgencyId: string): Promise<string> => {
  const databaseUrl = process.env["DATABASE_URL"]?.trim();
  assert(databaseUrl, "Base de donnees d integration absente.");
  const database = postgres(databaseUrl, { max: 1, prepare: false });
  try {
    const rows = await database.unsafe<Array<{ id: string }>>(
      `select id
       from public.agencies
       where archived_at is null and id <> $1::uuid
       order by created_at asc
       limit 1`,
      [excludedAgencyId],
    );
    const agencyId = rows[0]?.id ?? "";
    assert(agencyId, "Une seconde agence active est requise pour la probe RLS.");
    return agencyId;
  } finally {
    await database.end({ timeout: 0 });
  }
};

const prospectPayload = (
  agencyId: string,
  name: string,
  entityId?: string,
) => ({
  action: "save" as const,
  agency_id: agencyId,
  entity_type: "Prospect" as const,
  ...(entityId ? { id: entityId } : {}),
  primary_contact_id: null,
  entity: {
    name,
    address: "1 rue de la Probe",
    postal_code: "75001",
    department: "75",
    city: "Paris",
    siret: "",
    notes: "LOT_2B_RLS_PROBE",
    agency_id: agencyId,
  },
});

const createProbeEntity = async (
  token: string,
  agencyId: string,
  name: string,
): Promise<string> => {
  const response = await postApi(
    "data.entities",
    token,
    prospectPayload(agencyId, name),
  );
  assertEquals(
    response.status,
    200,
    `Creation de la fiche de probe refusee: ${JSON.stringify(response.payload)}`,
  );
  const entityId = readString(readEntityFromPayload(response.payload), "id");
  assert(entityId, "Identifiant de la fiche de probe absent.");
  return entityId;
};

const assertEntityVisibility = async (
  token: string,
  ownEntityId: string,
  foreignEntityId: string,
): Promise<void> => {
  const own = await postApi("data.entity-contacts", token, {
    action: "list_by_entity",
    entity_id: ownEntityId,
  });
  assertEquals(own.status, 200, "La fiche de l agence courante doit etre visible.");

  const foreign = await postApi("data.entity-contacts", token, {
    action: "list_by_entity",
    entity_id: foreignEntityId,
  });
  assertEquals(
    foreign.status,
    404,
    `Le UUID inter-agence doit rester invisible: ${JSON.stringify(foreign.payload)}`,
  );
  assertEquals(readString(foreign.payload, "code"), "NOT_FOUND");
};

const readLatestEntityAuditActor = async (entityId: string): Promise<string> => {
  const databaseUrl = process.env["DATABASE_URL"]?.trim();
  assert(databaseUrl, "Base de donnees d integration absente.");
  const database = postgres(databaseUrl, { max: 1, prepare: false });
  try {
    const rows = await database.unsafe<Array<{ actor_id: string | null }>>(
      `select actor_id
       from public.audit_logs
       where entity_table = 'entities'
         and entity_id = $1
         and action = 'update'
       order by created_at desc
       limit 1`,
      [entityId],
    );
    return rows[0]?.actor_id ?? "";
  } finally {
    await database.end({ timeout: 0 });
  }
};

const cleanupProbe = async (state: Partial<ProbeState>): Promise<void> => {
  for (const entityId of [state.entityBId, state.entityAId]) {
    if (!entityId || !state.adminToken) continue;
    await postApi("data.entities", state.adminToken, {
      action: "delete",
      entity_id: entityId,
      delete_related_interactions: true,
    });
  }

  const databaseUrl = process.env["DATABASE_URL"]?.trim();
  assert(databaseUrl, "Base de donnees d integration absente.");
  const database = postgres(databaseUrl, { max: 1, prepare: false });
  const entityIds = [state.entityAId, state.entityBId].filter(Boolean);
  try {
    await database.begin(async (transaction) => {
      if (state.adminId) {
        await transaction.unsafe("select private.set_audit_actor($1::uuid)", [
          state.adminId,
        ]);
      }
      if (entityIds.length > 0) {
        await transaction.unsafe(
          "delete from public.audit_logs where entity_id = any($1::text[])",
          [entityIds],
        );
      }
      for (const userId of [state.userAId, state.userBId]) {
        if (!userId) continue;
        await transaction.unsafe(
          `delete from public.audit_logs
           where actor_id = $1::uuid
              or entity_id = $1::text
              or metadata->>'user_id' = $1::text`,
          [userId],
        );
      }

      const callerIds = [state.adminId, state.userAId, state.userBId].filter(
        Boolean,
      );
      for (const callerId of callerIds) {
        await transaction.unsafe(
          "delete from public.rate_limits where key like $1",
          [`%:${callerId}:%`],
        );
      }
    });

    for (const userId of [state.userAId, state.userBId]) {
      if (!userId) continue;
      const { error } = await getSupabaseAdmin().auth.admin.deleteUser(
        userId,
      );
      assert(!error, `Suppression du compte de probe refusee: ${error?.message}`);
      await database.unsafe(
        `delete from public.audit_logs
         where entity_id = $1::text or metadata->>'user_id' = $1::text`,
        [userId],
      );

      const residues = await database.unsafe<Array<{ count: number }>>(
        `select (
          (select count(*) from auth.users where id = $1::uuid)
          + (select count(*) from public.profiles where id = $1::uuid)
          + (select count(*) from public.agency_members where user_id = $1::uuid)
        )::int as count`,
        [userId],
      );
      assertEquals(residues[0]?.count ?? -1, 0, "Residus du compte de probe.");
    }
  } finally {
    await database.end({ timeout: 0 });
  }
};

integrationTest({
  name:
    "Lot 2B prouve l isolation RLS alternee et l acteur d audit avec savepoint",
  ignore: !CAN_RUN_NETWORK_INTEGRATION,
  fn: async () => {
    const state: Partial<ProbeState> = {};
    const runId = crypto.randomUUID().replaceAll("-", "");
    const emailA = `lot-2b-rls-${runId}-a@test.invalid`;
    const emailB = `lot-2b-rls-${runId}-b@test.invalid`;
    const password = `L2b!${runId}Aa1`;

    try {
      const identities = await getIntegrationIdentities();
      state.adminId = identities.admin.userId;
      state.adminToken = identities.admin.accessToken;
      state.agencyAId = identities.user.agencyId;
      state.agencyBId = await findSecondAgencyId(state.agencyAId);

      const createdUserA = await postApi(
        "admin.users",
        state.adminToken,
        {
          action: "create",
          email: emailA,
          first_name: "Lot 2B",
          last_name: "Probe RLS A",
          role: "tcs",
          agency_ids: [state.agencyAId],
          password,
        },
      );
      assertEquals(
        createdUserA.status,
        200,
        `Creation du compte A refusee: ${JSON.stringify(createdUserA.payload)}`,
      );
      state.userAId = readString(createdUserA.payload, "user_id");
      assert(state.userAId, "Identifiant du premier utilisateur absent.");

      const createdUserB = await postApi(
        "admin.users",
        state.adminToken,
        {
          action: "create",
          email: emailB,
          first_name: "Lot 2B",
          last_name: "Probe RLS B",
          role: "tcs",
          agency_ids: [state.agencyBId],
          password,
        },
      );
      assertEquals(
        createdUserB.status,
        200,
        `Creation du compte B refusee: ${JSON.stringify(createdUserB.payload)}`,
      );
      state.userBId = readString(createdUserB.payload, "user_id");
      assert(state.userBId, "Identifiant du second utilisateur absent.");

      state.userAToken = await signInProbeUser(emailA, password);
      state.userBToken = await signInProbeUser(emailB, password);

      for (const token of [state.userAToken, state.userBToken]) {
        const changedPassword = await fetch(
          `${process.env["API_BASE_URL"] ?? "http://127.0.0.1:8787"}/trpc/data.changePassword`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              apikey: process.env["SUPABASE_ANON_KEY"] ?? "",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ password }),
          },
        );
        assertEquals(changedPassword.status, 200, "Initialisation du mot de passe.");
      }
      state.userAToken = await signInProbeUser(emailA, password);
      state.userBToken = await signInProbeUser(emailB, password);

      state.entityAId = await createProbeEntity(
        state.userAToken,
        state.agencyAId,
        `LOT_2B_PROBE_${runId}_A`,
      );
      state.entityBId = await createProbeEntity(
        state.userBToken,
        state.agencyBId,
        `LOT_2B_PROBE_${runId}_B`,
      );

      // Scenario 1: A -> B -> A sur le meme pool, sans fuite de contexte JWT.
      await assertEntityVisibility(
        state.userAToken,
        state.entityAId,
        state.entityBId,
      );
      await assertEntityVisibility(
        state.userBToken,
        state.entityBId,
        state.entityAId,
      );
      await assertEntityVisibility(
        state.userAToken,
        state.entityAId,
        state.entityBId,
      );

      // Scenario 2: l update traverse la transaction RLS puis le savepoint metier.
      const updated = await postApi(
        "data.entities",
        state.userAToken,
        prospectPayload(
          state.agencyAId,
          `LOT_2B_PROBE_${runId}_A_UPDATED`,
          state.entityAId,
        ),
      );
      assertEquals(
        updated.status,
        200,
        `Mutation avec savepoint refusee: ${JSON.stringify(updated.payload)}`,
      );
      assertEquals(
        await readLatestEntityAuditActor(state.entityAId),
        state.userAId,
        "Le trigger d audit doit conserver l acteur utilisateur.",
      );
    } finally {
      await cleanupProbe(state);
    }
  },
});
