import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createAppError } from '@/services/errors/AppError';
import { mapPostgrestError } from '@/services/errors/mapPostgrestError';
import { getAuditLogs } from '@/services/admin/getAuditLogs';
import { requireSupabaseClient } from '@/services/supabase/requireSupabaseClient';

vi.mock('../../supabase/requireSupabaseClient');
vi.mock('../../errors/mapPostgrestError');

type QueryResponse = {
  data: unknown;
  error: unknown;
  status: number;
};

type AuditQuery = Promise<QueryResponse> & {
  select: ReturnType<typeof vi.fn>;
  order: ReturnType<typeof vi.fn>;
  limit: ReturnType<typeof vi.fn>;
  eq: ReturnType<typeof vi.fn>;
  gte: ReturnType<typeof vi.fn>;
  lte: ReturnType<typeof vi.fn>;
};

const mockRequireSupabase = vi.mocked(requireSupabaseClient);
const mockMapPostgrestError = vi.mocked(mapPostgrestError);

const asSupabaseClient = (client: object): ReturnType<typeof requireSupabaseClient> =>
  client as unknown as ReturnType<typeof requireSupabaseClient>;

const createAuditQuery = (response: QueryResponse): AuditQuery => {
  const query = Promise.resolve(response) as AuditQuery;
  query.select = vi.fn(() => query);
  query.order = vi.fn(() => query);
  query.limit = vi.fn(() => query);
  query.eq = vi.fn(() => query);
  query.gte = vi.fn(() => query);
  query.lte = vi.fn(() => query);
  return query;
};

describe('getAuditLogs', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('applies filters and normalizes actor/agency payloads', async () => {
    const query = createAuditQuery({
      data: [
        {
          id: 'audit-1',
          action: 'profile.update',
          entity_table: 'profiles',
          entity_id: 'user-1',
          metadata: { key: 'value' },
          created_at: '2026-02-20T10:00:00.000Z',
          actor_id: 'user-1',
          actor_is_super_admin: false,
          agency_id: 'agency-1',
          actor: { id: 'user-1', display_name: 'Jean Dupont', email: 'jean@cir.fr' },
          agency: { id: 'agency-1', name: 'CIR Paris' }
        },
        {
          id: '',
          action: 'invalid'
        }
      ],
      error: null,
      status: 200
    });
    const from = vi.fn(() => ({ select: vi.fn(() => query) }));
    mockRequireSupabase.mockReturnValue(asSupabaseClient({ from }));

    const result = await getAuditLogs({
      agencyId: 'agency-1',
      actorId: 'user-1',
      entityTable: 'profiles',
      from: '2026-02-01T00:00:00.000Z',
      to: '2026-02-28T23:59:59.999Z',
      limit: 50
    });

    expect(from).toHaveBeenCalledWith('audit_logs');
    expect(query.eq).toHaveBeenCalledWith('agency_id', 'agency-1');
    expect(query.eq).toHaveBeenCalledWith('actor_id', 'user-1');
    expect(query.eq).toHaveBeenCalledWith('entity_table', 'profiles');
    expect(query.gte).toHaveBeenCalledWith('created_at', '2026-02-01T00:00:00.000Z');
    expect(query.lte).toHaveBeenCalledWith('created_at', '2026-02-28T23:59:59.999Z');
    expect(result).toEqual([
      {
        id: 'audit-1',
        action: 'profile.update',
        entity_table: 'profiles',
        entity_id: 'user-1',
        metadata: { key: 'value' },
        created_at: '2026-02-20T10:00:00.000Z',
        actor_id: 'user-1',
        actor_is_super_admin: false,
        agency_id: 'agency-1',
        actor: {
          id: 'user-1',
          display_name: 'Jean Dupont',
          email: 'jean@cir.fr'
        },
        agency: {
          id: 'agency-1',
          name: 'CIR Paris'
        }
      }
    ]);
  });

  it('maps postgrest errors', async () => {
    const mappedError = createAppError({
      code: 'DB_READ_FAILED',
      message: 'Erreur audits.',
      source: 'db'
    });
    mockMapPostgrestError.mockReturnValue(mappedError);

    const query = createAuditQuery({
      data: null,
      error: { message: 'permission denied' },
      status: 403
    });
    mockRequireSupabase.mockReturnValue(
      asSupabaseClient({
        from: vi.fn(() => ({ select: vi.fn(() => query) }))
      })
    );

    await expect(getAuditLogs()).rejects.toBe(mappedError);
    expect(mockMapPostgrestError).toHaveBeenCalledWith(
      { message: 'permission denied' },
      { operation: 'read', resource: 'les audits', status: 403 }
    );
  });
});
