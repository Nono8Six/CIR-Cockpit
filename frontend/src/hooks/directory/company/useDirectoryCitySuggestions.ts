import { useQuery } from '@tanstack/react-query';

import { type DirectoryCitySuggestionsInput } from '../../../../../shared/schemas/system/directory.schema';
import { getDirectoryOptionCities } from '@/services/directory/getDirectoryOptionCities';
import { directoryOptionCitiesKey } from '@/services/query/queryKeys';
import { useNotifyError } from '../../cockpit-utils/useNotifyError';

export const useDirectoryCitySuggestions = (
  input: DirectoryCitySuggestionsInput,
  enabled = true
) => {
  const normalizedQuery = input.q.trim();
  const shouldEnable = enabled && normalizedQuery.length >= 2;
  const query = useQuery({
    queryKey: directoryOptionCitiesKey({ ...input, q: normalizedQuery }),
    queryFn: () => getDirectoryOptionCities({ ...input, q: normalizedQuery }),
    enabled: shouldEnable,
    staleTime: 30_000
  });

  useNotifyError(query.error, 'Impossible de charger les suggestions de villes.', 'useDirectoryCitySuggestions');

  return query;
};
