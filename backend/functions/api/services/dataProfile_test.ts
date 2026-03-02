import { assertEquals, assertRejects } from 'std/assert';

import { dataProfilePayloadSchema } from '../../../../shared/schemas/data.schema.ts';
import type { AuthContext, DbClient } from '../types.ts';
import { handleDataProfileAction } from './dataProfile.ts';

const authContext: AuthContext = {
  userId: 'user-1',
  role: 'tcs',
  agencyIds: ['agency-1'],
  isSuperAdmin: false
};

const readCode = (value: unknown): string | undefined => {
  if (!value || typeof value !== 'object') {
    return undefined;
  }
  const candidate = Reflect.get(value, 'code');
  return typeof candidate === 'string' ? candidate : undefined;
};

Deno.test('handleDataProfileAction updates must_change_password on password_changed', async () => {
  let whereCalled = 0;

  const db = {
    update: () => ({
      set: () => ({
        where: () => {
          whereCalled += 1;
          return Promise.resolve();
        }
      })
    })
  } as unknown as DbClient;

  const response = await handleDataProfileAction(
    db,
    authContext,
    'req-1',
    { action: 'password_changed' },
    {
      ensureRateLimit: () => Promise.resolve()
    }
  );

  assertEquals(response.ok, true);
  assertEquals(whereCalled, 1);
});

Deno.test('handleDataProfileAction throws PROFILE_UPDATE_FAILED on db errors', async () => {
  const db = {
    update: () => ({
      set: () => ({
        where: () => Promise.reject(new Error('db failed'))
      })
    })
  } as unknown as DbClient;

  await assertRejects(
    async () => {
      await handleDataProfileAction(
        db,
        authContext,
        'req-2',
        { action: 'password_changed' },
        {
          ensureRateLimit: () => Promise.resolve()
        }
      );
    },
    Error,
    'Impossible de mettre a jour le profil.'
  );

  try {
    await handleDataProfileAction(
      db,
      authContext,
      'req-3',
      { action: 'password_changed' },
      {
        ensureRateLimit: () => Promise.resolve()
      }
    );
  } catch (error) {
    assertEquals(readCode(error), 'PROFILE_UPDATE_FAILED');
  }
});

Deno.test('dataProfilePayloadSchema rejects unsupported get action', () => {
  const parsed = dataProfilePayloadSchema.safeParse({ action: 'get' });
  assertEquals(parsed.success, false);
});
