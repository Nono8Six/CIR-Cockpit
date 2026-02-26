import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createAppError } from '@/services/errors/AppError';
import { getCurrentUserId } from '@/services/auth/getCurrentUserId';
import { mapPostgrestError } from '@/services/errors/mapPostgrestError';
import { getAgencyMemberships } from '@/services/agency/getAgencyMemberships';
import { requireSupabaseClient } from '@/services/supabase/requireSupabaseClient';

vi.mock('../../auth/getCurrentUserId');
vi.mock('../../errors/mapPostgrestError');
vi.mock('../../supabase/requireSupabaseClient');

type QueryResponse = {
  data: unknown;
  error: unknown;
  status: number;
};

type MembershipQuery = Promise<QueryResponse> & {
  eq: ReturnType<typeof vi.fn>;
  order: ReturnType<typeof vi.fn>;
};

const mockGetCurrentUserId = vi.mocked(getCurrentUserId);
const mockMapPostgrestError = vi.mocked(mapPostgrestError);
const mockRequireSupabase = vi.mocked(requireSupabaseClient);
const asSupabaseClient = (client: object): ReturnType<typeof requireSupabaseClient> =>
  client as unknown as ReturnType<typeof requireSupabaseClient>;

const createMembershipQuery = (response: QueryResponse): MembershipQuery => {
  const query = Promise.resolve(response) as MembershipQuery;
  query.eq = vi.fn(() => query);
  query.order = vi.fn(() => query);
  return query;
};

describe('getAgencyMemberships', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns normalized memberships and caches per user', async () => {
    mockGetCurrentUserId.mockResolvedValue('user-1');
    const query = createMembershipQuery({
      data: [
        {
          agency_id: 'agency-1',
          agencies: { id: 'agency-1', name: 'CIR Paris' }
        },
        {
          agency_id: 'agency-2',
          agencies: { id: 'agency-2', name: 'CIR Lyon' }
        }
      ],
      error: null,
      status: 200
    });
    const select = vi.fn(() => query);
    const from = vi.fn(() => ({ select }));
    mockRequireSupabase.mockReturnValue(asSupabaseClient({ from }));

    const firstResult = await getAgencyMemberships();
    const secondResult = await getAgencyMemberships();

    expect(firstResult).toEqual([
      { agency_id: 'agency-1', agency_name: 'CIR Paris' },
      { agency_id: 'agency-2', agency_name: 'CIR Lyon' }
    ]);
    expect(secondResult).toEqual(firstResult);
    expect(from).toHaveBeenCalledTimes(1);
    expect(query.eq).toHaveBeenCalledWith('user_id', 'user-1');
    expect(query.order).toHaveBeenCalledWith('created_at', { ascending: true });
  });

  it('throws MEMBERSHIP_NOT_FOUND when no valid rows exist and allowEmpty is false', async () => {
    mockGetCurrentUserId.mockResolvedValue('user-2');
    const query = createMembershipQuery({
      data: [{ agency_id: '', agencies: null }],
      error: null,
      status: 200
    });
    mockRequireSupabase.mockReturnValue(
      asSupabaseClient({ from: vi.fn(() => ({ select: vi.fn(() => query) })) })
    );

    await expect(getAgencyMemberships()).rejects.toMatchObject({
      code: 'MEMBERSHIP_NOT_FOUND'
    });
  });

  it('returns empty list when no memberships exist and allowEmpty is true', async () => {
    mockGetCurrentUserId.mockResolvedValue('user-3');
    const query = createMembershipQuery({
      data: [],
      error: null,
      status: 200
    });
    mockRequireSupabase.mockReturnValue(
      asSupabaseClient({ from: vi.fn(() => ({ select: vi.fn(() => query) })) })
    );

    const result = await getAgencyMemberships(true);
    expect(result).toEqual([]);
  });

  it('maps postgrest errors', async () => {
    mockGetCurrentUserId.mockResolvedValue('user-4');
    const mappedError = createAppError({
      code: 'DB_READ_FAILED',
      message: 'Erreur lecture.',
      source: 'db'
    });
    mockMapPostgrestError.mockReturnValue(mappedError);

    const query = createMembershipQuery({
      data: null,
      error: { message: 'db fail' },
      status: 503
    });
    mockRequireSupabase.mockReturnValue(
      asSupabaseClient({ from: vi.fn(() => ({ select: vi.fn(() => query) })) })
    );

    await expect(getAgencyMemberships()).rejects.toBe(mappedError);
    expect(mockMapPostgrestError).toHaveBeenCalledWith(
      { message: 'db fail' },
      { operation: 'read', resource: 'les agences', status: 503 }
    );
  });
});
