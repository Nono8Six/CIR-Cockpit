import { assert, assertEquals } from "std/assert";
import { and, eq, ne, sql } from "drizzle-orm";

import {
  agencies,
  agency_members,
  entities,
  entity_contacts,
  profiles,
  task_participants,
  task_types,
  tasks,
} from "../../../drizzle/schema.ts";
import { getDbClient, resetDbClientForTests } from "../../../drizzle/index.ts";
import { listTasks } from "../services/tasks/taskService.ts";
import type { AuthContext } from "../types.ts";
import {
  CAN_RUN_NETWORK_INTEGRATION,
  getIntegrationIdentities,
} from "./helpers.ts";

const shiftDate = (date: string, days: number): string => {
  const value = new Date(`${date}T12:00:00.000Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
};

Deno.test({
  name: "B3-7 validates overdue semantics and paginated search above 50 rows",
  ignore: !CAN_RUN_NETWORK_INTEGRATION,
  fn: async () => {
    const db = getDbClient();
    assert(db, "Client Drizzle d intégration introuvable.");
    const identities = await getIntegrationIdentities();
    const auth: AuthContext = {
      userId: identities.user.userId,
      role: "tcs",
      agencyIds: [identities.user.agencyId],
      activeAgencyId: identities.user.agencyId,
      isSuperAdmin: false,
    };
    const rollbackMarker = new Error("B3_7_RECIPE_ROLLBACK");

    try {
      await db.transaction(async (transaction) => {
        await transaction.execute(
          sql`select private.set_audit_actor(${auth.userId}::uuid)`,
        );
        const [agency] = await transaction.select({
          timezone: agencies.timezone,
          today: sql<
            string
          >`(now() at time zone ${agencies.timezone})::date::text`,
        }).from(agencies).where(eq(agencies.id, identities.user.agencyId))
          .limit(1);
        assert(agency, "Agence de recette introuvable.");
        const [tier] = await transaction.select({
          organizationId: entities.id,
          organizationName: entities.name,
          contactId: entity_contacts.id,
          contactFirstName: entity_contacts.first_name,
          contactLastName: entity_contacts.last_name,
        }).from(entities).innerJoin(
          entity_contacts,
          eq(entity_contacts.entity_id, entities.id),
        ).where(eq(entities.agency_id, identities.user.agencyId)).limit(1);
        assert(tier, "Tier et contact de recette introuvables.");
        const [responsible] = await transaction.select({
          id: profiles.id,
          displayName: profiles.display_name,
          firstName: profiles.first_name,
          lastName: profiles.last_name,
        }).from(profiles).where(eq(profiles.id, auth.userId)).limit(1);
        assert(responsible, "Responsable de recette introuvable.");
        const [contributor] = await transaction.select({
          id: profiles.id,
          displayName: profiles.display_name,
          firstName: profiles.first_name,
          lastName: profiles.last_name,
        }).from(agency_members).innerJoin(
          profiles,
          eq(profiles.id, agency_members.user_id),
        ).where(and(
          eq(agency_members.agency_id, identities.user.agencyId),
          ne(agency_members.user_id, auth.userId),
        )).limit(1);
        assert(contributor, "Contributeur de recette introuvable.");

        const taskTypeId = crypto.randomUUID();
        const typeLabel = `B3-7 Pagination ${taskTypeId.slice(0, 8)}`;
        await transaction.insert(task_types).values({
          id: taskTypeId,
          code: `b3_7_page_${taskTypeId.replaceAll("-", "")}`,
          label: typeLabel,
          sort_order: 9999,
          created_by: auth.userId,
          updated_by: auth.userId,
        });

        const yesterday = shiftDate(agency.today, -1);
        const tomorrow = shiftDate(agency.today, 1);
        const internalIds = Array.from(
          { length: 55 },
          () => crypto.randomUUID(),
        );
        await transaction.insert(tasks).values(internalIds.map((id, index) => ({
          id,
          agency_id: identities.user.agencyId,
          title: `B3-7 recherche titre ${String(index + 1).padStart(2, "0")}`,
          task_type_id: taskTypeId,
          scope: "internal_cir" as const,
          created_by: auth.userId,
          responsible_id: auth.userId,
          status: "todo" as const,
          priority: index === 0 ? "urgent" as const : "normal" as const,
          due_date: index === 0
            ? yesterday
            : index < 3
            ? agency.today
            : tomorrow,
          due_time: index === 1 ? "23:59:00" : index === 2 ? "00:01:00" : null,
          due_timezone: agency.timezone,
          visibility: "agency" as const,
        })));
        const tierTaskId = crypto.randomUUID();
        await transaction.insert(tasks).values({
          id: tierTaskId,
          agency_id: identities.user.agencyId,
          title: "B3-7 recherche Tier et contact",
          task_type_id: taskTypeId,
          scope: "tier_relation",
          organization_id: tier.organizationId,
          contact_id: tier.contactId,
          created_by: auth.userId,
          responsible_id: auth.userId,
          status: "todo",
          priority: "normal",
          due_date: tomorrow,
          due_time: null,
          due_timezone: agency.timezone,
          visibility: "tier",
        });
        await transaction.insert(task_participants).values({
          task_id: internalIds[0]!,
          agency_id: identities.user.agencyId,
          profile_id: contributor.id,
          participant_role: "contributor",
          added_by: auth.userId,
        });

        const baseInput = {
          agency_id: identities.user.agencyId,
          task_type_id: [taskTypeId],
          sort: "due" as const,
          direction: "asc" as const,
        };
        const firstPage = await listTasks(
          transaction,
          auth,
          crypto.randomUUID(),
          {
            ...baseInput,
            page: 1,
            page_size: 50,
          },
        );
        const secondPage = await listTasks(
          transaction,
          auth,
          crypto.randomUUID(),
          {
            ...baseInput,
            page: 2,
            page_size: 50,
          },
        );
        assertEquals(firstPage.total, 56);
        assertEquals(firstPage.items.length, 50);
        assertEquals(secondPage.items.length, 6);
        assertEquals(
          new Set(
            [...firstPage.items, ...secondPage.items].map((row) => row.task.id),
          ).size,
          56,
        );

        const assertSearchFinds = async (
          search: string,
          expectedTaskId?: string,
        ) => {
          const result = await listTasks(
            transaction,
            auth,
            crypto.randomUUID(),
            {
              ...baseInput,
              search,
              page: 1,
              page_size: 100,
            },
          );
          assert(result.total > 0, `La recherche doit trouver ${search}.`);
          if (expectedTaskId) {
            assert(result.items.some((row) => row.task.id === expectedTaskId));
          }
        };
        await assertSearchFinds("recherche titre 55", internalIds[54]);
        await assertSearchFinds(typeLabel);
        await assertSearchFinds(tier.organizationName, tierTaskId);
        await assertSearchFinds(
          [tier.contactFirstName, tier.contactLastName].filter(Boolean).join(
            " ",
          ),
          tierTaskId,
        );
        await assertSearchFinds(
          responsible.displayName ??
            [responsible.firstName, responsible.lastName].filter(Boolean).join(
              " ",
            ),
        );
        await assertSearchFinds(
          contributor.displayName ??
            [contributor.firstName, contributor.lastName].filter(Boolean).join(
              " ",
            ),
          internalIds[0],
        );

        for (
          const filter of [
            { responsible_id: auth.userId },
            { contributor_id: contributor.id },
            { organization_id: tier.organizationId },
            { contact_id: tier.contactId },
          ]
        ) {
          const result = await listTasks(
            transaction,
            auth,
            crypto.randomUUID(),
            {
              ...baseInput,
              ...filter,
              page: 1,
              page_size: 100,
            },
          );
          assert(result.total > 0);
        }

        const allRows = [...firstPage.items, ...secondPage.items];
        const dateOnlyOverdue = allRows.find((row) =>
          row.task.id === internalIds[0]
        );
        const futureTime = allRows.find((row) =>
          row.task.id === internalIds[1]
        );
        const pastTime = allRows.find((row) => row.task.id === internalIds[2]);
        assertEquals(dateOnlyOverdue?.is_overdue, true);
        assertEquals(futureTime?.is_overdue, false);
        assertEquals(pastTime?.is_overdue, true);
        assertEquals(dateOnlyOverdue?.task.status, "todo");
        assertEquals(dateOnlyOverdue?.task.priority, "urgent");

        throw rollbackMarker;
      });
      throw new Error("La recette transactionnelle aurait dû être annulée.");
    } catch (error) {
      assertEquals(error, rollbackMarker);
    } finally {
      await resetDbClientForTests();
    }
  },
});
