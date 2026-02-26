import { beforeEach, describe, expect, it, vi } from 'vitest';

import { getCurrentUserId } from '@/services/auth/getCurrentUserId';
import { createAppError } from '@/services/errors/AppError';
import { mapPostgrestError } from '@/services/errors/mapPostgrestError';
import { getAgencies } from '@/services/agency/getAgencies';
import { getProfileActiveAgencyId } from '@/services/agency/getProfileActiveAgencyId';
import { setProfileActiveAgencyId } from '@/services/agency/setProfileActiveAgencyId';
import { requireSupabaseClient } from '@/services/supabase/requireSupabaseClient';

vi.mock('../../auth/getCurrentUserId');
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

  it('updates active agency id and returns ResultAsync success/error', async () => {
    mockGetCurrentUserId.mockResolvedValue('user-profile-2');

    const eqSuccess = vi.fn().mockResolvedValue({
      error: null,
      status: 200
    });
    const updateSuccess = vi.fn(() => ({ eq: eqSuccess }));
    mockRequireSupabase.mockReturnValue(asSupabaseClient({
      from: vi.fn(() => ({ update: updateSuccess }))
    }));

    const successOutcome = await setProfileActiveAgencyId('agency-1').match(
      () => 'ok',
      () => 'err'
    );
    expect(successOutcome).toBe('ok');
    expect(updateSuccess).toHaveBeenCalledWith({ active_agency_id: 'agency-1' });
    expect(eqSuccess).toHaveBeenCalledWith('id', 'user-profile-2');

    const mappedError = createAppError({
      code: 'AUTH_FORBIDDEN',
      message: 'Acces interdit.',
      source: 'db'
    });
    mockMapPostgrestError.mockReturnValue(mappedError);
    const eqError = vi.fn().mockResolvedValue({
      error: { message: 'forbidden' },
      status: 403
    });
    const updateError = vi.fn(() => ({ eq: eqError }));
    mockRequireSupabase.mockReturnValue(asSupabaseClient({
      from: vi.fn(() => ({ update: updateError }))
    }));

    const errorCode = await setProfileActiveAgencyId('agency-2').match(
      () => '',
      (error) => error.code
    );
    expect(errorCode).toBe('AUTH_FORBIDDEN');
  });
});
