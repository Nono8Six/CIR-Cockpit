import { useQuery } from '@tanstack/react-query';

import { getAdminUsers } from '@/services/admin/getAdminUsers';
import { adminUsersKey } from '@/services/query/queryKeys';
import { useNotifyError } from './useNotifyError';

export const useAdminUsers = (enabled = true) => {
  const query = useQuery({
    queryKey: adminUsersKey(),
    queryFn: getAdminUsers,
    enabled
  });

  useNotifyError(query.error, 'Impossible de charger les utilisateurs', 'useAdminUsers');

  return query;
};
