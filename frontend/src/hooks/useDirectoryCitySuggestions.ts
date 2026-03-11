import { useQuery } from '@tanstack/react-query';

import { type DirectoryCitySuggestionsInput } from 'shared/schemas/directory.schema';
import { getDirectoryCitySuggestions } from '@/services/directory/getDirectoryCitySuggestions';
import { directoryCitySuggestionsKey } from '@/services/query/queryKeys';
import { useNotifyError } from './useNotifyError';

export const useDirectoryCitySuggestions = (
  input: DirectoryCitySuggestionsInput,
  enabled = true
) => {
  const normalizedQuery = input.q.trim();
  const shouldEnable = enabled && normalizedQuery.length >= 2;
  const query = useQuery({
    queryKey: directoryCitySuggestionsKey({ ...input, q: normalizedQuery }),
    queryFn: () => getDirectoryCitySuggestions({ ...input, q: normalizedQuery }),
    enabled: shouldEnable,
    staleTime: 30_000
  });

  useNotifyError(query.error, 'Impossible de charger les suggestions de villes.', 'useDirectoryCitySuggestions');

  return query;
};
