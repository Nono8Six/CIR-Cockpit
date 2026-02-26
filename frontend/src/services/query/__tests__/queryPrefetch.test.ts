import type { QueryClient } from '@tanstack/react-query';
import { describe, expect, it, vi } from 'vitest';

import { getAdminUsers } from '@/services/admin/getAdminUsers';
import { getClients } from '@/services/clients/getClients';
import { getProspects } from '@/services/entities/getProspects';
import { adminUsersKey, clientsKey, prospectsKey } from '@/services/query/queryKeys';
import {
  prefetchAdminPanelQueries,
  prefetchClientsPanelQueries
} from '@/services/query/queryPrefetch';

vi.mock('@/services/admin/getAdminUsers', () => ({
  getAdminUsers: vi.fn()
}));
vi.mock('@/services/clients/getClients', () => ({
  getClients: vi.fn()
}));
vi.mock('@/services/entities/getProspects', () => ({
  getProspects: vi.fn()
}));

type QueryClientMock = QueryClient & {
  prefetchQuery: ReturnType<typeof vi.fn>;
};

const createQueryClientMock = (): QueryClientMock =>
  ({
    prefetchQuery: vi.fn().mockResolvedValue(undefined)
  }) as unknown as QueryClientMock;

describe('queryPrefetch', () => {
  it('prefetches clients panel data with agency scoped keys', async () => {
    const queryClient = createQueryClientMock();

    await prefetchClientsPanelQueries(queryClient, 'agency-1');

    expect(queryClient.prefetchQuery).toHaveBeenCalledTimes(2);
    expect(queryClient.prefetchQuery).toHaveBeenCalledWith({
      queryKey: clientsKey('agency-1', false, false),
      queryFn: expect.any(Function)
    });
    expect(queryClient.prefetchQuery).toHaveBeenCalledWith({
      queryKey: prospectsKey('agency-1', false, false),
      queryFn: expect.any(Function)
    });
  });

  it('prefetches admin users list', async () => {
    const queryClient = createQueryClientMock();

    await prefetchAdminPanelQueries(queryClient);

    expect(queryClient.prefetchQuery).toHaveBeenCalledWith({
      queryKey: adminUsersKey(),
      queryFn: getAdminUsers
    });
  });

  it('uses source query functions for clients/prospects prefetch', async () => {
    const queryClient = createQueryClientMock();
    const prefetchQuerySpy = queryClient.prefetchQuery.mockImplementation(async (options) => {
      if (!options) return undefined;
      await options.queryFn();
      return undefined;
    });

    vi.mocked(getClients).mockResolvedValue([]);
    vi.mocked(getProspects).mockResolvedValue([]);

    await prefetchClientsPanelQueries(queryClient, 'agency-1');

    expect(prefetchQuerySpy).toHaveBeenCalledTimes(2);
    expect(getClients).toHaveBeenCalledWith({
      agencyId: 'agency-1',
      includeArchived: false,
      orphansOnly: false
    });
    expect(getProspects).toHaveBeenCalledWith({
      agencyId: 'agency-1',
      includeArchived: false,
      orphansOnly: false
    });
  });
});
