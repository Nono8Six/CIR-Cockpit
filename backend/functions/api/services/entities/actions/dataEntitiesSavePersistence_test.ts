import { assertEquals, assertRejects } from 'std/assert';

import type { DbClient } from '../../../types.ts';
import { persistEntityRow, persistSelectedPrimaryContact } from './dataEntitiesSavePersistence.ts';

const OFFICIAL_RESYNC_SOURCE = 'api-recherche-entreprises';

const readCode = (value: unknown): string | undefined => {
  if (!value || typeof value !== 'object') {
    return undefined;
  }
  const candidate = Reflect.get(value, 'code');
  return typeof candidate === 'string' ? candidate : undefined;
};

const createPrimaryContactDbMock = (
  contactRows: Array<{ id: string }> = [{ id: 'contact-1' }],
): { db: DbClient; updates: Array<Record<string, unknown>> } => {
  const updates: Array<Record<string, unknown>> = [];

  const db = {
    update: () => ({
      set: (payload: Record<string, unknown>) => {
        updates.push(payload);
        return {
          where: () => Promise.resolve([])
        };
      }
    }),
    select: () => ({
      from: () => ({
        where: () => ({
          limit: () => Promise.resolve(contactRows)
        })
      })
    })
  } as unknown as DbClient;

  return { db, updates };
};

const createEntityPersistDbMock = (): {
  db: DbClient;
  getUpdatePayload: () => Record<string, unknown> | null;
} => createEntityPersistDbMockWithCurrentRow({
  siret: '12345678900011',
  siren: '123456789',
  naf_code: '6201Z',
  official_name: 'ACME OFFICIEL',
  official_data_source: 'api-recherche-entreprises',
  official_data_synced_at: '2026-06-01T10:00:00.000Z',
  address: '1 rue actuelle',
  postal_code: '33000',
  department: '33',
  city: 'Bordeaux'
});

const createEntityPersistDbMockWithCurrentRow = (
  currentOfficialRow: {
    siret: string | null;
    siren: string | null;
    naf_code: string | null;
    official_name: string | null;
    official_data_source: string | null;
    official_data_synced_at: string | null;
    address: string | null;
    postal_code: string | null;
    department: string | null;
    city: string | null;
  }
): {
  db: DbClient;
  getUpdatePayload: () => Record<string, unknown> | null;
} => {
  let updatePayload: Record<string, unknown> | null = null;

  const db = {
    select: () => ({
      from: () => ({
        where: () => ({
          limit: () => Promise.resolve([currentOfficialRow])
        })
      })
    }),
    update: () => ({
      set: (payload: Record<string, unknown>) => {
        updatePayload = payload;
        return {
          where: () => ({
            returning: () => Promise.resolve([{ id: 'entity-1', ...payload }])
          })
        };
      }
    })
  } as unknown as DbClient;

  return {
    db,
    getUpdatePayload: () => updatePayload
  };
};

Deno.test('persistSelectedPrimaryContact demotes old primary and promotes selected active contact', async () => {
  const { db, updates } = createPrimaryContactDbMock();

  await persistSelectedPrimaryContact(db, 'entity-1', 'contact-1');

  assertEquals(updates, [
    { is_primary: false },
    { is_primary: true }
  ]);
});

Deno.test('persistSelectedPrimaryContact accepts no primary contact for company and prospect records', async () => {
  const { db, updates } = createPrimaryContactDbMock();

  await persistSelectedPrimaryContact(db, 'entity-1', null);

  assertEquals(updates, [{ is_primary: false }]);
});

Deno.test('persistSelectedPrimaryContact rejects missing or archived selected contact', async () => {
  const { db, updates } = createPrimaryContactDbMock([]);

  const error = await assertRejects(() =>
    persistSelectedPrimaryContact(db, 'entity-1', 'missing-contact')
  );

  assertEquals(readCode(error), 'NOT_FOUND');
  assertEquals(updates, [{ is_primary: false }]);
});

Deno.test('persistEntityRow preserves synced official fields without explicit resync', async () => {
  const mock = createEntityPersistDbMock();

  await persistEntityRow(
    mock.db,
    'entity-1',
    {
      name: 'ACME',
      siret: '99999999900011',
      siren: '999999999',
      naf_code: '9999Z',
      official_name: 'ACME MODIFIE',
      official_data_source: null,
      official_data_synced_at: null
    } as never,
    { name: 'ACME', created_by: 'user-1' } as never,
  );

  assertEquals(mock.getUpdatePayload()?.siret, '12345678900011');
  assertEquals(mock.getUpdatePayload()?.siren, '123456789');
  assertEquals(mock.getUpdatePayload()?.naf_code, '6201Z');
  assertEquals(mock.getUpdatePayload()?.official_name, 'ACME OFFICIEL');
  assertEquals(mock.getUpdatePayload()?.official_data_source, 'api-recherche-entreprises');
});

Deno.test('persistEntityRow allows synced official field update during explicit resync', async () => {
  const mock = createEntityPersistDbMock();

  await persistEntityRow(
    mock.db,
    'entity-1',
    {
      name: 'ACME',
      siret: '99999999900011',
      siren: '999999999',
      naf_code: '9999Z',
      official_name: 'ACME MODIFIE',
      official_data_source: 'api-recherche-entreprises',
      official_data_synced_at: '2026-06-16T10:00:00.000Z',
      address: '2 rue officielle',
      postal_code: '75001',
      department: '75',
      city: 'Paris'
    } as never,
    { name: 'ACME', created_by: 'user-1' } as never,
    {
      officialDataResync: {
        identity_mode: 'persisted_identifier',
        base_siren: '123456789',
        selected_fields: [
          'siret',
          'siren',
          'naf_code',
          'official_name',
          'official_data_source',
          'official_data_synced_at'
        ],
        source: OFFICIAL_RESYNC_SOURCE,
        synced_at: '2026-06-16T10:00:00.000Z'
      }
    },
  );

  assertEquals(mock.getUpdatePayload()?.siret, '99999999900011');
  assertEquals(mock.getUpdatePayload()?.siren, '999999999');
  assertEquals(mock.getUpdatePayload()?.official_name, 'ACME MODIFIE');
  assertEquals(mock.getUpdatePayload()?.address, '1 rue actuelle');
  assertEquals(mock.getUpdatePayload()?.city, 'Bordeaux');
});

Deno.test('persistEntityRow applies only selected fields during official resync', async () => {
  const mock = createEntityPersistDbMock();

  await persistEntityRow(
    mock.db,
    'entity-1',
    {
      name: 'ACME',
      siret: '99999999900011',
      siren: '999999999',
      naf_code: '9999Z',
      official_name: 'ACME MODIFIE',
      official_data_source: 'api-recherche-entreprises',
      official_data_synced_at: '2026-06-16T10:00:00.000Z',
      address: '2 rue officielle',
      postal_code: '75001',
      department: '75',
      city: 'Paris'
    } as never,
    { name: 'ACME', created_by: 'user-1' } as never,
    {
      officialDataResync: {
        identity_mode: 'persisted_identifier',
        base_siren: '123456789',
        selected_fields: ['official_name', 'official_data_synced_at'],
        source: OFFICIAL_RESYNC_SOURCE,
        synced_at: '2026-06-16T10:00:00.000Z'
      }
    },
  );

  assertEquals(mock.getUpdatePayload()?.official_name, 'ACME MODIFIE');
  assertEquals(mock.getUpdatePayload()?.official_data_synced_at, '2026-06-16T10:00:00.000Z');
  assertEquals(mock.getUpdatePayload()?.siret, '12345678900011');
  assertEquals(mock.getUpdatePayload()?.siren, '123456789');
  assertEquals(mock.getUpdatePayload()?.naf_code, '6201Z');
  assertEquals(mock.getUpdatePayload()?.address, '1 rue actuelle');
  assertEquals(mock.getUpdatePayload()?.city, 'Bordeaux');
});

Deno.test('persistEntityRow rejects official resync when base SIREN differs from persisted identity', async () => {
  const mock = createEntityPersistDbMock();

  const error = await assertRejects(() =>
    persistEntityRow(
      mock.db,
      'entity-1',
      {
        name: 'ACME',
        official_name: 'AUTRE SOCIETE',
        official_data_source: 'api-recherche-entreprises',
        official_data_synced_at: '2026-06-16T10:00:00.000Z'
      } as never,
      { name: 'ACME', created_by: 'user-1' } as never,
      {
        officialDataResync: {
          identity_mode: 'persisted_identifier',
          base_siren: '999999999',
          selected_fields: ['official_name', 'official_data_synced_at'],
          source: OFFICIAL_RESYNC_SOURCE,
          synced_at: '2026-06-16T10:00:00.000Z'
        }
      },
    )
  );

  assertEquals(readCode(error), 'CONFLICT');
  assertEquals(mock.getUpdatePayload(), null);
});

Deno.test('persistEntityRow allows manual official candidate selection when no identity is persisted', async () => {
  const mock = createEntityPersistDbMockWithCurrentRow({
    siret: null,
    siren: null,
    naf_code: null,
    official_name: null,
    official_data_source: null,
    official_data_synced_at: null,
    address: '1 rue actuelle',
    postal_code: '33000',
    department: '33',
    city: 'Bordeaux'
  });

  await persistEntityRow(
    mock.db,
    'entity-1',
    {
      name: 'ACME',
      siret: '12345678900011',
      siren: '123456789',
      naf_code: '6201Z',
      official_name: 'ACME OFFICIEL',
      official_data_source: 'api-recherche-entreprises',
      official_data_synced_at: '2026-06-16T10:00:00.000Z',
      address: '2 rue officielle',
      postal_code: '75001',
      department: '75',
      city: 'Paris'
    } as never,
    { name: 'ACME', created_by: 'user-1' } as never,
    {
      officialDataResync: {
        identity_mode: 'manual_candidate_selection',
        base_siren: '123456789',
        selected_fields: [
          'siren',
          'siret',
          'official_name',
          'official_data_source',
          'official_data_synced_at'
        ],
        source: OFFICIAL_RESYNC_SOURCE,
        synced_at: '2026-06-16T10:00:00.000Z'
      }
    },
  );

  assertEquals(mock.getUpdatePayload()?.siren, '123456789');
  assertEquals(mock.getUpdatePayload()?.siret, '12345678900011');
  assertEquals(mock.getUpdatePayload()?.official_name, 'ACME OFFICIEL');
  assertEquals(mock.getUpdatePayload()?.address, '1 rue actuelle');
  assertEquals(mock.getUpdatePayload()?.city, 'Bordeaux');
});

Deno.test('persistEntityRow rejects manual official candidate selection when identity is already persisted', async () => {
  const mock = createEntityPersistDbMock();

  const error = await assertRejects(() =>
    persistEntityRow(
      mock.db,
      'entity-1',
      {
        name: 'ACME',
        siren: '999999999',
        official_name: 'AUTRE SOCIETE',
        official_data_source: 'api-recherche-entreprises',
        official_data_synced_at: '2026-06-16T10:00:00.000Z'
      } as never,
      { name: 'ACME', created_by: 'user-1' } as never,
      {
        officialDataResync: {
          identity_mode: 'manual_candidate_selection',
          base_siren: '999999999',
          selected_fields: ['siren', 'official_name', 'official_data_synced_at'],
          source: OFFICIAL_RESYNC_SOURCE,
          synced_at: '2026-06-16T10:00:00.000Z'
        }
      },
    )
  );

  assertEquals(readCode(error), 'CONFLICT');
  assertEquals(mock.getUpdatePayload(), null);
});
