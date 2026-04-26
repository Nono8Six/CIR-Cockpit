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

Deno.test('handleDataProfileAction updates active agency when agency is accessible', async () => {
  let setPayload: unknown;

  const db = {
    update: () => ({
      set: (payload: unknown) => {
        setPayload = payload;
        return {
          where: () => Promise.resolve()
        };
      }
    })
  } as unknown as DbClient;

  const response = await handleDataProfileAction(
    db,
    authContext,
    'req-agency',
    { action: 'set_active_agency', agency_id: 'agency-1' },
    {
      ensureRateLimit: () => Promise.resolve()
    }
  );

  assertEquals(response.ok, true);
  assertEquals(setPayload, { active_agency_id: 'agency-1' });
});

Deno.test('handleDataProfileAction clears active agency when agency is null', async () => {
  let setPayload: unknown;

  const db = {
    update: () => ({
      set: (payload: unknown) => {
        setPayload = payload;
        return {
          where: () => Promise.resolve()
        };
      }
    })
  } as unknown as DbClient;

  const response = await handleDataProfileAction(
    db,
    authContext,
    'req-agency-null',
    { action: 'set_active_agency', agency_id: null },
    {
      ensureRateLimit: () => Promise.resolve()
    }
  );

  assertEquals(response.ok, true);
  assertEquals(setPayload, { active_agency_id: null });
});

Deno.test('handleDataProfileAction rejects cross-agency active agency updates', async () => {
  const db = {
    update: () => ({
      set: () => ({
        where: () => Promise.resolve()
      })
    })
  } as unknown as DbClient;

  await assertRejects(
    async () => {
      await handleDataProfileAction(
        db,
        authContext,
        'req-agency-forbidden',
        { action: 'set_active_agency', agency_id: 'agency-2' },
        {
          ensureRateLimit: () => Promise.resolve()
        }
      );
    },
    Error,
    'Acces interdit.'
  );
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

Deno.test('dataProfilePayloadSchema supports profile write actions and rejects unsupported get action', () => {
  assertEquals(dataProfilePayloadSchema.safeParse({ action: 'password_changed' }).success, true);
  assertEquals(dataProfilePayloadSchema.safeParse({
    action: 'set_active_agency',
    agency_id: '11111111-1111-4111-8111-111111111111'
  }).success, true);
  assertEquals(dataProfilePayloadSchema.safeParse({
    action: 'set_active_agency',
    agency_id: null
  }).success, true);
  const parsed = dataProfilePayloadSchema.safeParse({ action: 'get' });
  assertEquals(parsed.success, false);
});
