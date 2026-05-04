import { keepPreviousData, useQuery } from '@tanstack/react-query';

import type { DirectoryOptionsFacetInput } from 'shared/schemas/directory.schema';

import { getDirectoryOptionCommercials } from '@/services/directory/getDirectoryOptionCommercials';
import { directoryOptionCommercialsKey } from '@/services/query/queryKeys';
import { useNotifyError } from './useNotifyError';

export const useDirectoryOptionCommercials = (
  input: DirectoryOptionsFacetInput,
  enabled = true
) => {
  const query = useQuery({
    queryKey: directoryOptionCommercialsKey(input),
    queryFn: () => getDirectoryOptionCommercials(input),
    enabled,
    placeholderData: keepPreviousData,
    staleTime: 60_000
  });

  useNotifyError(query.error, "Impossible de charger les commerciaux de l'annuaire", 'useDirectoryOptionCommercials');

  return query;
};
