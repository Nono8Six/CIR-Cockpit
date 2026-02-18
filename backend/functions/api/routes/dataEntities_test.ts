import { assertStrictEquals } from 'std/assert';

import type { DbClient } from '../types.ts';
import { selectDataEntitiesDb } from './dataEntities.ts';

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
