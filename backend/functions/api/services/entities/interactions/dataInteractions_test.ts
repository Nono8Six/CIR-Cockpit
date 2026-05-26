import { assertEquals, assertRejects } from 'std/assert';

import {
  normalizeInteractionUpdates,
  normalizeKnownCompanies,
  resolveDraftFormType,
  resolvePagination,
  saveInteraction,
  addTimelineEvent,
  listInteractionsByAgency,
  listKnownCompanies,
  getInteractionDraft,
  saveInteractionDraft,
  deleteInteractionDraft,
  deleteInteraction
} from './dataInteractions.ts';
import type { AuthContext, DbClient } from '../../../types.ts';

// --- Tests existants préservés (fonctions pures) ---

Deno.test('normalizeInteractionUpdates keeps only whitelisted keys', () => {
  const normalized = normalizeInteractionUpdates({
    status: '  En cours  ',
    status_id: 'a6a8c6d2-5adf-4d56-b4aa-f6854699886a',
    order_ref: '  DOS-12 ',
    reminder_at: '2026-02-16T10:00:00.000Z',
    notes: '  note interne  ',
    entity_id: 'b6a8c6d2-5adf-4d56-b4aa-f6854699886a',
    contact_id: null,
    last_action_at: '2026-02-16T11:00:00.000Z',
    status_is_terminal: true,
    mega_families: ['A', 'B'],
    unknown_key: 'ignored'
  } as unknown as Parameters<typeof normalizeInteractionUpdates>[0]);

  assertEquals(normalized, {
    status: 'En cours',
    status_id: 'a6a8c6d2-5adf-4d56-b4aa-f6854699886a',
    order_ref: 'DOS-12',
    reminder_at: '2026-02-16T10:00:00.000Z',
    notes: 'note interne',
    entity_id: 'b6a8c6d2-5adf-4d56-b4aa-f6854699886a',
    contact_id: null,
    last_action_at: '2026-02-16T11:00:00.000Z',
    status_is_terminal: true,
    mega_families: ['A', 'B']
  });
});

Deno.test('normalizeInteractionUpdates drops invalid or empty values', () => {
  const normalized = normalizeInteractionUpdates({
    status: '   ',
    order_ref: '',
    reminder_at: null,
    notes: '   ',
    entity_id: undefined,
    contact_id: '   ',
    last_action_at: '',
    status_is_terminal: 'yes',
    mega_families: ['A', 42]
  } as unknown as Parameters<typeof normalizeInteractionUpdates>[0]);

  assertEquals(normalized, {
    contact_id: null,
    order_ref: null,
    reminder_at: null,
    notes: null
  });
});

Deno.test('resolvePagination applies defaults when page and page_size are omitted', () => {
  const pagination = resolvePagination({});
  assertEquals(pagination, {
    page: 1,
    pageSize: 20,
    offset: 0
  });
});

Deno.test('resolvePagination computes offset from page and page_size', () => {
  const pagination = resolvePagination({
    page: 3,
    page_size: 10
  });
  assertEquals(pagination, {
    page: 3,
    pageSize: 10,
    offset: 20
  });
});

Deno.test('normalizeKnownCompanies trims, removes empty names, deduplicates case-insensitively and sorts in French', () => {
  const companies = normalizeKnownCompanies([
    { company_name: '  Zebra Industrie  ' },
    { company_name: '' },
    { company_name: 'alpha' },
    { company_name: 'Alpha' },
    { company_name: null },
    { company_name: 'Éclair' }
  ]);

  assertEquals(companies, ['alpha', 'Éclair', 'Zebra Industrie']);
});

Deno.test('resolveDraftFormType applies the default interaction form and trims custom form types', () => {
  assertEquals(resolveDraftFormType(undefined), 'interaction');
  assertEquals(resolveDraftFormType('   '), 'interaction');
  assertEquals(resolveDraftFormType('  interaction-mobile  '), 'interaction-mobile');
});

// --- Nouveaux tests méticuleux d'étanchéité multi-tenant ---

// Helper pour instancier des contextes d'authentification de test cohérents
const createAuthContext = (overrides: Partial<AuthContext> = {}): AuthContext => ({
  userId: 'user-1',
  role: 'tcs',
  agencyIds: ['agency-1'],
  activeAgencyId: 'agency-1',
  isSuperAdmin: false,
  ...overrides
});

// Mock DB Thenable universel permettant de chaîner n'importe quelle requête Drizzle à l'infini
type MockRow = Record<string, unknown>;
type MockCall = Record<string, unknown>;
type MockThen = <T = MockRow[]>(
  onFulfilled?: (value: MockRow[]) => T | PromiseLike<T>,
  onRejected?: (reason: unknown) => T | PromiseLike<T>
) => Promise<T>;

type MockConfig = {
  selectRows?: MockRow[];
  insertRows?: MockRow[];
  updateRows?: MockRow[];
  deleteRows?: MockRow[];
};

const createMockDb = (config: MockConfig = {}) => {
  const selectCalls: MockCall[] = [];
  const insertCalls: MockCall[] = [];
  const updateCalls: MockCall[] = [];
  const deleteCalls: MockCall[] = [];

  const db = {
    select: (fields?: unknown) => {
      const call: MockCall = { type: 'select', fields };
      selectCalls.push(call);

      // Builder Thenable générique réutilisé à chaque étape du chaînage
      const builder = {
        from: (table: unknown) => {
          call.table = table;
          return builder;
        },
        where: (condition: unknown) => {
          call.where = condition;
          return builder;
        },
        orderBy: (...order: unknown[]) => {
          call.orderBy = order;
          return builder;
        },
        limit: (val: number) => {
          call.limit = val;
          return builder;
        },
        offset: (val: number) => {
          call.offset = val;
          return builder;
        },
        // Comportement Thenable standard (Promesse résolue)
        then: ((onFulfilled, onRejected) => {
          return Promise.resolve(config.selectRows ?? []).then(onFulfilled, onRejected);
        }) as MockThen
      };

      return builder;
    },
    insert: (table: unknown) => {
      const call: MockCall = { type: 'insert', table };
      insertCalls.push(call);

      const builder = {
        values: (row: unknown) => {
          call.values = row;
          return builder;
        },
        onConflictDoUpdate: (updateConfig: unknown) => {
          call.onConflict = updateConfig;
          return builder;
        },
        returning: (_projection?: unknown) => {
          return builder;
        },
        then: ((onFulfilled, onRejected) => {
          return Promise.resolve(config.insertRows ?? []).then(onFulfilled, onRejected);
        }) as MockThen
      };

      return builder;
    },
    update: (table: unknown) => {
      const call: MockCall = { type: 'update', table };
      updateCalls.push(call);

      const builder = {
        set: (payload: unknown) => {
          call.set = payload;
          return builder;
        },
        where: (condition: unknown) => {
          call.where = condition;
          return builder;
        },
        returning: (_projection?: unknown) => {
          return builder;
        },
        then: ((onFulfilled, onRejected) => {
          return Promise.resolve(config.updateRows ?? []).then(onFulfilled, onRejected);
        }) as MockThen
      };

      return builder;
    },
    delete: (table: unknown) => {
      const call: MockCall = { type: 'delete', table };
      deleteCalls.push(call);

      const builder = {
        where: (condition: unknown) => {
          call.where = condition;
          return builder;
        },
        returning: (_projection?: unknown) => {
          return builder;
        },
        then: ((onFulfilled, onRejected) => {
          return Promise.resolve(config.deleteRows ?? []).then(onFulfilled, onRejected);
        }) as MockThen
      };

      return builder;
    }
  } as unknown as DbClient;

  return { db, selectCalls, insertCalls, updateCalls, deleteCalls };
};

// --- Tests sur saveInteraction ---

Deno.test('saveInteraction allows member user to save in allowed agency', async () => {
  const row = { id: 'int-1', agency_id: 'agency-1', subject: 'Sujet test' };
  const { db, insertCalls } = createMockDb({ insertRows: [row] });
  const auth = createAuthContext();

  const result = await saveInteraction(db, auth, {
    action: 'save',
    agency_id: 'agency-1',
    interaction: { id: 'int-1', channel: 'Email', entity_type: 'Client', subject: 'Sujet test', interaction_type: 'Note' }
  });

  assertEquals(result, row);
  assertEquals(insertCalls.length, 1);
  assertEquals(insertCalls[0].values.agency_id, 'agency-1');
});

Deno.test('saveInteraction rejects member user trying to save in non-member agency', async () => {
  const { db } = createMockDb();
  const auth = createAuthContext();

  const error = await assertRejects(
    () => saveInteraction(db, auth, {
      action: 'save',
      agency_id: 'agency-forbidden',
      interaction: { id: 'int-1', channel: 'Email', entity_type: 'Client', subject: 'Sujet test', interaction_type: 'Note' }
    })
  );

  assertEquals(Reflect.get(error, 'status'), 403);
  assertEquals(Reflect.get(error, 'code'), 'AUTH_FORBIDDEN');
});

Deno.test('saveInteraction allows super_admin to save in any agency', async () => {
  const row = { id: 'int-1', agency_id: 'agency-any', subject: 'Sujet test' };
  const { db, insertCalls } = createMockDb({ insertRows: [row] });
  const auth = createAuthContext({ role: 'super_admin', isSuperAdmin: true, agencyIds: [] });

  const result = await saveInteraction(db, auth, {
    action: 'save',
    agency_id: 'agency-any',
    interaction: { id: 'int-1', channel: 'Email', entity_type: 'Client', subject: 'Sujet test', interaction_type: 'Note' }
  });

  assertEquals(result, row);
  assertEquals(insertCalls.length, 1);
  assertEquals(insertCalls[0].values.agency_id, 'agency-any');
});

// --- Tests sur listInteractionsByAgency ---

Deno.test('listInteractionsByAgency allows member to fetch allowed agency', async () => {
  const rows = [{ id: 'int-1', agency_id: 'agency-1' }];
  const { db, selectCalls } = createMockDb({ selectRows: rows });
  const auth = createAuthContext();

  const result = await listInteractionsByAgency(db, auth, {
    action: 'list_by_agency',
    agency_id: 'agency-1'
  });

  assertEquals(result.interactions, rows);
  assertEquals(selectCalls.length, 2); // 1 for rows, 1 for count
});

Deno.test('listInteractionsByAgency rejects member trying to fetch non-member agency', async () => {
  const { db } = createMockDb();
  const auth = createAuthContext();

  const error = await assertRejects(
    () => listInteractionsByAgency(db, auth, {
      action: 'list_by_agency',
      agency_id: 'agency-forbidden'
    })
  );

  assertEquals(Reflect.get(error, 'status'), 403);
  assertEquals(Reflect.get(error, 'code'), 'AUTH_FORBIDDEN');
});

// --- Tests sur listKnownCompanies ---

Deno.test('listKnownCompanies allows member and checks agency_id filter', async () => {
  const rows = [{ company_name: 'Zebra' }];
  const { db, selectCalls } = createMockDb({ selectRows: rows });
  const auth = createAuthContext();

  const result = await listKnownCompanies(db, auth, {
    action: 'known_companies',
    agency_id: 'agency-1'
  });

  assertEquals(result, ['Zebra']);
  assertEquals(selectCalls.length, 1);
});

Deno.test('listKnownCompanies rejects non-member', async () => {
  const { db } = createMockDb();
  const auth = createAuthContext();

  const error = await assertRejects(
    () => listKnownCompanies(db, auth, {
      action: 'known_companies',
      agency_id: 'agency-forbidden'
    })
  );

  assertEquals(Reflect.get(error, 'status'), 403);
});

// --- Tests sur getInteractionDraft / saveInteractionDraft / deleteInteractionDraft ---

Deno.test('draft operations verify matching user_id', async () => {
  const { db } = createMockDb();
  const auth = createAuthContext();

  // Try to query draft belonging to user-other
  const errorGet = await assertRejects(
    () => getInteractionDraft(db, auth, {
      action: 'draft_get',
      user_id: 'user-other',
      agency_id: 'agency-1'
    })
  );
  assertEquals(Reflect.get(errorGet, 'status'), 403);

  const errorSave = await assertRejects(
    () => saveInteractionDraft(db, auth, {
      action: 'draft_save',
      user_id: 'user-other',
      agency_id: 'agency-1',
      payload: {}
    })
  );
  assertEquals(Reflect.get(errorSave, 'status'), 403);

  const errorDelete = await assertRejects(
    () => deleteInteractionDraft(db, auth, {
      action: 'draft_delete',
      user_id: 'user-other',
      agency_id: 'agency-1'
    })
  );
  assertEquals(Reflect.get(errorDelete, 'status'), 403);
});

Deno.test('draft operations verify allowed agency_id', async () => {
  const { db } = createMockDb();
  const auth = createAuthContext();

  // Try to query allowed user but for a forbidden agency
  const errorGet = await assertRejects(
    () => getInteractionDraft(db, auth, {
      action: 'draft_get',
      user_id: 'user-1',
      agency_id: 'agency-forbidden'
    })
  );
  assertEquals(Reflect.get(errorGet, 'status'), 403);
  assertEquals(Reflect.get(errorGet, 'code'), 'AUTH_FORBIDDEN');
});

// --- Tests sur addTimelineEvent ---

Deno.test('addTimelineEvent allows action when interaction belongs to member agency', async () => {
  const existing = [{ timeline: [], agency_id: 'agency-1' }];
  const updated = [{ id: 'int-1', agency_id: 'agency-1', timeline: [{}] }];
  const { db, selectCalls, updateCalls } = createMockDb({
    selectRows: existing,
    updateRows: updated
  });
  const auth = createAuthContext();

  const result = await addTimelineEvent(db, auth, {
    action: 'add_timeline_event',
    interaction_id: 'int-1',
    expected_updated_at: '2026-02-16T10:00:00.000Z',
    event: { id: 'evt-1', actor_id: 'user-1', action_type: 'update', timestamp: '2026' },
    updates: { status: 'Terminé' }
  });

  assertEquals(result, updated[0]);
  assertEquals(selectCalls.length, 1);
  assertEquals(updateCalls.length, 1);
});

Deno.test('addTimelineEvent rejects action when interaction belongs to non-member agency', async () => {
  const existing = [{ timeline: [], agency_id: 'agency-forbidden' }];
  const { db } = createMockDb({ selectRows: existing });
  const auth = createAuthContext();

  const error = await assertRejects(
    () => addTimelineEvent(db, auth, {
      action: 'add_timeline_event',
      interaction_id: 'int-1',
      expected_updated_at: '2026-02-16T10:00:00.000Z',
      event: { id: 'evt-1', actor_id: 'user-1', action_type: 'update', timestamp: '2026' },
      updates: { status: 'Terminé' }
    })
  );

  assertEquals(Reflect.get(error, 'status'), 403);
  assertEquals(Reflect.get(error, 'code'), 'AUTH_FORBIDDEN');
});

// --- Tests sur deleteInteraction ---

Deno.test('deleteInteraction allows delete for member of the agency', async () => {
  const existing = [{ id: 'int-1', agency_id: 'agency-1', entity_id: null }];
  const deleted = [{ id: 'int-1' }];
  const { db, selectCalls, deleteCalls } = createMockDb({
    selectRows: existing,
    deleteRows: deleted
  });
  const auth = createAuthContext();

  const result = await deleteInteraction(db, auth, {
    action: 'delete',
    interaction_id: 'int-1'
  });

  assertEquals(result, 'int-1');
  assertEquals(selectCalls.length, 1);
  assertEquals(deleteCalls.length, 1);
});

Deno.test('deleteInteraction rejects delete for non-member of the agency', async () => {
  const existing = [{ id: 'int-1', agency_id: 'agency-forbidden', entity_id: null }];
  const { db } = createMockDb({ selectRows: existing });
  const auth = createAuthContext();

  const error = await assertRejects(
    () => deleteInteraction(db, auth, {
      action: 'delete',
      interaction_id: 'int-1'
    })
  );

  assertEquals(Reflect.get(error, 'status'), 403);
  assertEquals(Reflect.get(error, 'code'), 'AUTH_FORBIDDEN');
});
