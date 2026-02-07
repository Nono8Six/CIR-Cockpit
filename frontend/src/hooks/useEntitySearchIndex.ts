import { useQuery } from '@tanstack/react-query';

import { getEntitySearchIndex } from '@/services/entities/getEntitySearchIndex';
import { entitySearchIndexKey } from '@/services/query/queryKeys';
import { useNotifyError } from './useNotifyError';

export const useEntitySearchIndex = (
  agencyId: string | null,
  includeArchived: boolean,
  enabled: boolean
) => {
  const query = useQuery({
    queryKey: entitySearchIndexKey(agencyId, includeArchived),
    queryFn: () => getEntitySearchIndex(agencyId, includeArchived),
    enabled
  });

  useNotifyError(query.error, 'Impossible de charger la recherche des entites', 'useEntitySearchIndex');

  return query;
};
