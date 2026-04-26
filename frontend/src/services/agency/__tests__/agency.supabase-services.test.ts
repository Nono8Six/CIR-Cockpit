import { beforeEach, describe, expect, it, vi } from 'vitest';

import { getCurrentUserId } from '@/services/auth/getCurrentUserId';
import { invokeTrpc } from '@/services/api/safeTrpc';
import { createAppError } from '@/services/errors/AppError';
import { mapPostgrestError } from '@/services/errors/mapPostgrestError';
import { getAgencies } from '@/services/agency/getAgencies';
import { getProfileActiveAgencyId } from '@/services/agency/getProfileActiveAgencyId';
import { setProfileActiveAgencyId } from '@/services/agency/setProfileActiveAgencyId';
import { requireSupabaseClient } from '@/services/supabase/requireSupabaseClient';

vi.mock('../../auth/getCurrentUserId');
vi.mock('../../api/safeTrpc');
vi.mock('../../errors/mapPostgrestError');
vi.mock('../../supabase/requireSupabaseClient');

type QueryResponse = {
  data?: unknown;
  error: unknown;
  status: number;
};

type ListQuery = Promise<QueryResponse> & {
  select: ReturnType<typeof vi.fn>;
  order: ReturnType<typeof vi.fn>;
  is: ReturnType<typeof vi.fn>;
};

const mockGetCurrentUserId = vi.mocked(getCurrentUserId);
const mockInvokeTrpc = vi.mocked(invokeTrpc);
const mockMapPostgrestError = vi.mocked(mapPostgrestError);
const mockRequireSupabase = vi.mocked(requireSupabaseClient);
const asSupabaseClient = (client: object): ReturnType<typeof requireSupabaseClient> =>
  client as unknown as ReturnType<typeof requireSupabaseClient>;

const createListQuery = (response: QueryResponse): ListQuery => {
  const query = Promise.resolve(response) as ListQuery;
  query.select = vi.fn(() => query);
  query.order = vi.fn(() => query);
  query.is = vi.fn(() => query);
  return query;
};

describe('agency supabase services', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('loads agencies with archived filter by default', async () => {
    const rows = [{ id: 'agency-1', name: 'CIR Paris' }];
    const agenciesQuery = createListQuery({ data: rows, error: null, status: 200 });
    const from = vi.fn(() => ({ select: vi.fn(() => agenciesQuery) }));
    mockRequireSupabase.mockReturnValue(asSupabaseClient({ from }));

    const result = await getAgencies();

    expect(from).toHaveBeenCalledWith('agencies');
    expect(agenciesQuery.order).toHaveBeenCalledWith('name', { ascending: true });
    expect(agenciesQuery.is).toHaveBeenCalledWith('archived_at', null);
    expect(result).toEqual(rows);
  });

  it('loads profile active agency id and maps errors', async () => {
    mockGetCurrentUserId.mockResolvedValue('user-profile-1');
    const profileQueryOk = {
      eq: vi.fn().mockReturnValue({
        maybeSingle: vi.fn().mockResolvedValue({
          data: { active_agency_id: 'agency-1' },
          error: null,
          status: 200
        })
      })
    };
    const from = vi.fn(() => ({
      select: vi.fn(() => profileQueryOk)
    }));
    mockRequireSupabase.mockReturnValue(asSupabaseClient({ from }));

    const activeAgencyId = await getProfileActiveAgencyId();
    expect(activeAgencyId).toBe('agency-1');

    const mappedError = createAppError({
      code: 'DB_READ_FAILED',
      message: 'Erreur lecture profil.',
      source: 'db'
    });
    mockMapPostgrestError.mockReturnValue(mappedError);
    const profileQueryError = {
      eq: vi.fn().mockReturnValue({
        maybeSingle: vi.fn().mockResolvedValue({
          data: null,
          error: { message: 'permission denied' },
          status: 403
        })
      })
    };
    mockRequireSupabase.mockReturnValue(asSupabaseClient({
      from: vi.fn(() => ({ select: vi.fn(() => profileQueryError) }))
    }));

    await expect(getProfileActiveAgencyId()).rejects.toBe(mappedError);
    expect(mockMapPostgrestError).toHaveBeenCalledWith(
      { message: 'permission denied' },
      { operation: 'read', resource: "l'agence active", status: 403 }
    );
  });

  it('updates active agency id through data.profile and returns ResultAsync success/error', async () => {
    mockInvokeTrpc.mockImplementationOnce(async (call, parseResponse) => {
      const mutate = vi.fn().mockResolvedValue({ ok: true });

      const payload = await call(
        { data: { profile: { mutate } } } as unknown as Parameters<typeof call>[0],
        {}
      );
      expect(mutate).toHaveBeenCalledWith({
        action: 'set_active_agency',
        agency_id: 'agency-1'
      }, {});

      return parseResponse(payload);
    });

    const successOutcome = await setProfileActiveAgencyId('agency-1').match(
      () => 'ok',
      () => 'err'
    );
    expect(successOutcome).toBe('ok');

    mockInvokeTrpc.mockRejectedValueOnce(createAppError({
      code: 'AUTH_FORBIDDEN',
      message: 'Acces interdit.',
      source: 'edge'
    }));

    const errorCode = await setProfileActiveAgencyId('agency-2').match(
      () => '',
      (error) => error.code
    );
    expect(errorCode).toBe('AUTH_FORBIDDEN');
  });
});
