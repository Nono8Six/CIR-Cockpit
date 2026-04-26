import { assertEquals, assertRejects, assertThrows } from 'std/assert';

import type { AuthContext, DbClient } from '../types.ts';
import {
  ensureDeleteSuperAdmin,
  ensureReassignSuperAdmin,
  getEntitySearchIndex,
  listEntities,
  reassignEntity
} from './dataEntities.ts';
import { buildSaveEntityRows } from './dataEntitiesSaveRows.ts';

type ReassignMocks = {
  agencyRow?: { id: string; archived_at: string | null } | null;
  agencyError?: unknown;
  entityRow?: unknown;
  entityUpdateError?: unknown;
  entityLookupRow?: { id: string } | null;
  entityLookupError?: unknown;
  propagatedRows?: Array<{ id: string }>;
  propagationError?: unknown;
};

type ReassignCalls = {
  entityUpdatePayload: Record<string, unknown> | null;
  interactionUpdatePayload: Record<string, unknown> | null;
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

const createDbMock = (
  mocks: ReassignMocks = {}
): { db: DbClient; calls: ReassignCalls } => {
  const calls: ReassignCalls = {
    entityUpdatePayload: null,
    interactionUpdatePayload: null
  };

  let selectCall = 0;
  let updateCall = 0;

  const db = {
    select: (_fields: unknown) => ({
      from: (_table: unknown) => ({
        where: (_condition: unknown) => ({
          limit: (_value: number) => {
            selectCall += 1;
            if (selectCall === 1) {
              if (mocks.agencyError) {
                return Promise.reject(mocks.agencyError);
              }
              if (mocks.agencyRow === null) {
                return Promise.resolve([]);
              }
              return Promise.resolve([mocks.agencyRow ?? { id: 'agency-target', archived_at: null }]);
            }
            if (mocks.entityLookupError) {
              return Promise.reject(mocks.entityLookupError);
            }
            if (mocks.entityLookupRow === null) {
              return Promise.resolve([]);
            }
            return Promise.resolve([mocks.entityLookupRow ?? { id: 'entity-1' }]);
          }
        })
      })
    }),
    update: (_table: unknown) => ({
      set: (payload: Record<string, unknown>) => {
        updateCall += 1;
        if (updateCall === 1) {
          calls.entityUpdatePayload = payload;
        } else {
          calls.interactionUpdatePayload = payload;
        }
        return {
          where: (_condition: unknown) => ({
            returning: (_projection?: unknown) => {
              if (updateCall === 1) {
                if (mocks.entityUpdateError) {
                  return Promise.reject(mocks.entityUpdateError);
                }
                return Promise.resolve(mocks.entityRow ? [mocks.entityRow] : []);
              }
              if (mocks.propagationError) {
                return Promise.reject(mocks.propagationError);
              }
              return Promise.resolve(mocks.propagatedRows ?? []);
            }
          })
        };
      }
    })
  } as unknown as DbClient;

  return { db, calls };
};

const createListDbMock = (
  rows: unknown[] = []
): { db: DbClient; calls: { orderByCount: number; whereCount: number } } => {
  const calls = {
    orderByCount: 0,
    whereCount: 0
  };

  const db = {
    select: () => ({
      from: (_table: unknown) => ({
        where: (_condition: unknown) => {
          calls.whereCount += 1;
          return {
            orderBy: (_order: unknown) => {
              calls.orderByCount += 1;
              return Promise.resolve(rows);
            }
          };
        }
      })
    })
  } as unknown as DbClient;

  return { db, calls };
};

const createSearchIndexDbMock = (
  entityRows: unknown[] = [],
  contactRows: unknown[] = []
): { db: DbClient; calls: { entityOrderByCount: number; contactOrderByCount: number } } => {
  const calls = {
    entityOrderByCount: 0,
    contactOrderByCount: 0
  };
  let selectCall = 0;

  const db = {
    select: () => {
      selectCall += 1;
      return {
        from: (_table: unknown) => ({
          where: (_condition: unknown) => ({
            orderBy: (_order: unknown) => {
              if (selectCall === 1) {
                calls.entityOrderByCount += 1;
                return Promise.resolve(entityRows);
              }
              calls.contactOrderByCount += 1;
              return Promise.resolve(contactRows);
            }
          })
        })
      };
    }
  } as unknown as DbClient;

  return { db, calls };
};

const createAuthContext = (overrides: Partial<AuthContext> = {}): AuthContext => ({
  userId: 'user-1',
  role: 'agency_admin',
  agencyIds: ['agency-1'],
  isSuperAdmin: false,
  ...overrides
});

Deno.test('reassignEntity reassigns orphan entity and propagates interaction agency_id', async () => {
  const reassignedEntity = {
    id: 'entity-1',
    agency_id: 'agency-target'
  };
  const { db, calls } = createDbMock({
    entityRow: reassignedEntity,
    propagatedRows: [{ id: 'interaction-1' }, { id: 'interaction-2' }]
  });

  const result = await reassignEntity(db, {
    action: 'reassign',
    entity_id: 'entity-1',
    target_agency_id: 'agency-target'
  });

  assertEquals(result.entity, reassignedEntity);
  assertEquals(result.propagatedInteractionsCount, 2);
  assertEquals(calls.entityUpdatePayload, { agency_id: 'agency-target' });
  assertEquals(calls.interactionUpdatePayload, { agency_id: 'agency-target' });
});

Deno.test('listEntities returns clients through the backend API service', async () => {
  const rows = [
    {
      id: 'client-1',
      entity_type: 'Client',
      agency_id: 'agency-1',
      name: 'ACME'
    }
  ];
  const { db, calls } = createListDbMock(rows);

  const result = await listEntities(db, createAuthContext(), {
    action: 'list',
    entity_type: 'Client',
    agency_id: 'agency-1'
  });

  assertEquals(result, rows);
  assertEquals(calls.whereCount, 1);
  assertEquals(calls.orderByCount, 1);
});

Deno.test('listEntities returns prospect-compatible rows through the backend API service', async () => {
  const rows = [
    {
      id: 'prospect-1',
      entity_type: 'Prospect',
      agency_id: 'agency-1',
      name: 'Prospect'
    }
  ];
  const { db, calls } = createListDbMock(rows);

  const result = await listEntities(db, createAuthContext(), {
    action: 'list',
    entity_type: 'Prospect',
    agency_id: 'agency-1'
  });

  assertEquals(result, rows);
  assertEquals(calls.whereCount, 1);
  assertEquals(calls.orderByCount, 1);
});

Deno.test('listEntities rejects orphan listing for non-super-admin callers', async () => {
  const { db } = createListDbMock();

  const error = await assertRejects(() =>
    listEntities(db, createAuthContext(), {
      action: 'list',
      entity_type: 'Client',
      orphans_only: true
    })
  );

  assertEquals(readStatus(error), 403);
  assertEquals(readCode(error), 'AUTH_FORBIDDEN');
});

Deno.test('getEntitySearchIndex loads contacts only for selected entity ids', async () => {
  const entityRows = [
    { id: 'entity-1', agency_id: 'agency-1' },
    { id: 'entity-2', agency_id: 'agency-1' }
  ];
  const contactRows = [{ id: 'contact-1', entity_id: 'entity-1' }];
  const { db, calls } = createSearchIndexDbMock(entityRows, contactRows);

  const result = await getEntitySearchIndex(db, createAuthContext(), {
    action: 'search_index',
    agency_id: 'agency-1',
    include_archived: false
  });

  assertEquals(result, { entities: entityRows, contacts: contactRows });
  assertEquals(calls.entityOrderByCount, 1);
  assertEquals(calls.contactOrderByCount, 1);
});

Deno.test('getEntitySearchIndex returns empty index when agency is missing', async () => {
  const { db, calls } = createSearchIndexDbMock();

  const result = await getEntitySearchIndex(db, createAuthContext(), {
    action: 'search_index',
    agency_id: null
  });

  assertEquals(result, { entities: [], contacts: [] });
  assertEquals(calls.entityOrderByCount, 0);
  assertEquals(calls.contactOrderByCount, 0);
});

Deno.test('buildSaveEntityRows stores missing departments as null for the entities check constraint', () => {
  const { updateRow, insertRow } = buildSaveEntityRows({
    action: 'save',
    agency_id: 'agency-1',
    entity_type: 'Fournisseur',
    entity: {
      name: 'Fournisseur',
      address: '',
      postal_code: '',
      department: '',
      city: '',
      notes: '',
      agency_id: 'agency-1'
    }
  }, 'agency-1', 'user-1');

  assertEquals(updateRow.department, null);
  assertEquals(insertRow.department, null);
});

Deno.test('reassignEntity rejects non-orphan entities', async () => {
  const { db } = createDbMock({
    entityRow: null,
    entityLookupRow: { id: 'entity-1' }
  });

  const error = await (async () => {
    try {
      await reassignEntity(db, {
        action: 'reassign',
        entity_id: 'entity-1',
        target_agency_id: 'agency-target'
      });
      return null;
    } catch (caught) {
      return caught;
    }
  })();

  assertEquals(readStatus(error), 400);
  assertEquals(readCode(error), 'VALIDATION_ERROR');
});

Deno.test('reassignEntity returns NOT_FOUND when target agency does not exist', async () => {
  const { db } = createDbMock({
    agencyRow: null
  });

  const error = await (async () => {
    try {
      await reassignEntity(db, {
        action: 'reassign',
        entity_id: 'entity-1',
        target_agency_id: 'agency-missing'
      });
      return null;
    } catch (caught) {
      return caught;
    }
  })();

  assertEquals(readStatus(error), 404);
  assertEquals(readCode(error), 'NOT_FOUND');
});

Deno.test('ensureReassignSuperAdmin rejects non-super-admin callers', () => {
  const memberContext: AuthContext = {
    userId: 'user-1',
    role: 'tcs',
    agencyIds: ['agency-a'],
    isSuperAdmin: false
  };

  const error = assertThrows(() => ensureReassignSuperAdmin(memberContext));
  assertEquals(readStatus(error), 403);
  assertEquals(readCode(error), 'AUTH_FORBIDDEN');
});

Deno.test('ensureDeleteSuperAdmin rejects non-super-admin callers', () => {
  const memberContext: AuthContext = {
    userId: 'user-1',
    role: 'agency_admin',
    agencyIds: ['agency-a'],
    isSuperAdmin: false
  };

  const error = assertThrows(() => ensureDeleteSuperAdmin(memberContext));
  assertEquals(readStatus(error), 403);
  assertEquals(readCode(error), 'AUTH_FORBIDDEN');
});
