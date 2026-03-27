import type { QueryClient } from '@tanstack/react-query';
import { describe, expect, it, vi } from 'vitest';

import { getAdminUsers } from '@/services/admin/getAdminUsers';
import { adminUsersKey } from '@/services/query/queryKeys';
import { prefetchAdminPanelQueries } from '@/services/query/queryPrefetch';

vi.mock('@/services/admin/getAdminUsers', () => ({
  getAdminUsers: vi.fn()
}));

type QueryClientMock = QueryClient & {
  prefetchQuery: ReturnType<typeof vi.fn>;
};

const createQueryClientMock = (): QueryClientMock =>
  ({
    prefetchQuery: vi.fn().mockResolvedValue(undefined)
  }) as unknown as QueryClientMock;

describe('queryPrefetch', () => {
  it('prefetches admin users list', async () => {
    const queryClient = createQueryClientMock();

    await prefetchAdminPanelQueries(queryClient);

    expect(queryClient.prefetchQuery).toHaveBeenCalledWith({
      queryKey: adminUsersKey(),
      queryFn: getAdminUsers
    });
  });
});
