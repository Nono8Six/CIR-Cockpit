import type { QueryClient } from '@tanstack/react-query';

import { getAdminUsers } from '@/services/admin/getAdminUsers';
import { adminUsersKey } from '@/services/query/queryKeys';

export const prefetchAdminPanelQueries = async (queryClient: QueryClient): Promise<void> => {
  await queryClient.prefetchQuery({
    queryKey: adminUsersKey(),
    queryFn: getAdminUsers
  });
};
