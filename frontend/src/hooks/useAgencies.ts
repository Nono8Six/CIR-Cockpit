import { useQuery } from '@tanstack/react-query';

import { getAgencies } from '@/services/agency/getAgencies';
import { agenciesKey } from '@/services/query/queryKeys';
import { useNotifyError } from './useNotifyError';

export const useAgencies = (includeArchived: boolean, enabled = true) => {
  const query = useQuery({
    queryKey: agenciesKey(includeArchived),
    queryFn: () => getAgencies(includeArchived),
    enabled
  });

  useNotifyError(query.error, 'Impossible de charger les agences', 'useAgencies');

  return query;
};
