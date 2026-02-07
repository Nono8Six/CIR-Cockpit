import { useQuery } from '@tanstack/react-query';

import { getClients, GetClientsOptions } from '@/services/clients/getClients';
import { clientsKey } from '@/services/query/queryKeys';
import { useNotifyError } from './useNotifyError';

export const useClients = (options: GetClientsOptions, enabled = true) => {
  const query = useQuery({
    queryKey: clientsKey(options.agencyId ?? null, Boolean(options.includeArchived), Boolean(options.orphansOnly)),
    queryFn: () => getClients(options),
    enabled
  });

  useNotifyError(query.error, 'Impossible de charger les clients', 'useClients');

  return query;
};
