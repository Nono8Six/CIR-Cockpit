import { beforeEach, describe, expect, it, vi } from 'vitest';

import { getCurrentUserId } from '@/services/auth/getCurrentUserId';
import { getActiveAgencyContext, setActiveAgencyId } from '@/services/agency/getActiveAgencyContext';
import { getActiveAgencyId } from '@/services/agency/getActiveAgencyId';
import { getAgencyMemberships } from '@/services/agency/getAgencyMemberships';

vi.mock('../../auth/getCurrentUserId');
vi.mock('../getAgencyMemberships');

const mockGetCurrentUserId = vi.mocked(getCurrentUserId);
const mockGetAgencyMemberships = vi.mocked(getAgencyMemberships);

describe('getActiveAgencyContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setActiveAgencyId('reset');
    setActiveAgencyId(null);
  });

  it('returns first membership by default and caches by user', async () => {
    mockGetCurrentUserId.mockResolvedValue('user-ctx-1');
    mockGetAgencyMemberships.mockResolvedValue([
      { agency_id: 'agency-1', agency_name: 'CIR Paris' },
      { agency_id: 'agency-2', agency_name: 'CIR Lyon' }
    ]);

    const first = await getActiveAgencyContext();
    const second = await getActiveAgencyContext();
    const agencyId = await getActiveAgencyId();

    expect(first).toEqual({ agency_id: 'agency-1', agency_name: 'CIR Paris' });
    expect(second).toEqual(first);
    expect(agencyId).toBe('agency-1');
    expect(mockGetAgencyMemberships).toHaveBeenCalledTimes(1);
  });

  it('respects preferred agency when setActiveAgencyId is called', async () => {
    mockGetCurrentUserId.mockResolvedValue('user-ctx-2');
    mockGetAgencyMemberships.mockResolvedValue([
      { agency_id: 'agency-1', agency_name: 'CIR Paris' },
      { agency_id: 'agency-2', agency_name: 'CIR Lyon' }
    ]);

    const initial = await getActiveAgencyContext();
    setActiveAgencyId('agency-2');
    const preferred = await getActiveAgencyContext();

    expect(initial.agency_id).toBe('agency-1');
    expect(preferred).toEqual({ agency_id: 'agency-2', agency_name: 'CIR Lyon' });
    expect(mockGetAgencyMemberships).toHaveBeenCalledTimes(2);
  });

  it('throws MEMBERSHIP_NOT_FOUND when memberships are empty', async () => {
    mockGetCurrentUserId.mockResolvedValue('user-ctx-3');
    mockGetAgencyMemberships.mockResolvedValue([]);

    await expect(getActiveAgencyContext()).rejects.toMatchObject({
      code: 'MEMBERSHIP_NOT_FOUND'
    });
  });
});
