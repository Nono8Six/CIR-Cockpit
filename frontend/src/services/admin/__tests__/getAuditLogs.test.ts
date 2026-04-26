import { describe, expect, it, vi } from 'vitest';

import type { TrpcClient } from '@/services/api/trpcClient';
import { invokeTrpc } from '@/services/api/safeTrpc';
import { getAuditLogs } from '@/services/admin/getAuditLogs';

vi.mock('../../api/safeTrpc');

const mockInvokeTrpc = vi.mocked(invokeTrpc);

describe('getAuditLogs', () => {
  it('maps filters to the admin audit-logs tRPC query and returns validated logs', async () => {
    mockInvokeTrpc.mockImplementationOnce(async (call, parser) => {
      const query = vi.fn();
      const client = {
        admin: {
          'audit-logs': { query }
        }
      } as unknown as TrpcClient;

      await call(client, { context: { headers: { 'x-request-id': 'audit-test' } } });
      expect(query).toHaveBeenCalledWith(
        {
          agency_id: '22222222-2222-4222-8222-222222222222',
          actor_id: '11111111-1111-4111-8111-111111111111',
          entity_table: 'profiles',
          from: '2026-02-01T00:00:00.000Z',
          to: '2026-02-28T23:59:59.999Z',
          limit: 50
        },
        { context: { headers: { 'x-request-id': 'audit-test' } } }
      );

      return parser({
        ok: true,
        logs: [
          {
            id: '33333333-3333-4333-8333-333333333333',
            action: 'profile.update',
            entity_table: 'profiles',
            entity_id: '11111111-1111-4111-8111-111111111111',
            metadata: { key: 'value' },
            created_at: '2026-02-20T10:00:00.000Z',
            actor_id: '11111111-1111-4111-8111-111111111111',
            actor_is_super_admin: false,
            agency_id: '22222222-2222-4222-8222-222222222222',
            actor: {
              id: '11111111-1111-4111-8111-111111111111',
              display_name: 'Jean Dupont',
              email: 'jean@cir.fr'
            },
            agency: {
              id: '22222222-2222-4222-8222-222222222222',
              name: 'CIR Paris'
            }
          }
        ]
      });
    });

    await expect(getAuditLogs({
      agencyId: '22222222-2222-4222-8222-222222222222',
      actorId: '11111111-1111-4111-8111-111111111111',
      entityTable: 'profiles',
      from: '2026-02-01T00:00:00.000Z',
      to: '2026-02-28T23:59:59.999Z',
      limit: 50
    })).resolves.toEqual([
      {
        id: '33333333-3333-4333-8333-333333333333',
        action: 'profile.update',
        entity_table: 'profiles',
        entity_id: '11111111-1111-4111-8111-111111111111',
        metadata: { key: 'value' },
        created_at: '2026-02-20T10:00:00.000Z',
        actor_id: '11111111-1111-4111-8111-111111111111',
        actor_is_super_admin: false,
        agency_id: '22222222-2222-4222-8222-222222222222',
        actor: {
          id: '11111111-1111-4111-8111-111111111111',
          display_name: 'Jean Dupont',
          email: 'jean@cir.fr'
        },
        agency: {
          id: '22222222-2222-4222-8222-222222222222',
          name: 'CIR Paris'
        }
      }
    ]);
  });

  it('sends null filters by default', async () => {
    mockInvokeTrpc.mockImplementationOnce(async (call, parser) => {
      const query = vi.fn();
      const client = {
        admin: {
          'audit-logs': { query }
        }
      } as unknown as TrpcClient;

      await call(client, {});
      expect(query).toHaveBeenCalledWith(
        {
          agency_id: null,
          actor_id: null,
          entity_table: null,
          from: null,
          to: null,
          limit: undefined
        },
        {}
      );
      return parser({ ok: true, logs: [] });
    });

    await expect(getAuditLogs()).resolves.toEqual([]);
  });

  it('rejects invalid response payloads', async () => {
    mockInvokeTrpc.mockImplementationOnce(async (_call, parser) => parser({ ok: true, logs: [{ id: '' }] }));

    await expect(getAuditLogs()).rejects.toMatchObject({
      code: 'EDGE_INVALID_RESPONSE',
      message: 'Reponse serveur invalide.'
    });
  });
});
