import { assertStrictEquals } from 'std/assert';

import {
  cockpitAgencyMembersInputSchema,
  cockpitPhoneLookupInputSchema
} from '../../../../shared/schemas/cockpit.schema.ts';
import { dataEntitiesPayloadSchema } from '../../../../shared/schemas/data.schema.ts';
import type { DbClient } from '../types.ts';
import { selectDataEntitiesDb } from './router.ts';

Deno.test('selectDataEntitiesDb uses userDb for regular data actions', () => {
  const serviceRoleDb = { marker: 'service-role' } as unknown as DbClient;
  const userScopedDb = { marker: 'user-scoped' } as unknown as DbClient;

  const selectedDb = selectDataEntitiesDb({ action: 'save' }, serviceRoleDb, userScopedDb);

  assertStrictEquals(selectedDb, userScopedDb);
});

Deno.test('selectDataEntitiesDb keeps service-role db for reassign', () => {
  const serviceRoleDb = { marker: 'service-role' } as unknown as DbClient;
  const userScopedDb = { marker: 'user-scoped' } as unknown as DbClient;

  const selectedDb = selectDataEntitiesDb({ action: 'reassign' }, serviceRoleDb, userScopedDb);

  assertStrictEquals(selectedDb, serviceRoleDb);
});

Deno.test('selectDataEntitiesDb keeps service-role db for delete', () => {
  const serviceRoleDb = { marker: 'service-role' } as unknown as DbClient;
  const userScopedDb = { marker: 'user-scoped' } as unknown as DbClient;

  const selectedDb = selectDataEntitiesDb({ action: 'delete' }, serviceRoleDb, userScopedDb);

  assertStrictEquals(selectedDb, serviceRoleDb);
});

Deno.test('dataEntitiesPayloadSchema rejects unknown keys', () => {
  const payload = {
    action: 'archive',
    entity_id: '11111111-1111-1111-1111-111111111111',
    archived: true,
    unexpected: 'forbidden'
  };

  const parsed = dataEntitiesPayloadSchema.safeParse(payload);
  assertStrictEquals(parsed.success, false);
});

Deno.test('cockpit schemas validate agency members and phone lookup inputs', () => {
  const agencyId = '11111111-1111-4111-8111-111111111111';

  assertStrictEquals(cockpitAgencyMembersInputSchema.safeParse({ agency_id: agencyId }).success, true);
  assertStrictEquals(cockpitPhoneLookupInputSchema.safeParse({
    agency_id: agencyId,
    phone: '05 56 00 00 00',
    limit: 5
  }).success, true);
  assertStrictEquals(cockpitPhoneLookupInputSchema.safeParse({
    agency_id: agencyId,
    phone: '',
    limit: 5
  }).success, false);
});
