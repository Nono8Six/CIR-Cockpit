import { assertEquals, assertRejects } from 'std/assert';

import type { Database } from '../../../../shared/supabase.types.ts';
import { dataEntityContactsPayloadSchema } from '../../../../shared/schemas/data.schema.ts';
import type { AuthContext, DbClient } from '../types.ts';
import { handleDataEntityContactsAction } from './dataEntityContacts.ts';

type ContactRow = Database['public']['Tables']['entity_contacts']['Row'];

const authContext: AuthContext = {
  userId: 'user-1',
  role: 'tcs',
  agencyIds: ['agency-1'],
  isSuperAdmin: false
};

const readCode = (value: unknown): string | undefined => {
  if (!value || typeof value !== 'object') {
    return undefined;
  }
  const candidate = Reflect.get(value, 'code');
  return typeof candidate === 'string' ? candidate : undefined;
};

const createDbMock = (
  contactRows: ContactRow[],
  options: { updateRows?: ContactRow[]; deleteRows?: Array<{ id: string }> } = {}
): {
  db: DbClient;
  getInsertedEntityId: () => string | null;
  getDeletedCount: () => number;
  getListOrderArgsCount: () => number;
} => {
  let insertedEntityId: string | null = null;
  let deletedCount = 0;
  let listOrderArgsCount = 0;

  const db = {
    select: () => ({
      from: () => ({
        where: () => ({
          orderBy: (...args: unknown[]) => {
            listOrderArgsCount = args.length;
            return Promise.resolve(contactRows);
          }
        })
      })
    }),
    insert: () => ({
      values: (values: Record<string, unknown>) => {
        insertedEntityId = typeof values.entity_id === 'string' ? values.entity_id : null;
        return {
          returning: () => Promise.resolve(contactRows)
        };
      }
    }),
    update: () => ({
      set: () => ({
        where: () => ({
          returning: () => Promise.resolve(options.updateRows ?? contactRows)
        })
      })
    }),
    delete: () => ({
      where: () => ({
        returning: () => {
          const rows = options.deleteRows ?? contactRows.map((row) => ({ id: row.id }));
          deletedCount += 1;
          return Promise.resolve(rows);
        }
      })
    })
  } as unknown as DbClient;

  return {
    db,
    getInsertedEntityId: () => insertedEntityId,
    getDeletedCount: () => deletedCount,
    getListOrderArgsCount: () => listOrderArgsCount
  };
};

Deno.test('handleDataEntityContactsAction lists contacts by entity', async () => {
  const contactRows = [
    { id: 'contact-2', first_name: 'Zoé', last_name: 'Martin', created_at: '2026-02-02T00:00:00Z' },
    { id: 'contact-1', first_name: 'Alice', last_name: 'Martin', created_at: '2026-02-01T00:00:00Z' },
    { id: 'contact-3', first_name: 'Bruno', last_name: 'Durand', created_at: '2026-02-03T00:00:00Z' }
  ] as ContactRow[];
  const mock = createDbMock(contactRows);

  const response = await handleDataEntityContactsAction(
    mock.db,
    authContext,
    'req-list',
    {
      action: 'list_by_entity',
      entity_id: 'entity-1',
      include_archived: false
    },
    {
      ensureRateLimit: () => Promise.resolve(),
      getEntityAgencyId: () => Promise.resolve('agency-1'),
      getContactEntityId: () => Promise.resolve('entity-1'),
      ensureAgencyAccess: () => 'agency-1'
    }
  );

  assertEquals(response.ok, true);
  assertEquals('contacts' in response, true);
  assertEquals(mock.getListOrderArgsCount(), 3);
  if ('contacts' in response) {
    assertEquals(response.contacts.map((contact) => contact.id), ['contact-3', 'contact-1', 'contact-2']);
  }
});

Deno.test('handleDataEntityContactsAction saves contact', async () => {
  const contactRow = { id: 'contact-1' } as ContactRow;
  const mock = createDbMock([contactRow]);

  const response = await handleDataEntityContactsAction(
    mock.db,
    authContext,
    'req-1',
    {
      action: 'save',
      entity_id: 'entity-1',
      contact: {
        first_name: 'Alice',
        last_name: 'Martin',
        email: '',
        phone: '0102030405',
        position: '',
        notes: ''
      }
    },
    {
      ensureRateLimit: () => Promise.resolve(),
      getEntityAgencyId: () => Promise.resolve('agency-1'),
      getContactEntityId: () => Promise.resolve('entity-1'),
      ensureAgencyAccess: () => 'agency-1'
    }
  );

  assertEquals(response.ok, true);
  assertEquals('contact' in response, true);
  assertEquals(mock.getInsertedEntityId(), 'entity-1');
});

Deno.test('handleDataEntityContactsAction deletes contact', async () => {
  const contactRow = { id: 'contact-1' } as ContactRow;
  const mock = createDbMock([contactRow]);

  const response = await handleDataEntityContactsAction(
    mock.db,
    authContext,
    'req-2',
    {
      action: 'delete',
      contact_id: 'contact-1'
    },
    {
      ensureRateLimit: () => Promise.resolve(),
      getEntityAgencyId: () => Promise.resolve('agency-1'),
      getContactEntityId: () => Promise.resolve('entity-1'),
      ensureAgencyAccess: () => 'agency-1'
    }
  );

  assertEquals(response.ok, true);
  assertEquals('contact_id' in response, true);
  assertEquals(mock.getDeletedCount(), 1);
});

Deno.test('handleDataEntityContactsAction rejects update outside requested entity scope', async () => {
  const contactRow = { id: 'contact-1' } as ContactRow;
  const mock = createDbMock([contactRow], { updateRows: [] });

  await assertRejects(
    async () => {
      await handleDataEntityContactsAction(
        mock.db,
        authContext,
        'req-cross-entity',
        {
          action: 'save',
          entity_id: 'entity-2',
          id: 'contact-1',
          contact: {
            first_name: 'Alice',
            last_name: 'Martin',
            email: '',
            phone: '',
            position: '',
            notes: ''
          }
        },
        {
          ensureRateLimit: () => Promise.resolve(),
          getEntityAgencyId: () => Promise.resolve('agency-1'),
          getContactEntityId: () => Promise.resolve('entity-1'),
          ensureAgencyAccess: () => 'agency-1'
        }
      );
    },
    Error,
    'Contact introuvable pour ce tiers.'
  );
});

Deno.test('handleDataEntityContactsAction rejects delete when contact is absent', async () => {
  const contactRow = { id: 'contact-1' } as ContactRow;
  const mock = createDbMock([contactRow], { deleteRows: [] });

  await assertRejects(
    async () => {
      await handleDataEntityContactsAction(
        mock.db,
        authContext,
        'req-delete-missing',
        {
          action: 'delete',
          contact_id: 'contact-unknown'
        },
        {
          ensureRateLimit: () => Promise.resolve(),
          getEntityAgencyId: () => Promise.resolve('agency-1'),
          getContactEntityId: () => Promise.resolve('entity-1'),
          ensureAgencyAccess: () => 'agency-1'
        }
      );
    },
    Error,
    'Contact introuvable.'
  );
});

Deno.test('dataEntityContactsPayloadSchema rejects unsupported list action', () => {
  const parsed = dataEntityContactsPayloadSchema.safeParse({ action: 'list' });
  assertEquals(parsed.success, false);
});

Deno.test('handleDataEntityContactsAction throws DB_WRITE_FAILED when save returns empty row', async () => {
  const db = {
    insert: () => ({
      values: () => ({
        returning: () => Promise.resolve([])
      })
    })
  } as unknown as DbClient;

  await assertRejects(
    async () => {
      await handleDataEntityContactsAction(
        db,
        authContext,
        'req-3',
        {
          action: 'save',
          entity_id: 'entity-1',
          contact: {
            first_name: 'Alice',
            last_name: 'Martin',
            email: '',
            phone: '0102030405',
            position: '',
            notes: ''
          }
        },
        {
          ensureRateLimit: () => Promise.resolve(),
          getEntityAgencyId: () => Promise.resolve('agency-1'),
          getContactEntityId: () => Promise.resolve('entity-1'),
          ensureAgencyAccess: () => 'agency-1'
        }
      );
    },
    Error,
    'Impossible de creer le contact.'
  );

  try {
    await handleDataEntityContactsAction(
      db,
      authContext,
      'req-4',
      {
        action: 'save',
        entity_id: 'entity-1',
        contact: {
          first_name: 'Alice',
          last_name: 'Martin',
          email: '',
          phone: '0102030405',
          position: '',
          notes: ''
        }
      },
      {
        ensureRateLimit: () => Promise.resolve(),
        getEntityAgencyId: () => Promise.resolve('agency-1'),
        getContactEntityId: () => Promise.resolve('entity-1'),
        ensureAgencyAccess: () => 'agency-1'
      }
    );
  } catch (error) {
    assertEquals(readCode(error), 'DB_WRITE_FAILED');
  }
});
