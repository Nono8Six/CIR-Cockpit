import {
  assertEquals,
  assertRejects
} from 'std/assert';

import type { AuthContext } from '../../types.ts';
import {
  CONFIGURATOR_READ_TRANSACTION_LIMITS,
  createConfiguratorReadExecutor,
  type ConfiguratorReadTransaction
} from './configuratorReadExecutor.ts';

const authContext: AuthContext = {
  userId: '11111111-1111-4111-8111-111111111111',
  role: 'tcs',
  agencyIds: ['22222222-2222-4222-8222-222222222222'],
  activeAgencyId: '22222222-2222-4222-8222-222222222222',
  isSuperAdmin: false
};

type CapturedStatement = {
  text: string;
  values: unknown[];
};

const createCapturingTransaction = (statements: CapturedStatement[]) => {
  const transaction = (
    strings: TemplateStringsArray,
    ...values: unknown[]
  ): Promise<Record<string, unknown>[]> => {
    statements.push({
      text: strings.join('$').replace(/\s+/g, ' ').trim(),
      values
    });
    return Promise.resolve([]);
  };
  return transaction as ConfiguratorReadTransaction;
};

Deno.test('configurator read executor applies the security envelope before the service', async () => {
  const statements: CapturedStatement[] = [];
  const transaction = createCapturingTransaction(statements);
  const execute = createConfiguratorReadExecutor({
    begin: (handler) => handler(transaction)
  });

  const result = await execute(authContext, async (serviceTransaction) => {
    assertEquals(serviceTransaction, transaction);
    assertEquals(Reflect.get(serviceTransaction, 'begin'), undefined);
    assertEquals(Reflect.get(serviceTransaction, 'end'), undefined);
    await serviceTransaction`select 1 as allowed`;
    return 'ok';
  });

  assertEquals(result, 'ok');
  assertEquals(statements.map((statement) => statement.text), [
    'set transaction read only',
    'set local role authenticated',
    "select set_config('request.jwt.claims', $, true)",
    "set local statement_timeout = '5s'",
    "set local lock_timeout = '1s'",
    'set local search_path = pg_catalog, configurator, private, auth, public',
    'select 1 as allowed'
  ]);

  const claims = JSON.parse(String(statements[2].values[0])) as Record<string, unknown>;
  assertEquals(claims, {
    sub: authContext.userId,
    role: 'authenticated',
    app_metadata: {
      cir_role: 'tcs',
      agency_ids: authContext.agencyIds,
      active_agency_id: authContext.activeAgencyId,
      is_super_admin: false
    }
  });
  assertEquals(CONFIGURATOR_READ_TRANSACTION_LIMITS, {
    statement_timeout_ms: 5_000,
    lock_timeout_ms: 1_000,
    search_path: 'pg_catalog, configurator, private, auth, public'
  });
});

Deno.test('configurator read executor maps database timeouts to the CIR catalog', async () => {
  const execute = createConfiguratorReadExecutor({
    begin: () => Promise.reject(Object.assign(new Error('private SQL diagnostics'), {
      code: '57014'
    }))
  });

  const error = await assertRejects(
    () => execute(authContext, () => Promise.resolve(null)),
    Error
  );

  assertEquals(Reflect.get(error, 'status'), 504);
  assertEquals(Reflect.get(error, 'code'), 'CONFIGURATOR_DB_TIMEOUT');
  assertEquals((Reflect.get(error, 'cause') as { code?: string }).code, '57014');
});

Deno.test('configurator read executor maps unknown database failures without public details', async () => {
  const execute = createConfiguratorReadExecutor({
    begin: () => Promise.reject(Object.assign(new Error('select secret from private.table'), {
      code: 'XX000',
      detail: 'Bearer private-token'
    }))
  });

  const error = await assertRejects(
    () => execute(authContext, () => Promise.resolve(null)),
    Error
  );

  assertEquals(Reflect.get(error, 'status'), 500);
  assertEquals(Reflect.get(error, 'code'), 'CONFIGURATOR_DB_READ_FAILED');
  assertEquals(Reflect.get(error, 'details'), undefined);
});
