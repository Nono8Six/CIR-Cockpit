import { test } from "vitest";
import { assertEquals, assertThrows } from '#test/assert';

import type { AuthContext } from '../../types.ts';
import { ensureAgencyAccess, ensureOptionalAgencyAccess } from './dataAccess.ts';

const memberContext: AuthContext = {
  userId: 'user-1',
  role: 'tcs',
  agencyIds: ['agency-a', 'agency-b'],
  activeAgencyId: 'agency-a',
  isSuperAdmin: false
};

const superAdminContext: AuthContext = {
  userId: 'admin-1',
  role: 'super_admin',
  agencyIds: [],
  activeAgencyId: null,
  isSuperAdmin: true
};

const readStatus = (value: unknown): number | undefined => {
  if (!value || typeof value !== 'object') {
    return undefined;
  }
  const candidate = Reflect.get(value, 'status');
  return typeof candidate === 'number' ? candidate : undefined;
};

const readCode = (value: unknown): string | undefined => {
  if (!value || typeof value !== 'object') {
    return undefined;
  }
  const candidate = Reflect.get(value, 'code');
  return typeof candidate === 'string' ? candidate : undefined;
};

test('ensureAgencyAccess returns normalized agency id for member users', () => {
  const agencyId = ensureAgencyAccess(memberContext, ' agency-a ');
  assertEquals(agencyId, 'agency-a');
});

test('ensureAgencyAccess allows super admin even without memberships', () => {
  const agencyId = ensureAgencyAccess(superAdminContext, 'agency-z');
  assertEquals(agencyId, 'agency-z');
});

test('ensureAgencyAccess rejects cross-agency access for member users', () => {
  const error = assertThrows(() => ensureAgencyAccess(memberContext, 'agency-z'));
  assertEquals(readStatus(error), 403);
  assertEquals(readCode(error), 'AUTH_FORBIDDEN');
});

test('ensureAgencyAccess rejects empty agency ids', () => {
  const error = assertThrows(() => ensureAgencyAccess(memberContext, '   '));
  assertEquals(readStatus(error), 400);
});

test('ensureOptionalAgencyAccess allows null agency only for super admin', () => {
  const agencyId = ensureOptionalAgencyAccess(superAdminContext, null);
  assertEquals(agencyId, null);
});

test('ensureOptionalAgencyAccess rejects null agency for non super admin', () => {
  const error = assertThrows(() => ensureOptionalAgencyAccess(memberContext, null));
  assertEquals(readStatus(error), 403);
});
