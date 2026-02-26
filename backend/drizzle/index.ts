import { drizzle, type PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

import { getSupabaseDbUrl } from './config.ts';
import { drizzleSchema } from './schema.ts';

type DrizzleSchema = typeof drizzleSchema;
type DrizzleSqlClient = postgres.Sql<Record<string, unknown>>;

let sqlClient: DrizzleSqlClient | null = null;
let sqlClientKey = '';
let drizzleDb: PostgresJsDatabase<DrizzleSchema> | null = null;
let drizzleDbKey = '';

const buildSqlClient = (connectionString: string): DrizzleSqlClient => {
  return postgres(connectionString, { prepare: false });
};

export type DbClient = PostgresJsDatabase<DrizzleSchema>;

export const getDbClient = (): DbClient | null => {
  const connectionString = getSupabaseDbUrl();
  if (!connectionString) {
    return null;
  }

  if (!sqlClient || sqlClientKey !== connectionString) {
    sqlClient = buildSqlClient(connectionString);
    sqlClientKey = connectionString;
  }

  if (!drizzleDb || drizzleDbKey !== connectionString) {
    drizzleDb = drizzle(sqlClient, { schema: drizzleSchema });
    drizzleDbKey = connectionString;
  }

  return drizzleDb;
};

export const resetDbClientForTests = async (): Promise<void> => {
  if (sqlClient) {
    await sqlClient.end({ timeout: 0 });
  }
  sqlClient = null;
  sqlClientKey = '';
  drizzleDb = null;
  drizzleDbKey = '';
};

