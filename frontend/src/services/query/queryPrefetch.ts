import type { QueryClient } from '@tanstack/react-query';

import { getAdminUsers } from '@/services/admin/getAdminUsers';
import { getClients } from '@/services/clients/getClients';
import { getProspects } from '@/services/entities/getProspects';
import { adminUsersKey, clientsKey, prospectsKey } from '@/services/query/queryKeys';

export const prefetchClientsPanelQueries = async (
  queryClient: QueryClient,
  agencyId: string
): Promise<void> => {
  await Promise.all([
    queryClient.prefetchQuery({
      queryKey: clientsKey(agencyId, false, false),
      queryFn: () => getClients({ agencyId, includeArchived: false, orphansOnly: false })
    }),
    queryClient.prefetchQuery({
      queryKey: prospectsKey(agencyId, false, false),
      queryFn: () => getProspects({ agencyId, includeArchived: false, orphansOnly: false })
    })
  ]);
};

export const prefetchAdminPanelQueries = async (queryClient: QueryClient): Promise<void> => {
  await queryClient.prefetchQuery({
    queryKey: adminUsersKey(),
    queryFn: getAdminUsers
  });
};
