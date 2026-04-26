import { describe, expect, it, vi } from 'vitest';

import type { TrpcClient } from '@/services/api/trpcClient';
import { invokeTrpc } from '@/services/api/safeTrpc';
import { getAdminUsers } from '@/services/admin/getAdminUsers';

vi.mock('../../api/safeTrpc');

const mockInvokeTrpc = vi.mocked(invokeTrpc);

describe('getAdminUsers', () => {
  it('calls the admin users-list tRPC query and returns validated users', async () => {
    mockInvokeTrpc.mockImplementationOnce(async (call, parser) => {
      const query = vi.fn();
      const client = {
        admin: {
          'users-list': { query }
        }
      } as unknown as TrpcClient;

      await call(client, { context: { headers: { 'x-request-id': 'users-test' } } });
      expect(query).toHaveBeenCalledWith({}, { context: { headers: { 'x-request-id': 'users-test' } } });

      return parser({
        ok: true,
        users: [
          {
            id: '11111111-1111-4111-8111-111111111111',
            email: 'a.ferron@cir.fr',
            display_name: 'FERRON Arnaud',
            first_name: 'Arnaud',
            last_name: 'FERRON',
            role: 'super_admin',
            archived_at: null,
            created_at: '2026-02-10T10:00:00.000Z',
            memberships: [
              {
                agency_id: '22222222-2222-4222-8222-222222222222',
                agency_name: 'CIR Paris'
              }
            ]
          }
        ]
      });
    });

    await expect(getAdminUsers()).resolves.toEqual([
      {
        id: '11111111-1111-4111-8111-111111111111',
        email: 'a.ferron@cir.fr',
        display_name: 'FERRON Arnaud',
        first_name: 'Arnaud',
        last_name: 'FERRON',
        role: 'super_admin',
        archived_at: null,
        created_at: '2026-02-10T10:00:00.000Z',
        memberships: [
          {
            agency_id: '22222222-2222-4222-8222-222222222222',
            agency_name: 'CIR Paris'
          }
        ]
      }
    ]);
  });

  it('rejects invalid response payloads', async () => {
    mockInvokeTrpc.mockImplementationOnce(async (_call, parser) => parser({ ok: true, users: [{ id: '' }] }));

    await expect(getAdminUsers()).rejects.toMatchObject({
      code: 'EDGE_INVALID_RESPONSE',
      message: 'Reponse serveur invalide.'
    });
  });
});
