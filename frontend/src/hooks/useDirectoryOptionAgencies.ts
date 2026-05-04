import { keepPreviousData, useQuery } from '@tanstack/react-query';

import type { DirectoryOptionsAgenciesInput } from 'shared/schemas/directory.schema';

import { getDirectoryOptionAgencies } from '@/services/directory/getDirectoryOptionAgencies';
import { directoryOptionAgenciesKey } from '@/services/query/queryKeys';
import { useNotifyError } from './useNotifyError';

export const useDirectoryOptionAgencies = (
  input: DirectoryOptionsAgenciesInput,
  enabled = true
) => {
  const query = useQuery({
    queryKey: directoryOptionAgenciesKey(input),
    queryFn: () => getDirectoryOptionAgencies(input),
    enabled,
    placeholderData: keepPreviousData,
    staleTime: 60_000
  });

  useNotifyError(query.error, "Impossible de charger les agences de l'annuaire", 'useDirectoryOptionAgencies');

  return query;
};
