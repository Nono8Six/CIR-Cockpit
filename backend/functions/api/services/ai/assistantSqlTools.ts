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
const ALLOWED_FUNCTIONS = new Set([
  "abs", "array_agg", "avg", "btrim", "ceil", "ceiling", "char_length", "coalesce", "concat", "concat_ws", "count", "date_part", "date_trunc", "extract", "floor", "greatest", "json_agg", "jsonb_agg", "jsonb_array_length", "jsonb_build_array", "jsonb_build_object", "least", "length", "lower", "ltrim", "max", "min", "nullif", "replace", "round", "rtrim", "split_part", "string_agg", "substring", "sum", "to_char", "trim", "upper",
]);

type SqlToken = { kind: "word" | "quoted" | "string" | "number" | "symbol"; value: string };

const tokenizeSql = (value: string): SqlToken[] => {
  const tokens: SqlToken[] = [];
  for (let index = 0; index < value.length;) {
    const char = value[index];
    if (/\s/.test(char)) {
      index += 1;
      continue;
    }
    if (char === "'") {
      let literal = char;
      index += 1;
      let closed = false;
      while (index < value.length) {
        literal += value[index];
        if (value[index] === "'" && value[index + 1] === "'") {
          literal += value[index + 1];
          index += 2;
          continue;
        }
        if (value[index] === "'") {
          index += 1;
          closed = true;
          break;
        }
        index += 1;
      }
      if (!closed) throw httpError(400, "INVALID_PAYLOAD", "Litteral SQL non termine.");
      tokens.push({ kind: "string", value: literal });
      continue;
    }
    if (char === '"') {
      let identifier = "";
      index += 1;
      let closed = false;
      while (index < value.length) {
        if (value[index] === '"' && value[index + 1] === '"') {
          identifier += '"';
          index += 2;
          continue;
        }
        if (value[index] === '"') {
          index += 1;
          closed = true;
          break;
        }
        identifier += value[index];
        index += 1;
      }
      if (!closed) throw httpError(400, "INVALID_PAYLOAD", "Identifiant SQL non termine.");
      tokens.push({ kind: "quoted", value: identifier });
      continue;
    }
    const word = value.slice(index).match(/^[a-z_][a-z0-9_$]*/i)?.[0];
    if (word) {
      tokens.push({ kind: "word", value: word });
      index += word.length;
      continue;
    }
    const number = value.slice(index).match(/^\d+(?:\.\d+)?/)?.[0];
    if (number) {
      tokens.push({ kind: "number", value: number });
      index += number.length;
      continue;
    }
    const operator = value.slice(index).match(/^(?:::|<=|>=|<>|!=|->>|->|#>>|#>|\|\||[-+*/%=<>()\[\],.])/)?.[0];
    if (!operator) throw httpError(400, "INVALID_PAYLOAD", "Construction SQL non reconnue.");
    tokens.push({ kind: "symbol", value: operator });
    index += operator.length;
  }
  return tokens;
};

const identifierValue = (token: SqlToken | undefined): string | null =>
  token && (token.kind === "word" || token.kind === "quoted") ? token.value.toLowerCase() : null;

const VERSIONED_TABLES = new Set([
  "pricing_classification_cir",
  "pricing_supplier_segments",
  "pricing_segment_classification_links",
  "pricing_segment_purchase_grids",
  "pricing_reference_anomalies",
]);

export type AssistantSqlSemantics = {
  tables: string[];
  snapshotIds: string[];
  dimensions: string[];
  filters: string[];
};

export const analyzeAssistantSql = (rawSql: string): AssistantSqlSemantics => {
  const sqlText = normalizeAssistantSql(rawSql);
  const tokens = tokenizeSql(sqlText);
  const tables = new Set<string>();
  const snapshotIds = new Set<string>();
  const dimensions = new Set<string>();
  const filters = new Set<string>();
  const ctes = new Set<string>();

  for (let index = 0; index < tokens.length; index += 1) {
    const word = identifierValue(tokens[index]);
    if (word === "with" || (tokens[index - 1]?.value === "," && ctes.size > 0)) {
      const candidate = identifierValue(tokens[index + 1]);
      if (candidate && tokens[index + 2]?.value === "as") ctes.add(candidate);
    }
    if (word !== "from" && word !== "join") continue;
    let cursor = index + 1;
    if (tokens[cursor]?.value === "(") continue;
    let schema: string | null = null;
    let table = identifierValue(tokens[cursor]);
    if (tokens[cursor + 1]?.value === ".") {
      schema = table;
      table = identifierValue(tokens[cursor + 2]);
      cursor += 2;
    }
    if (!table || ctes.has(table)) continue;
    if (schema && schema !== "public") {
      throw httpError(403, "AUTH_FORBIDDEN", "Ce schema SQL n est pas accessible a l assistant.");
    }
    tables.add(table);
  }

  const tableList = [...tables].sort();
  for (let index = 0; index < tokens.length; index += 1) {
    const name = identifierValue(tokens[index]);
    if (!name) continue;
    const qualified = tokens[index + 1]?.value === "." ? identifierValue(tokens[index + 2]) : null;
    const column = qualified ?? name;
    if (column === "snapshot_id") {
      const literal = tokens.slice(index + (qualified ? 3 : 1), index + (qualified ? 8 : 6))
        .find((token) => token.kind === "string")?.value.replaceAll("''", "'").slice(1, -1);
      if (literal) snapshotIds.add(literal.toLowerCase());
    }
    if (["group", "order"].includes(name) && identifierValue(tokens[index + 1]) === "by") {
      const dimension = identifierValue(tokens[index + 2]);
      if (dimension) dimensions.add(dimension);
    }
    if (name === "where" || name === "having" || name === "on") {
      let end = index + 1;
      while (end < tokens.length && !["group", "order", "limit", "offset", "union", "except", "intersect", "join"].includes(identifierValue(tokens[end]) ?? "")) end += 1;
      filters.add(canonicalizeSqlTokens(tokens.slice(index + 1, end)));
    }
    const previousKeyword = [...tokens].slice(0, index).reverse()
      .map(identifierValue).find((candidate) => candidate === "select" || candidate === "from");
    if (previousKeyword === "select" && !SQL_KEYWORDS.has(name) && tokens[index + 1]?.value !== "(" && identifierValue(tokens[index - 1]) !== "as") {
      dimensions.add(name);
    }
  }
  return { tables: tableList, snapshotIds: [...snapshotIds].sort(), dimensions: [...dimensions].sort(), filters: [...filters].sort() };
};

const canonicalizeSqlTokens = (tokens: SqlToken[]): string => tokens.map((token) => {
  if (token.kind === "word") return token.value.toLowerCase();
  if (token.kind === "quoted") return `"${token.value.replaceAll('"', '""')}"`;
  return token.value;
}).join(" ").replace(/\s+([(),.])/g, "$1").replace(/([(,.])\s+/g, "$1");

export const canonicalizeAssistantSql = (rawSql: string): string =>
  canonicalizeSqlTokens(tokenizeSql(normalizeAssistantSql(rawSql)));

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
  const tokens = tokenizeSql(withoutTrailingSemicolon);
  if (tokens.some((token, index) => {
    const functionName = identifierValue(token);
    return functionName && tokens[index + 1]?.value === "(" &&
      !SQL_KEYWORDS.has(functionName) && !ALLOWED_FUNCTIONS.has(functionName);
  })) {
    throw httpError(403, "AUTH_FORBIDDEN", "Cette fonction SQL n est pas autorisee.");
  }
  const forbiddenWrite = tokens.some((token) => token.kind === "word" &&
    ["insert", "update", "delete", "merge", "copy", "call", "do", "create", "alter", "drop", "truncate", "grant", "revoke", "vacuum", "analyze", "refresh", "into"].includes(token.value.toLowerCase()));
  if (forbiddenWrite) {
    throw httpError(400, "INVALID_PAYLOAD", "La requete SQL doit etre strictement en lecture seule.");
  }
  if (/\bpricing_supplier_segments\b/i.test(withoutTrailingSemicolon) && /\bagency_id\b/i.test(withoutTrailingSemicolon)) {
    throw httpError(400, "INVALID_PAYLOAD", "Colonne SQL inconnue: agency_id.");
  }
  return withoutTrailingSemicolon;
};

type CatalogRow = {
  name: string;
  description: string | null;
  column_names: string[];
};

const SQL_KEYWORDS = new Set([
  "all", "and", "any", "as", "asc", "between", "by", "case", "cast", "cross", "desc", "distinct", "else", "end", "except", "exists", "false", "fetch", "filter", "first", "from", "full", "group", "having", "ilike", "in", "inner", "intersect", "interval", "is", "join", "last", "left", "like", "limit", "not", "null", "nulls", "offset", "on", "or", "order", "outer", "over", "partition", "right", "rows", "select", "then", "true", "union", "when", "where", "window", "with",
]);

export const validateAssistantSqlAgainstCatalog = (
  rawSql: string,
  catalog: CatalogRow[],
): AssistantSqlSemantics => {
  const semantics = analyzeAssistantSql(rawSql);
  const catalogByTable = new Map(catalog.map((table) => [table.name.toLowerCase(), new Set(table.column_names.map((column) => column.toLowerCase()))]));
  for (const table of semantics.tables) {
    if (!catalogByTable.has(table)) {
      throw httpError(400, "INVALID_PAYLOAD", `Table SQL inconnue ou non autorisee: ${table}.`);
    }
  }
  const tokens = tokenizeSql(normalizeAssistantSql(rawSql));
  const allowedColumns = new Set(semantics.tables.flatMap((table) => [...(catalogByTable.get(table) ?? [])]));
  const tableNames = new Set(semantics.tables);
  for (let index = 0; index < tokens.length; index += 1) {
    const value = identifierValue(tokens[index]);
    if (!value || SQL_KEYWORDS.has(value) || tableNames.has(value) || value === "public") continue;
    if (identifierValue(tokens[index - 1]) === "with" && identifierValue(tokens[index + 1]) === "as") continue;
    if (tokens[index + 1]?.value === "(" || tokens[index - 1]?.value === "::") continue;
    if (identifierValue(tokens[index - 1]) === "as") continue;
    if ((identifierValue(tokens[index - 1]) === "from" || identifierValue(tokens[index - 1]) === "join") || tokens[index + 1]?.value === ".") continue;
    if (!allowedColumns.has(value)) {
      throw httpError(400, "INVALID_PAYLOAD", `Colonne SQL inconnue: ${value}.`);
    }
  }
  if (tokens.some((token) => identifierValue(token) === "like")) {
    throw httpError(400, "INVALID_PAYLOAD", "Une recherche textuelle exhaustive doit utiliser ILIKE pour etre insensible a la casse.");
  }
  for (const table of semantics.tables) {
    if (VERSIONED_TABLES.has(table) && semantics.snapshotIds.length === 0) {
      throw httpError(400, "INVALID_PAYLOAD", "Un filtre snapshot_id est obligatoire pour cette table versionnee.");
    }
  }
  return semantics;
};

const loadDatabaseCatalog = async (tx: DbTransaction): Promise<CatalogRow[]> =>
  await tx.execute<CatalogRow>(sql`
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
      and has_table_privilege(current_user, quote_ident(columns.table_schema) || '.' || quote_ident(columns.table_name), 'SELECT')
    group by columns.table_schema, columns.table_name
    order by columns.table_name
  `);

const getDatabaseCatalog = async (
  db: DbClient,
  authContext: AuthContext,
) => await runAuthenticatedReadOnly(db, authContext, async (tx) => {
  const rows = await loadDatabaseCatalog(tx);
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
    const catalog = await loadDatabaseCatalog(tx);
    validateAssistantSqlAgainstCatalog(normalizedSql, catalog);
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
      "Execute une unique requete PostgreSQL SELECT/WITH concue par l assistant. Execution sous le role authenticated de l utilisateur, avec RLS, transaction READ ONLY, timeout 5 s et maximum 50 lignes. Ne jamais ajouter de filtre agency_id: l isolation agence est imposee par l identite backend et les RLS. Les tables versionnees exigent snapshot_id. Utiliser ILIKE pour les recherches textuelles exhaustives et des agregats SQL pour les comptages.",
    inputSchema: databaseSqlInputSchema,
    outputSchema: databaseSqlOutputSchema,
    parameters: parametersFor(databaseSqlInputSchema),
    async run(db: DbClient, authContext: AuthContext, _requestId: string, args: Record<string, unknown>) {
      const input = databaseSqlInputSchema.parse(args);
      return await executeDatabaseSql(db, authContext, input.sql);
    },
  },
] as const satisfies readonly AssistantTool[];
