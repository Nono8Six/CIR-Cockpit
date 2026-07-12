import { assertEquals, assertThrows } from "std/assert";

import type { AuthContext, DbClient } from "../../types.ts";
import {
  executeDatabaseSql,
  normalizeAssistantSql,
} from "./assistantSqlTools.ts";
import { openRouterToolDefinitions } from "./assistantTools.ts";

const authContext: AuthContext = {
  userId: "00000000-0000-4000-8000-000000000001",
  role: "agency_admin",
  agencyIds: ["00000000-0000-4000-8000-000000000002"],
  activeAgencyId: "00000000-0000-4000-8000-000000000002",
  isSuperAdmin: false,
};

Deno.test("assistant SQL accepts one SELECT and removes its trailing semicolon", () => {
  assertEquals(
    normalizeAssistantSql("  SELECT count(*) FROM public.clients;  "),
    "SELECT count(*) FROM public.clients",
  );
  assertEquals(
    normalizeAssistantSql("with scoped as (select 1 as value) select * from scoped"),
    "with scoped as (select 1 as value) select * from scoped",
  );
});

Deno.test("assistant SQL rejects writes, multiple statements, protected schemas and locking", () => {
  assertThrows(
    () => normalizeAssistantSql("update public.clients set name = 'x'"),
    Error,
    "Seules les requetes SELECT ou WITH sont autorisees.",
  );
  assertThrows(
    () => normalizeAssistantSql("select 1; select 2"),
    Error,
    "Une seule instruction SQL sans commentaire est autorisee.",
  );
  assertThrows(
    () => normalizeAssistantSql("select * from auth.users"),
    Error,
    "Ce schema SQL n est pas accessible a l assistant.",
  );
  assertThrows(
    () => normalizeAssistantSql('select * from "auth".users'),
    Error,
    "Ce schema SQL n est pas accessible a l assistant.",
  );
  assertThrows(
    () => normalizeAssistantSql("select set_config('statement_timeout', '0', true)"),
    Error,
    "Cette fonction SQL n est pas autorisee.",
  );
  assertThrows(
    () => normalizeAssistantSql("select * from public.clients for update"),
    Error,
    "Les verrous de lignes ne sont pas autorises.",
  );
});

Deno.test("assistant SQL execution configures a read-only authenticated transaction before the query", async () => {
  const executions: unknown[] = [];
  const transaction = {
    execute: (statement: unknown) => {
      executions.push(statement);
      return Promise.resolve(
        executions.length === 7 ? [{ distinct_cat_fab_rock: 853 }] : [],
      );
    },
  };
  const db = {
    transaction: (callback: (tx: typeof transaction) => Promise<unknown>) =>
      callback(transaction),
  } as unknown as DbClient;

  const result = await executeDatabaseSql(
    db,
    authContext,
    "select count(distinct cat_fab) as distinct_cat_fab_rock from public.pricing_supplier_segments",
  );

  assertEquals(executions.length, 7);
  assertEquals(result.rows, [{ distinct_cat_fab_rock: 853 }]);
  assertEquals(result.columns, ["distinct_cat_fab_rock"]);
  assertEquals(result.truncated, false);
});

Deno.test("assistant exposes catalog, table description and SQL execution tools to OpenRouter", () => {
  const names = openRouterToolDefinitions.map((tool) => tool.function.name);
  assertEquals(names.includes("get_database_catalog"), true);
  assertEquals(names.includes("describe_database_tables"), true);
  assertEquals(names.includes("execute_readonly_sql"), true);
});
