import { parseTrpcContract } from '@/services/api/invokeTrpc';
import { describe, expect, it, vi } from 'vitest';

import type { TrpcClient } from '@/services/api/trpcClient';
import { safeTrpc } from '@/services/api/safeTrpc';
import { deleteEntityContact } from '@/services/entities/deleteEntityContact';
import { deleteSupplier } from '@/services/entities/deleteSupplier';
import { getEntityContacts } from '@/services/entities/getEntityContacts';
import { getEntitySearchIndex } from '@/services/entities/getEntitySearchIndex';
import { saveEntity } from '@/services/entities/saveEntity';
import { saveEntityContact } from '@/services/entities/saveEntityContact';
import { searchEntitiesUnified } from '@/services/entities/searchEntitiesUnified';
import { setSupplierArchived } from '@/services/entities/setSupplierArchived';
import { buildTierOrganizationRead } from '@/__tests__/test-utils';

vi.mock('../../api/safeTrpc');

type SafeRpcCall = Parameters<typeof safeTrpc>[0];
type SafeRpcParser = Parameters<typeof safeTrpc>[1];

const mockSafeRpc = vi.mocked(safeTrpc);

const entityRow = (overrides: Record<string, unknown> = {}) => ({
  account_type: null,
  address: null,
  agency_id: 'agency-1',
  archived_at: null,
  cir_agency_id: null,
  cir_commercial_id: null,
  city: 'Paris',
  client_kind: null,
  client_number: null,
  country: 'France',
  created_at: '2026-06-01T10:00:00.000Z',
  created_by: 'user-1',
  department: '75',
  entity_type: 'Client',
  first_name: null,
  id: 'entity-1',
  last_name: null,
  legal_form_code: null,
  naf_code: null,
  name: 'Entite test',
  notes: null,
  official_data_source: null,
  official_data_synced_at: null,
  official_name: null,
  postal_code: '75001',
  primary_email: null,
  primary_phone: null,
  siren: null,
  siret: null,
  supplier_code: null,
  supplier_number: null,
  updated_at: '2026-06-01T10:00:00.000Z',
  ...overrides
});

const contactRow = (overrides: Record<string, unknown> = {}) => ({
  archived_at: null,
  created_at: '2026-06-01T10:00:00.000Z',
  email: null,
  entity_id: 'entity-1',
  first_name: 'Jean',
  id: 'contact-1',
  is_primary: false,
  last_name: 'Dupont',
  notes: null,
  phone: null,
  position: null,
  service_label: null,
  updated_at: '2026-06-01T10:00:00.000Z',
  ...overrides
});

const createTrpcClientFixture = () => {
  const entitiesPost = vi.fn().mockResolvedValue(new Response('{}', { status: 200 }));
  const entityContactsPost = vi.fn().mockResolvedValue(new Response('{}', { status: 200 }));
  const unifiedSearchQuery = vi.fn().mockResolvedValue(new Response('{}', { status: 200 }));

  const client = {
    data: {
      profile: { mutate: vi.fn() },
      config: { mutate: vi.fn() },
      entities: { mutate: entitiesPost },
      searchEntitiesUnified: { query: unifiedSearchQuery },
      'entity-contacts': { mutate: entityContactsPost },
      interactions: { mutate: vi.fn() }
    },
    admin: {
      users: { mutate: vi.fn() },
      agencies: { mutate: vi.fn() }
    }
  } as unknown as TrpcClient;

  return { client, entitiesPost, entityContactsPost, unifiedSearchQuery };
};

const expectRequestFailedError = (parser: SafeRpcParser) => {
  try {
    parseTrpcContract(parser, {});
  } catch (error) {
    expect(error).toMatchObject({ code: 'REQUEST_FAILED' });
    return;
  }
  throw new Error('Expected parser to throw REQUEST_FAILED.');
};

describe('entities RPC services', () => {
  it('builds getEntityContacts RPC payload and parses contacts response', async () => {
    const match = vi.fn();
    mockSafeRpc.mockReturnValue({ match } as never);

    await getEntityContacts('entity-1', true);

    expect(mockSafeRpc).toHaveBeenCalledWith(
      expect.any(Function),
      expect.any(Function),
      'Impossible de charger les contacts.'
    );

    const [call, parser] = mockSafeRpc.mock.calls[0] as [SafeRpcCall, SafeRpcParser, string];
    const { client, entityContactsPost } = createTrpcClientFixture();
    await call(client, {});

    expect(entityContactsPost).toHaveBeenCalledWith({
          action: 'list_by_entity',
          entity_id: 'entity-1',
          include_archived: true
        },
      {}
    );

    const contacts = [contactRow({ id: 'contact-1' })];
    expect(parseTrpcContract(parser, { ok: true, contacts, tier_contacts: [] })).toEqual(contacts);
    expectRequestFailedError(parser);
  });

  it('propagates entity contact RPC errors', async () => {
    const error = new Error('rpc failed');
    mockSafeRpc.mockReturnValue({
      match: vi.fn((_onSuccess, onError) => onError(error))
    } as never);

    await expect(getEntityContacts('entity-1')).rejects.toBe(error);
  });

  it('returns an empty search index without agency id', async () => {
    const result = await getEntitySearchIndex(null);

    expect(result).toEqual({ entities: [], contacts: [], tiers: [], tierContacts: [] });
    expect(mockSafeRpc).not.toHaveBeenCalled();
  });

  it('builds getEntitySearchIndex RPC payload and parses filtered index response', async () => {
    const match = vi.fn();
    mockSafeRpc.mockReturnValue({ match } as never);

    await getEntitySearchIndex('agency-1', false);

    expect(mockSafeRpc).toHaveBeenCalledWith(
      expect.any(Function),
      expect.any(Function),
      "Impossible de charger l'index de recherche."
    );

    const [call, parser] = mockSafeRpc.mock.calls[0] as [SafeRpcCall, SafeRpcParser, string];
    const { client, entitiesPost } = createTrpcClientFixture();
    await call(client, {});

    expect(entitiesPost).toHaveBeenCalledWith({
          action: 'search_index',
          agency_id: 'agency-1',
          include_archived: false
        },
      {}
    );

    const entityId = '11111111-1111-4111-8111-111111111111';
    const contactId = '55555555-5555-4555-8555-555555555555';
    const entities = [entityRow({ id: entityId })];
    const contacts = [contactRow({ id: contactId, entity_id: entityId })];
    const tiers = [buildTierOrganizationRead(['client'], {
      id: entityId,
      legacy_entity_id: entityId,
      name: 'Entite test'
    })];
    const tierContacts = [{
      id: contactId,
      organization_id: entityId,
      legacy_entity_id: entityId,
      first_name: 'Jean',
      last_name: 'Dupont',
      email: null,
      phone: null,
      position: null,
      service_label: null,
      is_primary: false,
      notes: null,
      archived_at: null,
      created_at: '2026-06-01T10:00:00.000Z',
      updated_at: '2026-06-01T10:00:00.000Z',
      provenance: {
        source_system: 'entity_contacts',
        source_record_id: contactId,
        authority: 'cir_cockpit' as const,
        synced_at: null
      }
    }];
    expect(parseTrpcContract(parser, {
      ok: true,
      entities,
      contacts,
      tiers,
      tier_contacts: tierContacts
    })).toEqual({
      entities: [{ ...entities[0], canonical_tier: tiers[0] }],
      contacts: [{ ...contacts[0], canonical_contact: tierContacts[0] }],
      tiers,
      tierContacts
    });
    expectRequestFailedError(parser);
  });

  it('rejects a search index that omits a canonical tier', async () => {
    const match = vi.fn();
    mockSafeRpc.mockReturnValue({ match } as never);
    await getEntitySearchIndex('agency-1', false);
    const [, parser] = mockSafeRpc.mock.calls[0] as [SafeRpcCall, SafeRpcParser, string];

    expect(() => parseTrpcContract(parser, {
      ok: true,
      entities: [entityRow({ id: 'entity-1' })],
      contacts: [],
      tiers: [],
      tier_contacts: []
    })).toThrow('Contrat Tiers incomplet pour la recherche.');
  });

  it('builds searchEntitiesUnified query payload and parses V1 rows', async () => {
    const match = vi.fn();
    mockSafeRpc.mockReturnValue({ match } as never);

    await searchEntitiesUnified({
      query: 'alpha',
      agency_id: 'agency-1',
      family: 'all',
      client_filter: 'all',
      prospect_filter: 'all',
      include_archived: false,
      limit: 5
    });

    expect(mockSafeRpc).toHaveBeenCalledWith(
      expect.any(Function),
      expect.objectContaining({ safeParse: expect.any(Function) }),
      'Impossible de rechercher les tiers.'
    );

    const [call, parser] = mockSafeRpc.mock.calls[0] as [SafeRpcCall, SafeRpcParser, string];
    const { client, unifiedSearchQuery } = createTrpcClientFixture();
    const input = {
      query: 'alpha',
      agency_id: 'agency-1',
      family: 'all',
      client_filter: 'all',
      prospect_filter: 'all',
      include_archived: false,
      limit: 5
    };
    await call(client, {});

    expect(unifiedSearchQuery).toHaveBeenCalledWith(input, {});

    const row = {
      id: 'entity-1',
      source: 'entity',
      type: 'client_term',
      label: 'Client Alpha',
      identifier: '000123',
      phone: null,
      email: null,
      city: 'Paris',
      agency_name: null,
      referent_name: null,
      match_label: null,
      updated_at: '2026-01-01T10:00:00.000Z',
      archived_at: null
    };
    expect(parseTrpcContract(parser, { ok: true, results: [row], tiers: [] })).toEqual({
      ok: true,
      results: [row],
      tiers: []
    });
    expectRequestFailedError(parser);
  });

  it('propagates unified search RPC errors', async () => {
    const error = new Error('search failed');
    mockSafeRpc.mockReturnValue({
      match: vi.fn((_onSuccess, onError) => onError(error))
    } as never);

    await expect(searchEntitiesUnified({
      query: 'alpha',
      agency_id: 'agency-1',
      family: 'all',
      client_filter: 'all',
      prospect_filter: 'all',
      include_archived: false,
      limit: 5
    })).rejects.toBe(error);
  });


  it('builds deleteEntityContact RPC payload and parses void response', async () => {
    mockSafeRpc.mockReturnValue({} as never);

    deleteEntityContact('contact-1');

    const [call, parser] = mockSafeRpc.mock.calls[0] as [SafeRpcCall, SafeRpcParser, string];
    const { client, entityContactsPost } = createTrpcClientFixture();
    await call(client, { context: { headers: { 'x-request-id': 'req-2' } } });

    expect(entityContactsPost).toHaveBeenCalledWith({
          action: 'delete',
          contact_id: 'contact-1'
        },
      { context: { headers: { 'x-request-id': 'req-2' } } }
    );

    expect(parseTrpcContract(parser, { ok: true, contact_id: 'contact-1' })).toBeUndefined();
  });

  it('builds deleteSupplier RPC payload and parses deleted entity response', async () => {
    mockSafeRpc.mockReturnValue({} as never);

    deleteSupplier('supplier-1', true);

    const [call, parser] = mockSafeRpc.mock.calls[0] as [SafeRpcCall, SafeRpcParser, string];
    const { client, entitiesPost } = createTrpcClientFixture();
    await call(client, { context: { headers: { 'x-request-id': 'req-delete-supplier' } } });

    expect(entitiesPost).toHaveBeenCalledWith({
          action: 'delete',
          entity_id: 'supplier-1',
          delete_related_interactions: true
        },
      { context: { headers: { 'x-request-id': 'req-delete-supplier' } } }
    );

    const entity = entityRow({ id: 'supplier-1', entity_type: 'Fournisseur', agency_id: null });
    expect(parseTrpcContract(parser, { ok: true, entity })).toEqual(entity);
    expectRequestFailedError(parser);
  });

  it('builds setSupplierArchived RPC payload and parses updated entity response', async () => {
    mockSafeRpc.mockReturnValue({} as never);

    setSupplierArchived('supplier-2', true);

    const [call, parser] = mockSafeRpc.mock.calls[0] as [SafeRpcCall, SafeRpcParser, string];
    const { client, entitiesPost } = createTrpcClientFixture();
    await call(client, {});

    expect(entitiesPost).toHaveBeenCalledWith({
          action: 'archive',
          entity_id: 'supplier-2',
          archived: true
        },
      {}
    );

    const entity = entityRow({
      id: 'supplier-2',
      entity_type: 'Fournisseur',
      agency_id: null,
      archived_at: '2026-05-19T10:00:00.000Z'
    });
    expect(parseTrpcContract(parser, { ok: true, entity })).toEqual(entity);
    expectRequestFailedError(parser);
  });

  it('builds saveEntity payload for prospect and supplier entities', async () => {
    mockSafeRpc.mockReturnValue({} as never);

    saveEntity({
      entity_type: 'Prospect',
      name: 'Prospect 1',
      agency_id: 'agency-1'
    });

    let [call, parser] = mockSafeRpc.mock.calls[0] as [SafeRpcCall, SafeRpcParser, string];
    let { client, entitiesPost } = createTrpcClientFixture();
    await call(client, {});

    expect(entitiesPost).toHaveBeenCalledWith({
          action: 'save',
          agency_id: 'agency-1',
          entity_type: 'Prospect',
          id: undefined,
          primary_contact_id: null,
          official_data_resync: undefined,
          entity: {
            name: 'Prospect 1',
            city: '',
            address: undefined,
            postal_code: undefined,
            department: undefined,
            siret: undefined,
            siren: undefined,
            naf_code: undefined,
            official_name: undefined,
            official_data_source: undefined,
            official_data_synced_at: undefined,
            notes: undefined,
            agency_id: 'agency-1'
          }
        },
      {}
    );

    saveEntity({
      id: 'entity-3',
      entity_type: 'Fournisseur',
      name: 'Supplier 1',
      supplier_code: 'SUP1',
      supplier_number: '445566',
      city: 'Paris',
      address: '1 rue de Paris',
      postal_code: '75001',
      department: '75'
    });

    [call, parser] = mockSafeRpc.mock.calls[1] as [SafeRpcCall, SafeRpcParser, string];
    ({ client, entitiesPost } = createTrpcClientFixture());
    await call(client, {});

    expect(entitiesPost).toHaveBeenCalledWith({
          action: 'save',
          entity_type: 'Fournisseur',
          id: 'entity-3',
          entity: {
            name: 'Supplier 1',
            supplier_code: 'SUP1',
            supplier_number: '445566',
            city: 'Paris',
            address: '1 rue de Paris',
            postal_code: '75001',
            department: '75',
            siret: undefined,
            notes: undefined
          }
        },
      {}
    );

    const entity = entityRow({ id: 'entity-3', entity_type: 'Fournisseur', agency_id: null });
    expect(parseTrpcContract(parser, { ok: true, entity })).toEqual(entity);
    expectRequestFailedError(parser);
  });

  it('builds saveEntityContact payload and validates response', async () => {
    mockSafeRpc.mockReturnValue({} as never);

    saveEntityContact({
      id: 'contact-2',
      entity_id: 'entity-2',
      first_name: 'Jean',
      last_name: 'Dupont',
      email: 'jean@cir.fr',
      phone: '0102030405',
      position: 'Directeur',
      notes: 'VIP'
    });

    const [call, parser] = mockSafeRpc.mock.calls[0] as [SafeRpcCall, SafeRpcParser, string];
    const { client, entityContactsPost } = createTrpcClientFixture();
    await call(client, {});

    expect(entityContactsPost).toHaveBeenCalledWith({
          action: 'save',
          entity_id: 'entity-2',
          id: 'contact-2',
          contact: {
            first_name: 'Jean',
            last_name: 'Dupont',
            email: 'jean@cir.fr',
            phone: '0102030405',
            position: 'Directeur',
            service_label: '',
            notes: 'VIP'
          }
        },
      {}
    );

    const contact = contactRow({ id: 'contact-2', entity_id: 'entity-2' });
    expect(parseTrpcContract(parser, { ok: true, contact })).toEqual(contact);
    expectRequestFailedError(parser);
  });
});
