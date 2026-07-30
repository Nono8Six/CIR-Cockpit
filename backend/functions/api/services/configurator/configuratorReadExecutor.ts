import postgres from 'postgres';

import { getSupabaseDbUrl } from '../../../../drizzle/config.ts';
import type { AuthContext } from '../../types.ts';
import { mapConfiguratorReadError } from './configuratorErrors.ts';

const STATEMENT_TIMEOUT_MS = 5_000;
const LOCK_TIMEOUT_MS = 1_000;
const EXPLICIT_SEARCH_PATH = 'pg_catalog, configurator, private, auth, public';

type ConfiguratorRow = Record<string, unknown>;

export type ConfiguratorReadTransaction = <
  TRow extends ConfiguratorRow = ConfiguratorRow
>(
  strings: TemplateStringsArray,
  ...values: unknown[]
) => Promise<TRow[]>;

type BeginTransaction = <T>(
  handler: (transaction: ConfiguratorReadTransaction) => Promise<T>
) => Promise<T>;

type ConfiguratorReadExecutorDependencies = {
  begin: BeginTransaction;
};

export type ConfiguratorReadOperation<T> = (
  transaction: ConfiguratorReadTransaction
) => Promise<T>;

let rootSql: ReturnType<typeof postgres> | null = null;
let rootSqlKey = '';

const getRootSql = (): ReturnType<typeof postgres> => {
  const connectionString = getSupabaseDbUrl();
  if (!connectionString) {
    throw mapConfiguratorReadError({ code: 'CONFIG_MISSING' });
  }

  if (!rootSql || rootSqlKey !== connectionString) {
    rootSql = postgres(connectionString, {
      prepare: false,
      max: 1,
      idle_timeout: 20,
      connect_timeout: 10,
      max_lifetime: 60 * 30,
      onnotice: () => {}
    });
    rootSqlKey = connectionString;
  }
  return rootSql;
};

const beginTransaction: BeginTransaction = async <T>(
  handler: (transaction: ConfiguratorReadTransaction) => Promise<T>
): Promise<T> => {
  const sql = getRootSql();
  const begin = sql.begin as unknown as (
    callback: (transaction: ConfiguratorReadTransaction) => Promise<T>
  ) => Promise<T>;
  return await begin(handler);
};

const buildJwtClaims = (authContext: AuthContext): string => JSON.stringify({
  sub: authContext.userId,
  role: 'authenticated',
  app_metadata: {
    cir_role: authContext.role,
    agency_ids: authContext.agencyIds,
    active_agency_id: authContext.activeAgencyId,
    is_super_admin: authContext.isSuperAdmin
  }
});

export const createConfiguratorReadExecutor = (
  dependencies: ConfiguratorReadExecutorDependencies
) => async <T>(
  authContext: AuthContext,
  operation: ConfiguratorReadOperation<T>
): Promise<T> => {
  try {
    return await dependencies.begin(async (transaction) => {
      await transaction`set transaction read only`;
      await transaction`set local role authenticated`;
      await transaction`select set_config('request.jwt.claims', ${buildJwtClaims(authContext)}, true)`;
      await transaction`set local statement_timeout = '5s'`;
      await transaction`set local lock_timeout = '1s'`;
      await transaction`set local search_path = pg_catalog, configurator, private, auth, public`;
      return await operation(transaction);
    });
  } catch (error) {
    throw mapConfiguratorReadError(error);
  }
};

export const runConfiguratorReadOnly = createConfiguratorReadExecutor({
  begin: beginTransaction
});

export const CONFIGURATOR_READ_TRANSACTION_LIMITS = Object.freeze({
  statement_timeout_ms: STATEMENT_TIMEOUT_MS,
  lock_timeout_ms: LOCK_TIMEOUT_MS,
  search_path: EXPLICIT_SEARCH_PATH
});

export const resetConfiguratorReadExecutorForTests = async (): Promise<void> => {
  if (rootSql) {
    await rootSql.end({ timeout: 0 });
  }
  rootSql = null;
  rootSqlKey = '';
};
