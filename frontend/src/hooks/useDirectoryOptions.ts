import { keepPreviousData, useQuery } from '@tanstack/react-query';

import { type DirectoryOptionsInput } from 'shared/schemas/directory.schema';
import { getDirectoryOptions } from '@/services/directory/getDirectoryOptions';
import { directoryOptionsKey } from '@/services/query/queryKeys';
import { useNotifyError } from './useNotifyError';

export const useDirectoryOptions = (input: DirectoryOptionsInput, enabled = true) => {
  const query = useQuery({
    queryKey: directoryOptionsKey(input),
    queryFn: () => getDirectoryOptions(input),
    enabled,
    placeholderData: keepPreviousData,
    staleTime: 60_000
  });

  useNotifyError(query.error, "Impossible de charger les filtres de l'annuaire", 'useDirectoryOptions');

  return query;
};
