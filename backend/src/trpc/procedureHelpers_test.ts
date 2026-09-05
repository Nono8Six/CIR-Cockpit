import { test } from 'vitest';
import { assertEquals, assertRejects } from '#test/assert';

import type { AuthContext, DbClient } from '../types.ts';
import {
  runPrivilegedTransaction,
  runUserTransaction,
  withAuthedNoDbHandler
} from './procedureHelpers.ts';

const actorId = '11111111-1111-4111-8111-111111111111';
const authContext: AuthContext = {
  userId: actorId,
  role: 'tcs',
  agencyIds: [],
  activeAgencyId: null,
  isSuperAdmin: false,
  mustChangePassword: false
};

const readSqlText = (value: unknown): string => {
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) return value.map(readSqlText).join('');
  if (!value || typeof value !== 'object') return '';
  const queryChunks = Reflect.get(value, 'queryChunks');
  if (Array.isArray(queryChunks)) return readSqlText(queryChunks);
  const chunkValue = Reflect.get(value, 'value');
  return Array.isArray(chunkValue) ? readSqlText(chunkValue) : '';
};

const createTransactionDb = (events: string[]): DbClient => {
  const tx = {
    execute: (query: unknown) => {
      events.push(readSqlText(query));
      return Promise.resolve([]);
    }
  } as unknown as DbClient;

  return {
    transaction: async <T>(action: (transaction: DbClient) => Promise<T>) => {
      events.push('begin');
      try {
        const result = await action(tx);
        events.push('commit');
        return result;
      } catch (error) {
        events.push('rollback');
        throw error;
      }
    }
  } as unknown as DbClient;
};

test('user transaction configures actor, role and claims before the handler', async () => {
  const events: string[] = [];
  const result = await runUserTransaction(
    createTransactionDb(events),
    actorId,
    async () => {
      events.push('handler');
      return 'ok';
    }
  );

  assertEquals(result, 'ok');
  assertEquals(events.length, 6);
  assertEquals(events[0], 'begin');
  assertEquals(events[1].includes('private.set_audit_actor'), true);
  assertEquals(events[2].includes('set local role authenticated'), true);
  assertEquals(events[3].includes('request.jwt.claims'), true);
  assertEquals(events[4], 'handler');
  assertEquals(events[5], 'commit');
});

test('user transaction rolls back when the handler fails', async () => {
  const events: string[] = [];
  await assertRejects(() => runUserTransaction(
    createTransactionDb(events),
    actorId,
    () => Promise.reject(new Error('handler failed'))
  ));

  assertEquals(events.at(-1), 'rollback');
  assertEquals(events.includes('commit'), false);
});

test('privileged transaction sets the actor without changing role', async () => {
  const events: string[] = [];
  await runPrivilegedTransaction(createTransactionDb(events), actorId, async () => {
    events.push('handler');
  });

  assertEquals(events[1].includes('private.set_audit_actor'), true);
  assertEquals(events.some((event) => event.includes('set local role')), false);
  assertEquals(events, [events[0], events[1], 'handler', 'commit']);
});

test('authenticated no-DB handler opens no transaction', async () => {
  const handler = withAuthedNoDbHandler(async (auth, requestId, input: string) => ({
    userId: auth.userId,
    requestId,
    input
  }));

  const result = await handler({
    ctx: {
      req: new Request('http://localhost/trpc'),
      resHeaders: new Headers(),
      requestId: 'req-no-db',
      authContext
    },
    input: 'company-search'
  });

  assertEquals(result, {
    userId: actorId,
    requestId: 'req-no-db',
    input: 'company-search'
  });
});
