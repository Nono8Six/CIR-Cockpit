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

const createDbMock = (contactRow: ContactRow): { db: DbClient; getInsertedEntityId: () => string | null; getDeletedCount: () => number } => {
  let insertedEntityId: string | null = null;
  let deletedCount = 0;

  const db = {
    insert: () => ({
      values: (values: Record<string, unknown>) => {
        insertedEntityId = typeof values.entity_id === 'string' ? values.entity_id : null;
        return {
          returning: () => Promise.resolve([contactRow])
        };
      }
    }),
    update: () => ({
      set: () => ({
        where: () => ({
          returning: () => Promise.resolve([contactRow])
        })
      })
    }),
    delete: () => ({
      where: () => {
        deletedCount += 1;
        return Promise.resolve();
      }
    })
  } as unknown as DbClient;

  return {
    db,
    getInsertedEntityId: () => insertedEntityId,
    getDeletedCount: () => deletedCount
  };
};

Deno.test('handleDataEntityContactsAction saves contact', async () => {
  const contactRow = { id: 'contact-1' } as ContactRow;
  const mock = createDbMock(contactRow);

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
  const mock = createDbMock(contactRow);

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
