import { assertEquals, assertThrows } from 'std/assert';
import { z } from 'zod/v4';

import { departmentReferenceSchema } from '../../../../shared/schemas/config.schema.ts';
import type { AuthContext } from '../types.ts';
import {
  mapAgencyReferenceStatuses,
  parseStoredJson,
  resolveConfigAgencyId
} from './configSnapshot.ts';

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

const readCode = (value: unknown): string | undefined => {
  if (!value || typeof value !== 'object') {
    return undefined;
  }
  const candidate = Reflect.get(value, 'code');
  return typeof candidate === 'string' ? candidate : undefined;
};

Deno.test('parseStoredJson returns parsed data for valid payloads', () => {
  const value = parseStoredJson(
    { feature_enabled: true },
    z.strictObject({ feature_enabled: z.boolean() }),
    'le snapshot'
  );

  assertEquals(value, { feature_enabled: true });
});

Deno.test('parseStoredJson throws a DB_READ_FAILED app error on invalid payloads', () => {
  const error = assertThrows(() =>
    parseStoredJson(
      { feature_enabled: 'yes' },
      z.strictObject({ feature_enabled: z.boolean() }),
      'le snapshot'
    )
  );

  assertEquals(readStatus(error), 500);
  assertEquals(readCode(error), 'DB_READ_FAILED');
});

Deno.test('resolveConfigAgencyId returns the requested agency for an allowed member', () => {
  const agencyId = resolveConfigAgencyId(memberContext, ' agency-a ');
  assertEquals(agencyId, 'agency-a');
});

Deno.test('resolveConfigAgencyId uses the single membership when no agency id is provided', () => {
  const agencyId = resolveConfigAgencyId(
    {
      ...memberContext,
      agencyIds: ['agency-only']
    },
    undefined
  );

  assertEquals(agencyId, 'agency-only');
});

Deno.test('resolveConfigAgencyId returns null for a super admin without target agency', () => {
  assertEquals(resolveConfigAgencyId(superAdminContext, undefined), null);
});

Deno.test('resolveConfigAgencyId rejects missing agency ids for multi-agency non super admins', () => {
  const error = assertThrows(() => resolveConfigAgencyId(memberContext, undefined));
  assertEquals(readStatus(error), 400);
  assertEquals(readCode(error), 'AGENCY_ID_INVALID');
});

Deno.test('mapAgencyReferenceStatuses keeps valid categories', () => {
  const statuses = mapAgencyReferenceStatuses([
    {
      id: 'status-1',
      agency_id: 'agency-1',
      label: 'Nouveau',
      category: 'todo',
      is_default: true,
      is_terminal: false,
      sort_order: 1
    }
  ]);

  assertEquals(statuses[0]?.category, 'todo');
});

Deno.test('mapAgencyReferenceStatuses throws when the stored category is invalid', () => {
  const error = assertThrows(() =>
    mapAgencyReferenceStatuses([
      {
        id: 'status-1',
        agency_id: 'agency-1',
        label: 'Invalide',
        category: 'broken',
        is_default: true,
        is_terminal: false,
        sort_order: 1
      }
    ])
  );

  assertEquals(readStatus(error), 500);
  assertEquals(readCode(error), 'DB_READ_FAILED');
});

Deno.test('departmentReferenceSchema accepts Corsica department codes', () => {
  const corsicaDepartments = [
    { code: '2A', label: 'Corse-du-Sud', sort_order: 29, is_active: true },
    { code: '2B', label: 'Haute-Corse', sort_order: 30, is_active: true }
  ];

  assertEquals(
    corsicaDepartments.every((department) =>
      departmentReferenceSchema.safeParse(department).success
    ),
    true
  );
});
