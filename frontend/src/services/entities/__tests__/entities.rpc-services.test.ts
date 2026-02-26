import { describe, expect, it, vi } from 'vitest';

import type { RpcClient } from '@/services/api/rpcClient';
import { safeRpc } from '@/services/api/safeRpc';
import { convertEntityToClient } from '@/services/entities/convertEntityToClient';
import { deleteEntityContact } from '@/services/entities/deleteEntityContact';
import { reassignEntity } from '@/services/entities/reassignEntity';
import { saveEntity } from '@/services/entities/saveEntity';
import { saveEntityContact } from '@/services/entities/saveEntityContact';

vi.mock('../../api/safeRpc');

type SafeRpcCall = Parameters<typeof safeRpc>[0];
type SafeRpcParser = Parameters<typeof safeRpc>[1];

const mockSafeRpc = vi.mocked(safeRpc);

const createRpcClient = () => {
  const entitiesPost = vi.fn().mockResolvedValue(new Response('{}', { status: 200 }));
  const entityContactsPost = vi.fn().mockResolvedValue(new Response('{}', { status: 200 }));

  const client = {
    data: {
      profile: { $post: vi.fn() },
      config: { $post: vi.fn() },
      entities: { $post: entitiesPost },
      'entity-contacts': { $post: entityContactsPost },
      interactions: { $post: vi.fn() }
    },
    admin: {
      users: { $post: vi.fn() },
      agencies: { $post: vi.fn() }
    }
  } as unknown as RpcClient;

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
    const { client, entitiesPost } = createRpcClient();
    await call(client, { headers: { 'x-request-id': 'req-1' } });

    expect(entitiesPost).toHaveBeenCalledWith(
      {
        json: {
          action: 'convert_to_client',
          entity_id: 'entity-1',
          convert: {
            client_number: '12345',
            account_type: 'term'
          }
        }
      },
      { headers: { 'x-request-id': 'req-1' } }
    );

    const entity = { id: 'entity-1' };
    expect(parser({ ok: true, entity })).toBe(entity);
    expectRequestFailedError(parser);
  });

  it('builds deleteEntityContact RPC payload and parses void response', async () => {
    mockSafeRpc.mockReturnValue({} as never);

    deleteEntityContact('contact-1');

    const [call, parser] = mockSafeRpc.mock.calls[0] as [SafeRpcCall, SafeRpcParser, string];
    const { client, entityContactsPost } = createRpcClient();
    await call(client, { headers: { 'x-request-id': 'req-2' } });

    expect(entityContactsPost).toHaveBeenCalledWith(
      {
        json: {
          action: 'delete',
          contact_id: 'contact-1'
        }
      },
      { headers: { 'x-request-id': 'req-2' } }
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
    const { client, entitiesPost } = createRpcClient();
    await call(client, {});

    expect(entitiesPost).toHaveBeenCalledWith(
      {
        json: {
          action: 'reassign',
          entity_id: 'entity-2',
          target_agency_id: 'agency-2'
        }
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

  it('builds saveEntity payload for prospect and client entities', async () => {
    mockSafeRpc.mockReturnValue({} as never);

    saveEntity({
      entity_type: 'Prospect',
      name: 'Prospect 1',
      agency_id: 'agency-1'
    });

    let [call, parser] = mockSafeRpc.mock.calls[0] as [SafeRpcCall, SafeRpcParser, string];
    let { client, entitiesPost } = createRpcClient();
    await call(client, {});

    expect(entitiesPost).toHaveBeenCalledWith(
      {
        json: {
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
        }
      },
      {}
    );

    saveEntity({
      id: 'entity-3',
      entity_type: 'Client',
      name: 'Client 1',
      agency_id: 'agency-1',
      city: 'Paris',
      client_number: 'C-001',
      account_type: 'term'
    });

    [call, parser] = mockSafeRpc.mock.calls[1] as [SafeRpcCall, SafeRpcParser, string];
    ({ client, entitiesPost } = createRpcClient());
    await call(client, {});

    expect(entitiesPost).toHaveBeenCalledWith(
      {
        json: {
          action: 'save',
          agency_id: 'agency-1',
          entity_type: 'Client',
          id: 'entity-3',
          entity: {
            name: 'Client 1',
            city: 'Paris',
            address: undefined,
            postal_code: undefined,
            department: undefined,
            siret: undefined,
            notes: undefined,
            agency_id: 'agency-1',
            client_number: 'C-001',
            account_type: 'term'
          }
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
    const { client, entityContactsPost } = createRpcClient();
    await call(client, {});

    expect(entityContactsPost).toHaveBeenCalledWith(
      {
        json: {
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
        }
      },
      {}
    );

    const contact = { id: 'contact-2' };
    expect(parser({ ok: true, contact })).toBe(contact);
    expectRequestFailedError(parser);
  });
});
