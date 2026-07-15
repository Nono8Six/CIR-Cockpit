import { assertEquals, assertRejects, assertThrows } from 'std/assert';

import type { AuthContext, DbClient } from '../../types.ts';
import {
  canonicalizeAssistantSql,
  executeDatabaseSql,
  normalizeAssistantSql,
  validateAssistantSqlAgainstCatalog,
} from './assistantSqlTools.ts';
import { runAssistantToolLoop } from './assistantBroker.ts';
import type { OpenRouterToolResponse } from './aiGovernance.ts';
import {
  executeAssistantTool,
  openRouterToolDefinitions,
} from './assistantTools.ts';

const authContext: AuthContext = {
  userId: '00000000-0000-4000-8000-000000000001',
  role: 'agency_admin',
  agencyIds: ['00000000-0000-4000-8000-000000000002'],
  activeAgencyId: '00000000-0000-4000-8000-000000000002',
  isSuperAdmin: false,
};

Deno.test('assistant SQL accepts one SELECT and removes its trailing semicolon', () => {
  assertEquals(
    normalizeAssistantSql('  SELECT count(*) FROM public.clients;  '),
    'SELECT count(*) FROM public.clients',
  );
  assertEquals(
    normalizeAssistantSql(
      'with scoped as (select 1 as value) select * from scoped',
    ),
    'with scoped as (select 1 as value) select * from scoped',
  );
});

Deno.test('assistant SQL rejects writes, multiple statements, protected schemas and locking', () => {
  assertThrows(
    () => normalizeAssistantSql("update public.clients set name = 'x'"),
    Error,
    'Seules les requetes SELECT ou WITH sont autorisees.',
  );
  assertThrows(
    () => normalizeAssistantSql('select 1; select 2'),
    Error,
    'Une seule instruction SQL sans commentaire est autorisee.',
  );
  assertThrows(
    () => normalizeAssistantSql('select * from auth.users'),
    Error,
    'Ce schema SQL n est pas accessible a l assistant.',
  );
  assertThrows(
    () => normalizeAssistantSql('select * from "auth".users'),
    Error,
    'Ce schema SQL n est pas accessible a l assistant.',
  );
  assertThrows(
    () =>
      normalizeAssistantSql(
        "select set_config('statement_timeout', '0', true)",
      ),
    Error,
    'Cette fonction SQL n est pas autorisee.',
  );
  assertThrows(
    () => normalizeAssistantSql('select * from public.clients for update'),
    Error,
    'Les verrous de lignes ne sont pas autorises.',
  );
});

Deno.test('assistant SQL execution configures a read-only authenticated transaction before the query', async () => {
  const executions: unknown[] = [];
  const transaction = {
    execute: (statement: unknown) => {
      executions.push(statement);
      if (executions.length === 7) {
        return Promise.resolve([{
          name: 'pricing_supplier_segments',
          description: null,
          column_names: ['snapshot_id', 'cat_fab'],
        }]);
      }
      return Promise.resolve(
        executions.length === 8 ? [{ distinct_cat_fab_rock: 853 }] : [],
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
    "select count(distinct cat_fab) as distinct_cat_fab_rock from public.pricing_supplier_segments where snapshot_id = '00000000-0000-4000-8000-000000000003'::uuid",
  );

  assertEquals(executions.length, 8);
  assertEquals(result.rows, [{ distinct_cat_fab_rock: 853 }]);
  assertEquals(result.columns, ['distinct_cat_fab_rock']);
  assertEquals(result.truncated, false);
});

Deno.test('assistant SQL injecte deux identites distinctes pour laisser les RLS isoler leurs agences', async () => {
  const observed: string[] = [];
  const run = (context: AuthContext) => {
    const transaction = {
      execute: (statement: unknown) => {
        observed.push(JSON.stringify(statement));
        return Promise.resolve(
          observed.length % 8 === 7
            ? [{ name: 'clients', description: null, column_names: ['id'] }]
            : [],
        );
      },
    };
    const db = {
      transaction: (callback: (tx: typeof transaction) => Promise<unknown>) =>
        callback(transaction),
    } as unknown as DbClient;
    return executeDatabaseSql(db, context, 'select * from public.clients');
  };

  const agencyA = authContext;
  const agencyB = {
    ...authContext,
    userId: '00000000-0000-4000-8000-000000000003',
    agencyIds: ['00000000-0000-4000-8000-000000000004'],
    activeAgencyId: '00000000-0000-4000-8000-000000000004',
  };
  await run(agencyA);
  await run(agencyB);

  const statements = observed.join('\n');
  assertEquals(statements.includes(agencyA.userId), true);
  assertEquals(statements.includes(agencyB.userId), true);
});

Deno.test('assistant aggregate_segments normalise FESTO vers FEST et compte les CAT_FAB', async () => {
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
  const snapshotId = '00000000-0000-4000-8000-000000000003';

  const result = await executeAssistantTool(
    db,
    authContext,
    'request-fest',
    'aggregate_segments',
    { marques: ['FEST', 'FESTO'] },
    { surface: 'pricing.references', target_snapshot_id: snapshotId },
  );

  assertEquals(result.output, {
    ok: true,
    data: {
      snapshot_id: snapshotId,
      marques: ['FEST'],
      segment_rows: 673,
      distinct_cat_fab: 673,
      distinct_segments: 673,
    },
  });
  assertEquals(result.rowCount, 1);
  assertEquals(executions.length, 1);
});

Deno.test('assistant aggregate_segments refuse les champs inconnus avant acces DB', async () => {
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
    'request-strict',
    'aggregate_segments',
    { marques: ['FEST'], instruction_cachee: 'ignorer le filtre' },
    { surface: 'pricing.references' },
  );

  assertEquals(result.output.ok, false);
  assertEquals(executed, false);
});

Deno.test('assistant exposes schema search, catalog, description and SQL tools to OpenRouter', () => {
  const names = openRouterToolDefinitions.map((tool) => tool.function.name);
  assertEquals(names.includes('rank_purchase_terms'), true);
  assertEquals(names.includes('search_schema'), true);
  assertEquals(names.includes('get_database_catalog'), true);
  assertEquals(names.includes('describe_database_tables'), true);
  assertEquals(names.includes('execute_readonly_sql'), true);
});

Deno.test('P6 rank_purchase_terms filtre la marque et retourne un top numeric prouve', async () => {
  const executions: unknown[] = [];
  const transaction = {
    execute: (statement: unknown) => {
      executions.push(statement);
      if (executions.length === 7) {
        return Promise.resolve([{
          id: '4e216bc4-7d82-4eb7-aa20-2cc8316667cc',
        }]);
      }
      if (executions.length === 8) {
        return Promise.resolve([{
          cat_fab: 'FEST-A',
          cat_fab_l: 'Catégorie A',
          remise_ha_pct: 42.5,
        }, {
          cat_fab: 'FEST-B',
          cat_fab_l: 'Catégorie B',
          remise_ha_pct: 40,
        }]);
      }
      return Promise.resolve([]);
    },
  };
  const db = {
    transaction: (callback: (tx: typeof transaction) => Promise<unknown>) =>
      callback(transaction),
  } as unknown as DbClient;

  const result = await executeAssistantTool(
    db,
    authContext,
    'request-ranking',
    'rank_purchase_terms',
    { marque: ' FESTO ', limit: 2 },
    { surface: 'pricing.references' },
  );

  assertEquals(result.output, {
    ok: true,
    data: {
      snapshot_id: '4e216bc4-7d82-4eb7-aa20-2cc8316667cc',
      marque: 'FEST',
      metric: 'remise_ha_pct',
      direction: 'desc',
      top_cat_fab: ['FEST-A', 'FEST-B'],
      top_remise_pct: [42.5, 40],
      rows: [{
        cat_fab: 'FEST-A',
        cat_fab_l: 'Catégorie A',
        remise_ha_pct: 42.5,
      }, {
        cat_fab: 'FEST-B',
        cat_fab_l: 'Catégorie B',
        remise_ha_pct: 40,
      }],
    },
  });
  assertEquals(result.rowCount, 2);
  assertEquals(executions.length, 8);
});

Deno.test('P0 refuse une colonne agency_id absente avant PostgreSQL', () => {
  assertThrows(
    () =>
      normalizeAssistantSql(
        "select count(*) from public.pricing_supplier_segments where agency_id = '00000000-0000-4000-8000-000000000002'",
      ),
    Error,
    'Colonne SQL inconnue',
  );
});

Deno.test('P0 considere identiques deux SQL qui different seulement par le point virgule final', async () => {
  let providerRound = 0;
  let executions = 0;
  const providerResponse = (sqlText: string): OpenRouterToolResponse => ({
    text: '',
    inputTokens: 1,
    outputTokens: 1,
    cachedInputTokens: 0,
    reasoningTokens: 0,
    providerCostAmount: 0,
    generationId: crypto.randomUUID(),
    modelId: 'evaluation/offline',
    provider: 'offline',
    finishReason: 'tool_calls',
    nativeFinishReason: 'tool_calls',
    content: null,
    toolCalls: [{
      id: crypto.randomUUID(),
      type: 'function',
      function: {
        name: 'execute_readonly_sql',
        arguments: JSON.stringify({ sql: sqlText, purpose: 'Compter' }),
      },
    }],
  });

  const result = await runAssistantToolLoop(
    [{ role: 'user', content: 'Compte les marques.' }],
    openRouterToolDefinitions.filter((tool) =>
      tool.function.name === 'execute_readonly_sql'
    ),
    () => {
      const currentRound = providerRound++;
      return Promise.resolve(
        currentRound >= 2
          ? {
            ...providerResponse('select 1'),
            finishReason: 'stop',
            nativeFinishReason: 'stop',
            content: 'Le comptage est termine.',
            toolCalls: [],
          }
          : providerResponse(
            currentRound === 0
              ? 'select count(*) from public.pricing_supplier_segments'
              : 'select count(*) from public.pricing_supplier_segments;',
          ),
      );
    },
    () => {
      executions += 1;
      return Promise.resolve({
        output: { ok: true, rows: [{ count: 140 }] },
        rowCount: 1,
      });
    },
  );
  assertEquals(executions, 1);
  assertEquals(result.toolTrace.map((trace) => trace.executed), [true, false]);
  assertEquals(result.toolTrace.at(-1)?.blocked_reason, 'duplicate_tool_call');
});

Deno.test('P0 refuse une reparation qui retire le snapshot de reference', async () => {
  let providerRound = 0;
  let executions = 0;
  const blockedReasons: Array<string | null> = [];
  const sqlByRound = [
    "select count(distinct marque) from public.pricing_supplier_segments where snapshot_id = '4e216bc4-7d82-4eb7-aa20-2cc8316667cc'::uuid",
    'select count(distinct marque) from public.pricing_supplier_segments',
  ];
  await assertRejects(
    () =>
      runAssistantToolLoop(
        [{
          role: 'user',
          content:
            'Il y a combien de marque différentes dans le snapshot actif ?',
        }],
        openRouterToolDefinitions.filter((tool) =>
          tool.function.name === 'execute_readonly_sql'
        ),
        () => {
          const currentRound = providerRound++;
          return Promise.resolve({
            text: '',
            inputTokens: 1,
            outputTokens: 1,
            cachedInputTokens: 0,
            reasoningTokens: 0,
            providerCostAmount: 0,
            generationId: crypto.randomUUID(),
            modelId: 'evaluation/offline',
            provider: 'offline',
            finishReason: currentRound >= 2 ? 'stop' : 'tool_calls',
            nativeFinishReason: currentRound >= 2 ? 'stop' : 'tool_calls',
            content: currentRound >= 2 ? 'Reparation refusee.' : null,
            toolCalls: currentRound >= 2 ? [] : [{
              id: crypto.randomUUID(),
              type: 'function',
              function: {
                name: 'execute_readonly_sql',
                arguments: JSON.stringify({
                  sql: sqlByRound[Math.min(currentRound, 1)],
                  purpose: 'Compter',
                }),
              },
            }],
          });
        },
        () => {
          executions += 1;
          return Promise.resolve({
            output: executions === 1
              ? { ok: false, reason: 'échec SQL' }
              : { ok: true, rows: [{ count: 140 }] },
            rowCount: executions === 1 ? null : 1,
          });
        },
        (trace) => blockedReasons.push(trace.blocked_reason),
      ),
    Error,
    'Aucune execution SQL semantiquement valide n a abouti.',
  );
  assertEquals(executions, 1);
  assertEquals(blockedReasons.at(-1), 'sql_repair_scope_changed');
});

Deno.test('P4 valide tables et colonnes contre le catalogue avant PostgreSQL', () => {
  const catalog = [{
    name: 'clients',
    description: null,
    column_names: ['id', 'name', 'agency_id'],
  }];
  assertThrows(
    () =>
      validateAssistantSqlAgainstCatalog(
        'select absent from public.clients',
        catalog,
      ),
    Error,
    'Colonne SQL inconnue: absent',
  );
  assertThrows(
    () =>
      validateAssistantSqlAgainstCatalog(
        'select id from public.inconnue',
        catalog,
      ),
    Error,
    'Table SQL inconnue ou non autorisee: inconnue',
  );
});

Deno.test('P4 accepte une CTE read-only legitime et conserve une variation metier', () => {
  const catalog = [{
    name: 'clients',
    description: null,
    column_names: ['id', 'name', 'agency_id'],
  }];
  validateAssistantSqlAgainstCatalog(
    'with scoped as (select id, name from public.clients where agency_id is not null) select count(*) from scoped',
    catalog,
  );
  assertEquals(
    canonicalizeAssistantSql(
      "select count(*) from public.clients where name = 'A'",
    ) ===
      canonicalizeAssistantSql(
        "select count(*) from public.clients where name = 'B'",
      ),
    false,
  );
});

Deno.test('P4 refuse schema quote, fonction, commentaire et verrouillage', () => {
  for (
    const request of [
      'select * from "AuTh"."users"',
      "select pg_read_file('/tmp/x')",
      'select 1 -- commentaire',
      'select * from public.clients for key share',
    ]
  ) assertThrows(() => normalizeAssistantSql(request), Error);
});

Deno.test('P4 impose le snapshot et ILIKE aux recherches exhaustives', () => {
  const catalog = [{
    name: 'pricing_supplier_segments',
    description: null,
    column_names: ['snapshot_id', 'marque', 'cat_fab'],
  }];
  assertThrows(
    () =>
      validateAssistantSqlAgainstCatalog(
        'select count(*) from public.pricing_supplier_segments',
        catalog,
      ),
    Error,
    'Un filtre snapshot_id est obligatoire',
  );
  assertThrows(
    () =>
      validateAssistantSqlAgainstCatalog(
        "select marque from public.pricing_supplier_segments where snapshot_id = '00000000-0000-4000-8000-000000000003'::uuid and cat_fab like '%rock%'",
        catalog,
      ),
    Error,
    'doit utiliser ILIKE',
  );
  validateAssistantSqlAgainstCatalog(
    "select marque from public.pricing_supplier_segments where snapshot_id = '00000000-0000-4000-8000-000000000003'::uuid and cat_fab ilike '%rock%'",
    catalog,
  );
});

Deno.test('P5B refuse le tri des colonnes financieres text brutes', () => {
  const catalog = [{
    name: 'pricing_segment_purchase_grids',
    description: null,
    column_names: ['snapshot_id', 'segment_id', 'remise_ha'],
  }];
  assertThrows(
    () =>
      validateAssistantSqlAgainstCatalog(
        "select segment_id, remise_ha from public.pricing_segment_purchase_grids where snapshot_id = '4e216bc4-7d82-4eb7-aa20-2cc8316667cc'::uuid order by remise_ha desc",
        catalog,
      ),
    Error,
    'tri d une valeur financiere text brute',
  );
});

Deno.test('P5B accepte le tri numeric de la vue active', () => {
  const catalog = [{
    name: 'ai_v_purchase_terms_active',
    description: null,
    column_names: ['marque', 'cat_fab', 'remise_ha_pct'],
  }];
  validateAssistantSqlAgainstCatalog(
    "select cat_fab, max(remise_ha_pct) as remise_max from public.ai_v_purchase_terms_active where marque = 'FEST' group by cat_fab order by 2 desc limit 3",
    catalog,
  );
});

Deno.test('P4 canonicalise casse espaces retours ligne JSON et point virgule', async () => {
  const sqlA = ' SELECT count(*)\nFROM public.clients ;';
  const sqlB = 'select COUNT ( * ) from PUBLIC.clients';
  assertEquals(canonicalizeAssistantSql(sqlA), canonicalizeAssistantSql(sqlB));

  let round = 0;
  let executions = 0;
  const result = await runAssistantToolLoop(
    [{ role: 'user', content: 'Compte' }],
    openRouterToolDefinitions,
    () => {
      const currentRound = round++;
      return Promise.resolve({
        text: '',
        inputTokens: 1,
        outputTokens: 1,
        cachedInputTokens: 0,
        reasoningTokens: 0,
        providerCostAmount: 0,
        generationId: crypto.randomUUID(),
        modelId: 'offline',
        provider: 'offline',
        finishReason: currentRound >= 2 ? 'stop' : 'tool_calls',
        nativeFinishReason: currentRound >= 2 ? 'stop' : 'tool_calls',
        content: currentRound >= 2 ? 'Le comptage est termine.' : null,
        toolCalls: currentRound >= 2 ? [] : [{
          id: crypto.randomUUID(),
          type: 'function',
          function: {
            name: 'execute_readonly_sql',
            arguments: currentRound === 0
              ? JSON.stringify({
                purpose: 'Compte',
                sql: sqlA,
                options: { b: 2, a: 1 },
              })
              : JSON.stringify({
                options: { a: 1, b: 2 },
                sql: sqlB,
                purpose: 'Compte',
              }),
          },
        }],
      });
    },
    () => {
      executions += 1;
      return Promise.resolve({ output: { ok: true }, rowCount: 1 });
    },
  );
  assertEquals(executions, 1);
  assertEquals(result.toolTrace.map((trace) => trace.executed), [true, false]);
  assertEquals(result.toolTrace.at(-1)?.blocked_reason, 'duplicate_tool_call');
});

Deno.test('P4 refuse une reparation qui change table dimension ou filtre metier', async () => {
  const initial =
    "select marque, count(*) from public.pricing_supplier_segments where snapshot_id = '4e216bc4-7d82-4eb7-aa20-2cc8316667cc'::uuid and cat_fab ilike '%rock%' group by marque";
  const repairs = [
    "select name, count(*) from public.clients where snapshot_id = '4e216bc4-7d82-4eb7-aa20-2cc8316667cc'::uuid and cat_fab ilike '%rock%' group by name",
    "select cat_fab, count(*) from public.pricing_supplier_segments where snapshot_id = '4e216bc4-7d82-4eb7-aa20-2cc8316667cc'::uuid and cat_fab ilike '%rock%' group by cat_fab",
    "select marque, count(*) from public.pricing_supplier_segments where snapshot_id = '4e216bc4-7d82-4eb7-aa20-2cc8316667cc'::uuid and cat_fab ilike '%drive%' group by marque",
  ];
  for (const repair of repairs) {
    let round = 0;
    let executions = 0;
    await assertRejects(
      () =>
        runAssistantToolLoop(
          [{ role: 'user', content: 'Compte' }],
          openRouterToolDefinitions,
          () =>
            Promise.resolve({
              text: '',
              inputTokens: 1,
              outputTokens: 1,
              cachedInputTokens: 0,
              reasoningTokens: 0,
              providerCostAmount: 0,
              generationId: crypto.randomUUID(),
              modelId: 'offline',
              provider: 'offline',
              finishReason: 'tool_calls',
              nativeFinishReason: 'tool_calls',
              content: null,
              toolCalls: [{
                id: crypto.randomUUID(),
                type: 'function',
                function: {
                  name: 'execute_readonly_sql',
                  arguments: JSON.stringify({
                    sql: round++ === 0 ? initial : repair,
                    purpose: 'Compte',
                  }),
                },
              }],
            }),
          () => {
            executions += 1;
            return Promise.resolve({ output: { ok: false }, rowCount: null });
          },
        ),
      Error,
    );
    assertEquals(executions, 1);
  }
});

Deno.test('P6 autorise trois reparations SQL puis demande une conclusion', async () => {
  const sqlByRound = [
    "select count(marque) from public.pricing_supplier_segments where snapshot_id = '4e216bc4-7d82-4eb7-aa20-2cc8316667cc'::uuid",
    "select count(marque) as total from public.pricing_supplier_segments where snapshot_id = '4e216bc4-7d82-4eb7-aa20-2cc8316667cc'::uuid",
    "select count(marque) as total_corrige from public.pricing_supplier_segments where snapshot_id = '4e216bc4-7d82-4eb7-aa20-2cc8316667cc'::uuid",
    "select count(marque) as total_corrige_2 from public.pricing_supplier_segments where snapshot_id = '4e216bc4-7d82-4eb7-aa20-2cc8316667cc'::uuid",
    "select count(marque) as total_corrige_3 from public.pricing_supplier_segments where snapshot_id = '4e216bc4-7d82-4eb7-aa20-2cc8316667cc'::uuid",
  ];
  let round = 0;
  let executions = 0;
  const blockedReasons: Array<string | null> = [];
  await assertRejects(
    () =>
      runAssistantToolLoop(
        [{ role: 'user', content: 'Compte' }],
        openRouterToolDefinitions,
        () => {
          const currentRound = round++;
          return Promise.resolve({
            text: '',
            inputTokens: 1,
            outputTokens: 1,
            cachedInputTokens: 0,
            reasoningTokens: 0,
            providerCostAmount: 0,
            generationId: crypto.randomUUID(),
            modelId: 'offline',
            provider: 'offline',
            finishReason: currentRound >= 5 ? 'stop' : 'tool_calls',
            nativeFinishReason: currentRound >= 5 ? 'stop' : 'tool_calls',
            content: currentRound >= 5 ? 'Reparations epuisees.' : null,
            toolCalls: currentRound >= 5 ? [] : [{
              id: crypto.randomUUID(),
              type: 'function',
              function: {
                name: 'execute_readonly_sql',
                arguments: JSON.stringify({
                  sql: sqlByRound[Math.min(currentRound, 4)],
                  purpose: 'Compte',
                }),
              },
            }],
          });
        },
        () => {
          executions += 1;
          return Promise.resolve({ output: { ok: false }, rowCount: null });
        },
        (trace) => blockedReasons.push(trace.blocked_reason),
      ),
    Error,
    'Aucune execution SQL semantiquement valide n a abouti.',
  );
  assertEquals(executions, 4);
  assertEquals(blockedReasons.at(-1), 'sql_repair_limit');
});
