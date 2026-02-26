import { assertEquals, assertThrows } from 'std/assert';

import type { AuthContext, DbClient } from '../types.ts';
import { ensureReassignSuperAdmin, reassignEntity } from './dataEntities.ts';

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
