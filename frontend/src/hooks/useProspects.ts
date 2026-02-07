import { useQuery } from '@tanstack/react-query';

import { getProspects, GetProspectsOptions } from '@/services/entities/getProspects';
import { prospectsKey } from '@/services/query/queryKeys';
import { useNotifyError } from './useNotifyError';

export const useProspects = (options: GetProspectsOptions, enabled = true) => {
  const query = useQuery({
    queryKey: prospectsKey(options.agencyId ?? null, Boolean(options.includeArchived), Boolean(options.orphansOnly)),
    queryFn: () => getProspects(options),
    enabled
  });

  useNotifyError(query.error, 'Impossible de charger les prospects', 'useProspects');

  return query;
};
