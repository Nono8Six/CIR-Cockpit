import { describe, expect, it, vi } from 'vitest';

import type { TrpcClient } from '@/services/api/trpcClient';
import { safeTrpc } from '@/services/api/safeTrpc';
import { getClients } from '@/services/clients/getClients';
import { convertEntityToClient } from '@/services/entities/convertEntityToClient';
import { deleteEntityContact } from '@/services/entities/deleteEntityContact';
import { getEntityContacts } from '@/services/entities/getEntityContacts';
import { getEntitySearchIndex } from '@/services/entities/getEntitySearchIndex';
import { getProspects } from '@/services/entities/getProspects';
import { reassignEntity } from '@/services/entities/reassignEntity';
import { saveEntity } from '@/services/entities/saveEntity';
import { saveEntityContact } from '@/services/entities/saveEntityContact';

vi.mock('../../api/safeTrpc');

type SafeRpcCall = Parameters<typeof safeTrpc>[0];
type SafeRpcParser = Parameters<typeof safeTrpc>[1];

const mockSafeRpc = vi.mocked(safeTrpc);

const createTrpcClientFixture = () => {
  const entitiesPost = vi.fn().mockResolvedValue(new Response('{}', { status: 200 }));
  const entityContactsPost = vi.fn().mockResolvedValue(new Response('{}', { status: 200 }));

  const client = {
    data: {
      profile: { mutate: vi.fn() },
      config: { mutate: vi.fn() },
      entities: { mutate: entitiesPost },
      'entity-contacts': { mutate: entityContactsPost },
      interactions: { mutate: vi.fn() }
    },
    admin: {
      users: { mutate: vi.fn() },
      agencies: { mutate: vi.fn() }
    }
  } as unknown as TrpcClient;

  return { client, entitiesPost, entityContactsPost };
};

const expectRequestFailedError = (parser: SafeRpcParser) => {
  try {
    parser({});
  } catch (error) {
    expect(error).toMatchObject({ code: 'REQUEST_FAILED' });
    return;
  }
  throw new Error('Expected parser to throw REQUEST_FAILED.');
};

describe('entities RPC services', () => {
  it('builds getClients RPC payload and parses list response', async () => {
    const match = vi.fn();
    mockSafeRpc.mockReturnValue({ match } as never);

    await getClients({
      agencyId: 'agency-1',
      includeArchived: true,
      orphansOnly: false
    });

    expect(mockSafeRpc).toHaveBeenCalledWith(
      expect.any(Function),
      expect.any(Function),
      'Impossible de charger les clients.'
    );

    const [call, parser] = mockSafeRpc.mock.calls[0] as [SafeRpcCall, SafeRpcParser, string];
    const { client, entitiesPost } = createTrpcClientFixture();
    await call(client, { context: { headers: { 'x-request-id': 'req-clients' } } });

    expect(entitiesPost).toHaveBeenCalledWith({
          action: 'list',
          entity_type: 'Client',
          agency_id: 'agency-1',
          include_archived: true,
          orphans_only: false
        },
      { context: { headers: { 'x-request-id': 'req-clients' } } }
    );

    const clients = [{ id: 'client-1' }, { id: 'client-2' }];
    expect(parser({ ok: true, entities: clients })).toEqual(clients);
    expectRequestFailedError(parser);
  });

  it('requests orphan clients explicitly', async () => {
    const match = vi.fn();
    mockSafeRpc.mockReturnValue({ match } as never);

    await getClients({ orphansOnly: true });

    const [call] = mockSafeRpc.mock.calls[0] as [SafeRpcCall, SafeRpcParser, string];
    const { client, entitiesPost } = createTrpcClientFixture();
    await call(client, {});

    expect(entitiesPost).toHaveBeenCalledWith({
          action: 'list',
          entity_type: 'Client',
          agency_id: null,
          include_archived: false,
          orphans_only: true
        },
      {}
    );
  });

  it('builds getProspects RPC payload and parses list response', async () => {
    const match = vi.fn();
    mockSafeRpc.mockReturnValue({ match } as never);

    await getProspects({
      agencyId: 'agency-1',
      includeArchived: true,
      orphansOnly: false
    });

    expect(mockSafeRpc).toHaveBeenCalledWith(
      expect.any(Function),
      expect.any(Function),
      'Impossible de charger les prospects.'
    );

    const [call, parser] = mockSafeRpc.mock.calls[0] as [SafeRpcCall, SafeRpcParser, string];
    const { client, entitiesPost } = createTrpcClientFixture();
    await call(client, {});

    expect(entitiesPost).toHaveBeenCalledWith({
          action: 'list',
          entity_type: 'Prospect',
          agency_id: 'agency-1',
          include_archived: true,
          orphans_only: false
        },
      {}
    );

    const prospects = [{ id: 'prospect-1' }];
    expect(parser({ ok: true, entities: prospects })).toEqual(prospects);
    expectRequestFailedError(parser);
  });

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

    const contacts = [{ id: 'contact-1' }];
    expect(parser({ ok: true, contacts })).toEqual(contacts);
    expectRequestFailedError(parser);
  });

  it('returns an empty search index without agency id', async () => {
    const result = await getEntitySearchIndex(null);

    expect(result).toEqual({ entities: [], contacts: [] });
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

    const entities = [{ id: 'entity-1' }];
    const contacts = [{ id: 'contact-1', entity_id: 'entity-1' }];
    expect(parser({ ok: true, entities, contacts })).toEqual({ entities, contacts });
    expectRequestFailedError(parser);
  });

  it('builds convertEntityToClient RPC payload and parses response', async () => {
    mockSafeRpc.mockReturnValue({} as never);

    convertEntityToClient({
      id: 'entity-1',
      client_number: '12345',
      account_type: 'term'
    });

    expect(mockSafeRpc).toHaveBeenCalledWith(
      expect.any(Function),
      expect.any(Function),
      'Impossible de convertir en client.'
    );

    const [call, parser] = mockSafeRpc.mock.calls[0] as [SafeRpcCall, SafeRpcParser, string];
    const { client, entitiesPost } = createTrpcClientFixture();
    await call(client, { context: { headers: { 'x-request-id': 'req-1' } } });

    expect(entitiesPost).toHaveBeenCalledWith({
          action: 'convert_to_client',
          entity_id: 'entity-1',
          convert: {
            client_number: '12345',
            account_type: 'term'
          }
        },
      { context: { headers: { 'x-request-id': 'req-1' } } }
    );

    const entity = { id: 'entity-1' };
    expect(parser({ ok: true, entity })).toBe(entity);
    expectRequestFailedError(parser);
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

    expect(parser({ any: 'value' })).toBeUndefined();
  });

  it('builds reassignEntity RPC payload and validates propagated count', async () => {
    mockSafeRpc.mockReturnValue({} as never);

    reassignEntity({
      entity_id: 'entity-2',
      target_agency_id: 'agency-2'
    });

    expect(mockSafeRpc).toHaveBeenCalledWith(
      expect.any(Function),
      expect.any(Function),
      "Impossible de reassigner l'entite."
    );

    const [call, parser] = mockSafeRpc.mock.calls[0] as [SafeRpcCall, SafeRpcParser, string];
    const { client, entitiesPost } = createTrpcClientFixture();
    await call(client, {});

    expect(entitiesPost).toHaveBeenCalledWith({
          action: 'reassign',
          entity_id: 'entity-2',
          target_agency_id: 'agency-2'
        },
      {}
    );

    const entity = { id: 'entity-2' };
    expect(
      parser({
        ok: true,
        entity,
        propagated_interactions_count: 3
      })
    ).toEqual({
      entity,
      propagated_interactions_count: 3
    });

    expectRequestFailedError(parser);
    expect(() =>
      parser({
        ok: true,
        entity,
        propagated_interactions_count: 'bad'
      })
    ).toThrow();
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
          entity: {
            name: 'Prospect 1',
            city: '',
            address: undefined,
            postal_code: undefined,
            department: undefined,
            siret: undefined,
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
      agency_id: 'agency-1',
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
          agency_id: 'agency-1',
          entity_type: 'Fournisseur',
          id: 'entity-3',
          entity: {
            name: 'Supplier 1',
            city: 'Paris',
            address: '1 rue de Paris',
            postal_code: '75001',
            department: '75',
            siret: undefined,
            notes: undefined,
            agency_id: 'agency-1'
          }
        },
      {}
    );

    const entity = { id: 'entity-3' };
    expect(parser({ ok: true, entity })).toBe(entity);
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
            notes: 'VIP'
          }
        },
      {}
    );

    const contact = { id: 'contact-2' };
    expect(parser({ ok: true, contact })).toBe(contact);
    expectRequestFailedError(parser);
  });
});
