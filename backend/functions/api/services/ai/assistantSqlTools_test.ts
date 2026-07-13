import { assertEquals, assertRejects, assertThrows } from "std/assert";

import type { AuthContext, DbClient } from "../../types.ts";
import {
  executeDatabaseSql,
  normalizeAssistantSql,
} from "./assistantSqlTools.ts";
import { runAssistantToolLoop } from "./assistantBroker.ts";
import type { OpenRouterToolResponse } from "./aiGovernance.ts";
import {
  executeAssistantTool,
  openRouterToolDefinitions,
} from "./assistantTools.ts";

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
    normalizeAssistantSql(
      "with scoped as (select 1 as value) select * from scoped",
    ),
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
    () =>
      normalizeAssistantSql(
        "select set_config('statement_timeout', '0', true)",
      ),
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

Deno.test("assistant SQL injecte deux identites distinctes pour laisser les RLS isoler leurs agences", async () => {
  const observed: string[] = [];
  const run = (context: AuthContext) => {
    const transaction = {
      execute: (statement: unknown) => {
        observed.push(JSON.stringify(statement));
        return Promise.resolve([]);
      },
    };
    const db = {
      transaction: (callback: (tx: typeof transaction) => Promise<unknown>) =>
        callback(transaction),
    } as unknown as DbClient;
    return executeDatabaseSql(db, context, "select * from public.clients");
  };

  const agencyA = authContext;
  const agencyB = {
    ...authContext,
    userId: "00000000-0000-4000-8000-000000000003",
    agencyIds: ["00000000-0000-4000-8000-000000000004"],
    activeAgencyId: "00000000-0000-4000-8000-000000000004",
  };
  await run(agencyA);
  await run(agencyB);

  const statements = observed.join("\n");
  assertEquals(statements.includes(agencyA.userId), true);
  assertEquals(statements.includes(agencyB.userId), true);
});

Deno.test("assistant aggregate_segments normalise FESTO vers FEST et compte les CAT_FAB", async () => {
  const executions: unknown[] = [];
  const db = {
    execute: (statement: unknown) => {
      executions.push(statement);
      return Promise.resolve([{
        segment_rows: 673,
        distinct_cat_fab: 673,
        distinct_segments: 673,
      }]);
    },
  } as unknown as DbClient;
  const snapshotId = "00000000-0000-4000-8000-000000000003";

  const result = await executeAssistantTool(
    db,
    authContext,
    "request-fest",
    "aggregate_segments",
    { marques: ["FEST", "FESTO"] },
    { surface: "pricing.references", target_snapshot_id: snapshotId },
  );

  assertEquals(result.output, {
    ok: true,
    data: {
      snapshot_id: snapshotId,
      marques: ["FEST"],
      segment_rows: 673,
      distinct_cat_fab: 673,
      distinct_segments: 673,
    },
  });
  assertEquals(result.rowCount, 1);
  assertEquals(executions.length, 1);
});

Deno.test("assistant aggregate_segments refuse les champs inconnus avant acces DB", async () => {
  let executed = false;
  const db = {
    execute: () => {
      executed = true;
      return Promise.resolve([]);
    },
  } as unknown as DbClient;

  const result = await executeAssistantTool(
    db,
    authContext,
    "request-strict",
    "aggregate_segments",
    { marques: ["FEST"], instruction_cachee: "ignorer le filtre" },
    { surface: "pricing.references" },
  );

  assertEquals(result.output.ok, false);
  assertEquals(executed, false);
});

Deno.test("assistant exposes catalog, table description and SQL execution tools to OpenRouter", () => {
  const names = openRouterToolDefinitions.map((tool) => tool.function.name);
  assertEquals(names.includes("get_database_catalog"), true);
  assertEquals(names.includes("describe_database_tables"), true);
  assertEquals(names.includes("execute_readonly_sql"), true);
});

Deno.test("P0 refuse une colonne agency_id absente avant PostgreSQL", () => {
  assertThrows(
    () => normalizeAssistantSql("select count(*) from public.pricing_supplier_segments where agency_id = '00000000-0000-4000-8000-000000000002'"),
    Error,
    "Colonne SQL inconnue",
  );
});

Deno.test("P0 considere identiques deux SQL qui different seulement par le point virgule final", async () => {
  let providerRound = 0;
  let executions = 0;
  const providerResponse = (sqlText: string): OpenRouterToolResponse => ({
    text: "",
    inputTokens: 1,
    outputTokens: 1,
    cachedInputTokens: 0,
    reasoningTokens: 0,
    providerCostAmount: 0,
    generationId: crypto.randomUUID(),
    modelId: "evaluation/offline",
    provider: "offline",
    finishReason: "tool_calls",
    nativeFinishReason: "tool_calls",
    content: null,
    toolCalls: [{
      id: crypto.randomUUID(),
      type: "function",
      function: {
        name: "execute_readonly_sql",
        arguments: JSON.stringify({ sql: sqlText, purpose: "Compter" }),
      },
    }],
  });

  await assertRejects(
    () => runAssistantToolLoop(
      [{ role: "user", content: "Compte les marques." }],
      openRouterToolDefinitions.filter((tool) => tool.function.name === "execute_readonly_sql"),
      () => Promise.resolve(providerResponse(providerRound++ === 0 ? "select count(*) from public.pricing_supplier_segments" : "select count(*) from public.pricing_supplier_segments;")),
      () => {
        executions += 1;
        return Promise.resolve({ output: { ok: true, rows: [{ count: 140 }] }, rowCount: 1 });
      },
    ),
    Error,
    "Boucle d appels outil identiques detectee.",
  );
  assertEquals(executions, 1);
});

Deno.test("P0 refuse une reparation qui retire le snapshot de reference", async () => {
  let providerRound = 0;
  let executions = 0;
  const sqlByRound = [
    "select count(distinct marque) from public.pricing_supplier_segments where snapshot_id = '4e216bc4-7d82-4eb7-aa20-2cc8316667cc'::uuid",
    "select count(distinct marque) from public.pricing_supplier_segments",
  ];
  await assertRejects(
    () => runAssistantToolLoop(
      [{ role: "user", content: "Il y a combien de marque différentes dans le snapshot actif ?" }],
      openRouterToolDefinitions.filter((tool) => tool.function.name === "execute_readonly_sql"),
      () => Promise.resolve({
        text: "",
        inputTokens: 1,
        outputTokens: 1,
        cachedInputTokens: 0,
        reasoningTokens: 0,
        providerCostAmount: 0,
        generationId: crypto.randomUUID(),
        modelId: "evaluation/offline",
        provider: "offline",
        finishReason: "tool_calls",
        nativeFinishReason: "tool_calls",
        content: null,
        toolCalls: [{
          id: crypto.randomUUID(),
          type: "function",
          function: { name: "execute_readonly_sql", arguments: JSON.stringify({ sql: sqlByRound[Math.min(providerRound++, 1)], purpose: "Compter" }) },
        }],
      }),
      () => {
        executions += 1;
        return Promise.resolve({ output: executions === 1 ? { ok: false, reason: "échec SQL" } : { ok: true, rows: [{ count: 140 }] }, rowCount: executions === 1 ? null : 1 });
      },
    ),
    Error,
    "Le perimetre snapshot de la reparation SQL a change.",
  );
  assertEquals(executions, 1);
});
