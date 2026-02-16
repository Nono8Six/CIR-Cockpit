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
  entityUpdateId: string | null;
  entityUpdateAgencyNullFilterApplied: boolean;
  interactionUpdatePayload: Record<string, unknown> | null;
  interactionUpdateEntityId: string | null;
  interactionUpdateAgencyNullFilterApplied: boolean;
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
    entityUpdateId: null,
    entityUpdateAgencyNullFilterApplied: false,
    interactionUpdatePayload: null,
    interactionUpdateEntityId: null,
    interactionUpdateAgencyNullFilterApplied: false
  };

  const entitiesUpdateQuery = {
    eq: (_column: string, value: string) => {
      calls.entityUpdateId = value;
      return entitiesUpdateQuery;
    },
    is: (_column: string, value: null) => {
      calls.entityUpdateAgencyNullFilterApplied = value === null;
      return entitiesUpdateQuery;
    },
    select: (_columns: string) => entitiesUpdateQuery,
    maybeSingle: () => Promise.resolve({
      data: mocks.entityRow ?? null,
      error: mocks.entityUpdateError ?? null
    })
  };

  const entitiesLookupQuery = {
    eq: (_column: string, _value: string) => entitiesLookupQuery,
    maybeSingle: () => Promise.resolve({
      data: mocks.entityLookupRow ?? null,
      error: mocks.entityLookupError ?? null
    })
  };

  const entitiesTable = {
    update: (payload: Record<string, unknown>) => {
      calls.entityUpdatePayload = payload;
      return entitiesUpdateQuery;
    },
    select: (_columns: string) => entitiesLookupQuery
  };

  const agenciesQuery = {
    eq: (_column: string, _value: string) => agenciesQuery,
    maybeSingle: () => Promise.resolve({
      data: mocks.agencyRow ?? { id: 'agency-target', archived_at: null },
      error: mocks.agencyError ?? null
    })
  };

  const agenciesTable = {
    select: (_columns: string) => agenciesQuery
  };

  const interactionsUpdateQuery = {
    eq: (_column: string, value: string) => {
      calls.interactionUpdateEntityId = value;
      return interactionsUpdateQuery;
    },
    is: (_column: string, value: null) => {
      calls.interactionUpdateAgencyNullFilterApplied = value === null;
      return interactionsUpdateQuery;
    },
    select: (_columns: string) => Promise.resolve({
      data: mocks.propagatedRows ?? [],
      error: mocks.propagationError ?? null
    })
  };

  const interactionsTable = {
    update: (payload: Record<string, unknown>) => {
      calls.interactionUpdatePayload = payload;
      return interactionsUpdateQuery;
    }
  };

  const db = {
    from: (table: string) => {
      if (table === 'agencies') {
        return agenciesTable;
      }
      if (table === 'entities') {
        return entitiesTable;
      }
      if (table === 'interactions') {
        return interactionsTable;
      }
      throw new Error(`Unexpected table ${table}`);
    }
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
  assertEquals(calls.entityUpdateId, 'entity-1');
  assertEquals(calls.entityUpdateAgencyNullFilterApplied, true);
  assertEquals(calls.interactionUpdatePayload, { agency_id: 'agency-target' });
  assertEquals(calls.interactionUpdateEntityId, 'entity-1');
  assertEquals(calls.interactionUpdateAgencyNullFilterApplied, true);
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
