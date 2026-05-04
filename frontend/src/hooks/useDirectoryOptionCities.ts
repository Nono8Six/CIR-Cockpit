import { keepPreviousData, useQuery } from '@tanstack/react-query';

import type { DirectoryOptionsCitiesInput } from 'shared/schemas/directory.schema';

import { getDirectoryOptionCities } from '@/services/directory/getDirectoryOptionCities';
import { directoryOptionCitiesKey } from '@/services/query/queryKeys';
import { useNotifyError } from './useNotifyError';

export const useDirectoryOptionCities = (
  input: DirectoryOptionsCitiesInput,
  enabled = true
) => {
  const query = useQuery({
    queryKey: directoryOptionCitiesKey(input),
    queryFn: () => getDirectoryOptionCities(input),
    enabled,
    placeholderData: keepPreviousData,
    staleTime: 60_000
  });

  useNotifyError(query.error, "Impossible de charger les villes de l'annuaire", 'useDirectoryOptionCities');

  return query;
};
