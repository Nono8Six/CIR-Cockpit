import { test } from "vitest";
import { assertEquals, assertRejects } from '#test/assert';

import { changePasswordInputSchema, dataProfilePayloadSchema } from '../../../../shared/schemas/system/data.schema.ts';
import type { AuthContext, AuthenticatedDbAccess, DbClient } from '../../types.ts';
import { changePassword, handleDataProfileAction } from './dataProfile.ts';

const authContext: AuthContext = {
  userId: 'user-1',
  role: 'tcs',
  agencyIds: ['agency-1'],
  activeAgencyId: 'agency-1',
  isSuperAdmin: false,
  mustChangePassword: true
};

const privilegedAccess = (db: DbClient): AuthenticatedDbAccess => ({
  withUserTransaction: () => Promise.reject(new Error('unexpected user transaction')),
  withPrivilegedTransaction: (action) => action(db)
});

const readCode = (value: unknown): string | undefined => {
  if (!value || typeof value !== 'object') {
    return undefined;
  }
  const candidate = Reflect.get(value, 'code');
  return typeof candidate === 'string' ? candidate : undefined;
};

test('changePassword updates Supabase Auth before clearing must_change_password', async () => {
  const calls: string[] = [];
  let authComplete = false;

  const db = {
    update: () => ({
      set: () => ({
        where: () => ({
          returning: () => {
            calls.push('profile');
            return Promise.resolve([{ id: 'user-1' }]);
          }
        })
      })
    })
  } as unknown as DbClient;

  const response = await changePassword(
    {
      withUserTransaction: () => Promise.reject(new Error('unexpected user transaction')),
      withPrivilegedTransaction: (action) => {
        assertEquals(authComplete, true, 'No database transaction may span the Auth call');
        calls.push('transaction');
        return action(db);
      }
    },
    authContext,
    'req-1',
    { password: 'Password123!' },
    {
      updatePassword: (_userId, _password) => {
        calls.push('auth');
        authComplete = true;
        return Promise.resolve();
      }
    }
  );

  assertEquals(response.ok, true);
  assertEquals(calls, ['auth', 'transaction', 'profile']);
});

test('changePassword fails closed when the profile flag cannot be cleared', async () => {
  const db = {
    update: () => ({
      set: () => ({
        where: () => ({
          returning: () => Promise.resolve([])
        })
      })
    })
  } as unknown as DbClient;

  const error = await assertRejects(() => changePassword(
    privilegedAccess(db),
    authContext,
    'req-profile-failed',
    { password: 'Password123!' },
    { updatePassword: () => Promise.resolve() }
  ));

  assertEquals(readCode(error), 'PROFILE_UPDATE_FAILED');
});

test('handleDataProfileAction updates active agency when agency is accessible', async () => {
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

test('handleDataProfileAction clears active agency when agency is null', async () => {
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

test('handleDataProfileAction rejects cross-agency active agency updates', async () => {
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

test('handleDataProfileAction throws PROFILE_UPDATE_FAILED on db errors', async () => {
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
        { action: 'set_active_agency', agency_id: 'agency-1' },
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
      { action: 'set_active_agency', agency_id: 'agency-1' },
      {
        ensureRateLimit: () => Promise.resolve()
      }
    );
  } catch (error) {
    assertEquals(readCode(error), 'PROFILE_UPDATE_FAILED');
  }
});

test('profile contracts reject the old client declaration and accept the dedicated password input', () => {
  assertEquals(dataProfilePayloadSchema.safeParse({ action: 'password_changed' }).success, false);
  assertEquals(changePasswordInputSchema.safeParse({ password: 'Password123!' }).success, true);
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
