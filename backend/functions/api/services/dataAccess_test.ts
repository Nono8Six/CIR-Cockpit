import { assertEquals, assertThrows } from 'std/assert';

import type { AuthContext } from '../types.ts';
import { ensureAgencyAccess, ensureOptionalAgencyAccess } from './dataAccess.ts';

const memberContext: AuthContext = {
  userId: 'user-1',
  role: 'tcs',
  agencyIds: ['agency-a', 'agency-b'],
  isSuperAdmin: false
};

const superAdminContext: AuthContext = {
  userId: 'admin-1',
  role: 'super_admin',
  agencyIds: [],
  isSuperAdmin: true
};

const readStatus = (value: unknown): number | undefined => {
  if (!value || typeof value !== 'object') {
    return undefined;
  }
  const candidate = Reflect.get(value, 'status');
  return typeof candidate === 'number' ? candidate : undefined;
};

Deno.test('ensureAgencyAccess returns normalized agency id for member users', () => {
  const agencyId = ensureAgencyAccess(memberContext, ' agency-a ');
  assertEquals(agencyId, 'agency-a');
});

Deno.test('ensureAgencyAccess allows super admin even without memberships', () => {
  const agencyId = ensureAgencyAccess(superAdminContext, 'agency-z');
  assertEquals(agencyId, 'agency-z');
});

Deno.test('ensureAgencyAccess rejects unknown agencies for member users', () => {
  const error = assertThrows(() => ensureAgencyAccess(memberContext, 'agency-z'));
  assertEquals(readStatus(error), 403);
});

Deno.test('ensureAgencyAccess rejects empty agency ids', () => {
  const error = assertThrows(() => ensureAgencyAccess(memberContext, '   '));
  assertEquals(readStatus(error), 400);
});

Deno.test('ensureOptionalAgencyAccess allows null agency only for super admin', () => {
  const agencyId = ensureOptionalAgencyAccess(superAdminContext, null);
  assertEquals(agencyId, null);
});

Deno.test('ensureOptionalAgencyAccess rejects null agency for non super admin', () => {
  const error = assertThrows(() => ensureOptionalAgencyAccess(memberContext, null));
  assertEquals(readStatus(error), 403);
});
