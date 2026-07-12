import { sql } from "drizzle-orm";
import { z } from "zod/v4";

import { httpError } from "../../middleware/errorHandler.ts";
import type { AuthContext, DbClient } from "../../types.ts";
import type { AssistantTool } from "./assistantTools.ts";

const MAX_SQL_LENGTH = 12_000;
const MAX_SQL_ROWS = 50;
const SQL_STATEMENT_TIMEOUT_MS = 5_000;
const SQL_LOCK_TIMEOUT_MS = 500;

const tableNameSchema = z.string().trim().regex(
  /^[a-z][a-z0-9_]{0,62}$/,
  { error: "Nom de table invalide." },
);

export const databaseCatalogInputSchema = z.strictObject({});
export const databaseCatalogOutputSchema = z.strictObject({
  ok: z.literal(true),
  total: z.number().int().nonnegative(),
  tables: z.array(z.strictObject({
    name: tableNameSchema,
    description: z.string().nullable(),
    column_names: z.array(z.string()),
  })).max(100),
});

export const databaseDescribeInputSchema = z.strictObject({
  tables: z.array(tableNameSchema).min(1, {
    error: "Au moins une table est requise.",
  }).max(8, { error: "Maximum 8 tables par inspection." }),
});
export const databaseDescribeOutputSchema = z.strictObject({
  ok: z.literal(true),
  tables: z.array(z.strictObject({
    name: tableNameSchema,
    description: z.string().nullable(),
    columns: z.array(z.strictObject({
      name: z.string(),
      data_type: z.string(),
      nullable: z.boolean(),
      description: z.string().nullable(),
    })),
    foreign_keys: z.array(z.strictObject({
      column: z.string(),
      referenced_table: z.string(),
      referenced_column: z.string(),
    })),
  })).max(8),
});

export const databaseSqlInputSchema = z.strictObject({
  sql: z.string().trim().min(1, { error: "Requete SQL requise." }).max(
    MAX_SQL_LENGTH,
    { error: "Requete SQL trop longue." },
  ),
  purpose: z.string().trim().min(1, { error: "Objectif SQL requis." }).max(
    500,
    { error: "Objectif SQL trop long." },
  ),
});
const sqlRowSchema = z.record(z.string(), z.json());
export const databaseSqlOutputSchema = z.strictObject({
  ok: z.literal(true),
  sql: z.string(),
  columns: z.array(z.string()),
  rows: z.array(sqlRowSchema).max(MAX_SQL_ROWS),
  truncated: z.boolean(),
  execution_ms: z.number().int().nonnegative(),
});

const parametersFor = (schema: z.ZodType): Record<string, unknown> => {
  const jsonSchema = z.toJSONSchema(schema) as Record<string, unknown>;
  delete jsonSchema.$schema;
  return jsonSchema;
};

type DbTransaction = Parameters<Parameters<DbClient["transaction"]>[0]>[0];

const runAuthenticatedReadOnly = async <T>(
  db: DbClient,
  authContext: AuthContext,
  action: (tx: DbTransaction) => Promise<T>,
): Promise<T> =>
  await db.transaction(async (tx) => {
    await tx.execute(sql.raw("set transaction read only"));
    await tx.execute(sql`select set_config(
      'request.jwt.claims',
      ${JSON.stringify({ sub: authContext.userId, role: "authenticated" })},
      true
    )`);
    await tx.execute(sql.raw("set local role authenticated"));
    await tx.execute(
      sql.raw(`set local statement_timeout = '${SQL_STATEMENT_TIMEOUT_MS}ms'`),
    );
    await tx.execute(
      sql.raw(`set local lock_timeout = '${SQL_LOCK_TIMEOUT_MS}ms'`),
    );
    await tx.execute(sql.raw("set local search_path = public, pg_catalog"));
    return await action(tx);
  });

const FORBIDDEN_SQL_PATTERN = /"?(?:auth|extensions|graphql|net|pg_catalog|private|realtime|storage|supabase_migrations|vault)"?\s*\./i;
const FORBIDDEN_RELATION_PATTERN = /\b(?:ai_provider_configs)\b/i;
const FORBIDDEN_FUNCTION_PATTERN = /\b(?:dblink|lo_export|lo_import|pg_read_binary_file|pg_read_file|pg_sleep|set_config)\s*\(/i;
const LOCKING_PATTERN = /\bfor\s+(?:no\s+key\s+update|key\s+share|share|update)\b/i;

export const normalizeAssistantSql = (rawSql: string): string => {
  const trimmed = rawSql.trim();
  const withoutTrailingSemicolon = trimmed.endsWith(";")
    ? trimmed.slice(0, -1).trim()
    : trimmed;
  if (!/^(?:select|with)\b/i.test(withoutTrailingSemicolon)) {
    throw httpError(400, "INVALID_PAYLOAD", "Seules les requetes SELECT ou WITH sont autorisees.");
  }
  if (withoutTrailingSemicolon.includes(";") || /--|\/\*/.test(withoutTrailingSemicolon)) {
    throw httpError(400, "INVALID_PAYLOAD", "Une seule instruction SQL sans commentaire est autorisee.");
  }
  if (FORBIDDEN_SQL_PATTERN.test(withoutTrailingSemicolon)) {
    throw httpError(403, "AUTH_FORBIDDEN", "Ce schema SQL n est pas accessible a l assistant.");
  }
  if (FORBIDDEN_RELATION_PATTERN.test(withoutTrailingSemicolon)) {
    throw httpError(403, "AUTH_FORBIDDEN", "Cette table contient des secrets et n est pas accessible a l assistant.");
  }
  if (FORBIDDEN_FUNCTION_PATTERN.test(withoutTrailingSemicolon)) {
    throw httpError(403, "AUTH_FORBIDDEN", "Cette fonction SQL n est pas autorisee.");
  }
  if (LOCKING_PATTERN.test(withoutTrailingSemicolon)) {
    throw httpError(400, "INVALID_PAYLOAD", "Les verrous de lignes ne sont pas autorises.");
  }
  return withoutTrailingSemicolon;
};

type CatalogRow = {
  name: string;
  description: string | null;
  column_names: string[];
};

const getDatabaseCatalog = async (
  db: DbClient,
  authContext: AuthContext,
) => await runAuthenticatedReadOnly(db, authContext, async (tx) => {
  const rows = await tx.execute<CatalogRow>(sql`
    select
      columns.table_name::text as name,
      obj_description((quote_ident(columns.table_schema) || '.' || quote_ident(columns.table_name))::regclass, 'pg_class') as description,
      array_agg(columns.column_name::text order by columns.ordinal_position) as column_names
    from information_schema.columns columns
    join information_schema.tables tables
      on tables.table_schema = columns.table_schema
     and tables.table_name = columns.table_name
    where columns.table_schema = 'public'
      and tables.table_type = 'BASE TABLE'
      and columns.table_name <> 'ai_provider_configs'
      and has_table_privilege(
        current_user,
        quote_ident(columns.table_schema) || '.' || quote_ident(columns.table_name),
        'SELECT'
      )
    group by columns.table_schema, columns.table_name
    order by columns.table_name
  `);
  return databaseCatalogOutputSchema.parse({
    ok: true,
    total: rows.length,
    tables: rows,
  });
});

type ColumnRow = {
  table_name: string;
  table_description: string | null;
  name: string;
  data_type: string;
  nullable: boolean;
  description: string | null;
};

type ForeignKeyRow = {
  table_name: string;
  column: string;
  referenced_table: string;
  referenced_column: string;
};

const describeDatabaseTables = async (
  db: DbClient,
  authContext: AuthContext,
  tableNames: string[],
) => await runAuthenticatedReadOnly(db, authContext, async (tx) => {
  const tableList = sql.join(tableNames.map((name) => sql`${name}`), sql`, `);
  const columns = await tx.execute<ColumnRow>(sql`
    select
      columns.table_name::text,
      obj_description((quote_ident(columns.table_schema) || '.' || quote_ident(columns.table_name))::regclass, 'pg_class') as table_description,
      columns.column_name::text as name,
      columns.data_type::text,
      (columns.is_nullable = 'YES') as nullable,
      col_description(
        (quote_ident(columns.table_schema) || '.' || quote_ident(columns.table_name))::regclass,
        columns.ordinal_position
      ) as description
    from information_schema.columns columns
    join information_schema.tables tables
      on tables.table_schema = columns.table_schema
     and tables.table_name = columns.table_name
    where columns.table_schema = 'public'
      and tables.table_type = 'BASE TABLE'
      and columns.table_name in (${tableList})
      and columns.table_name <> 'ai_provider_configs'
      and has_table_privilege(
        current_user,
        quote_ident(columns.table_schema) || '.' || quote_ident(columns.table_name),
        'SELECT'
      )
    order by columns.table_name, columns.ordinal_position
  `);
  const foreignKeys = await tx.execute<ForeignKeyRow>(sql`
    select
      key_usage.table_name::text,
      key_usage.column_name::text as column,
      constraint_usage.table_name::text as referenced_table,
      constraint_usage.column_name::text as referenced_column
    from information_schema.table_constraints constraints
    join information_schema.key_column_usage key_usage
      on key_usage.constraint_schema = constraints.constraint_schema
     and key_usage.constraint_name = constraints.constraint_name
    join information_schema.constraint_column_usage constraint_usage
      on constraint_usage.constraint_schema = constraints.constraint_schema
     and constraint_usage.constraint_name = constraints.constraint_name
    where constraints.constraint_type = 'FOREIGN KEY'
      and constraints.table_schema = 'public'
      and key_usage.table_name in (${tableList})
    order by key_usage.table_name, key_usage.ordinal_position
  `);
  const tables = tableNames.map((name) => {
    const tableColumns = columns.filter((column) => column.table_name === name);
    return {
      name,
      description: tableColumns[0]?.table_description ?? null,
      columns: tableColumns.map(({ table_name: _table, table_description: _description, ...column }) => column),
      foreign_keys: foreignKeys
        .filter((foreignKey) => foreignKey.table_name === name)
        .map(({ table_name: _table, ...foreignKey }) => foreignKey),
    };
  }).filter((table) => table.columns.length > 0);
  return databaseDescribeOutputSchema.parse({ ok: true, tables });
});

const toJsonRows = (value: unknown[]): Array<Record<string, z.infer<typeof z.json>>> =>
  JSON.parse(JSON.stringify(value)) as Array<Record<string, z.infer<typeof z.json>>>;

export const executeDatabaseSql = async (
  db: DbClient,
  authContext: AuthContext,
  rawSql: string,
) => {
  const normalizedSql = normalizeAssistantSql(rawSql);
  const started = performance.now();
  return await runAuthenticatedReadOnly(db, authContext, async (tx) => {
    const result = await tx.execute<Record<string, unknown>>(
      sql.raw(`select * from (${normalizedSql}) as ai_result limit ${MAX_SQL_ROWS + 1}`),
    );
    const rows = toJsonRows(result);
    const boundedRows = rows.slice(0, MAX_SQL_ROWS);
    return databaseSqlOutputSchema.parse({
      ok: true,
      sql: normalizedSql,
      columns: boundedRows[0] ? Object.keys(boundedRows[0]) : [],
      rows: boundedRows,
      truncated: rows.length > MAX_SQL_ROWS,
      execution_ms: Math.max(0, Math.round(performance.now() - started)),
    });
  });
};

export const assistantSqlTools = [
  {
    name: "get_database_catalog",
    version: "1.0" as const,
    description:
      "Liste toutes les tables public lisibles par l utilisateur et leurs noms de colonnes. Appeler cet outil avant de concevoir une requete SQL sur un domaine inconnu.",
    inputSchema: databaseCatalogInputSchema,
    outputSchema: databaseCatalogOutputSchema,
    parameters: parametersFor(databaseCatalogInputSchema),
    async run(db: DbClient, authContext: AuthContext) {
      return await getDatabaseCatalog(db, authContext);
    },
  },
  {
    name: "describe_database_tables",
    version: "1.0" as const,
    description:
      "Decrit precisement les colonnes et cles etrangeres de 1 a 8 tables lisibles. Appeler cet outil avant d ecrire le SQL final.",
    inputSchema: databaseDescribeInputSchema,
    outputSchema: databaseDescribeOutputSchema,
    parameters: parametersFor(databaseDescribeInputSchema),
    async run(db: DbClient, authContext: AuthContext, _requestId: string, args: Record<string, unknown>) {
      const input = databaseDescribeInputSchema.parse(args);
      return await describeDatabaseTables(db, authContext, input.tables);
    },
  },
  {
    name: "execute_readonly_sql",
    version: "1.0" as const,
    description:
      "Execute une unique requete PostgreSQL SELECT/WITH concue par l assistant. Execution sous le role authenticated de l utilisateur, avec RLS, transaction READ ONLY, timeout 5 s et maximum 50 lignes. Utiliser des agregats SQL pour les comptages exhaustifs.",
    inputSchema: databaseSqlInputSchema,
    outputSchema: databaseSqlOutputSchema,
    parameters: parametersFor(databaseSqlInputSchema),
    async run(db: DbClient, authContext: AuthContext, _requestId: string, args: Record<string, unknown>) {
      const input = databaseSqlInputSchema.parse(args);
      return await executeDatabaseSql(db, authContext, input.sql);
    },
  },
] as const satisfies readonly AssistantTool[];
