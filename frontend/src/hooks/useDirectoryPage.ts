import { keepPreviousData, useQuery } from '@tanstack/react-query';

import { type DirectoryListInput } from 'shared/schemas/directory.schema';
import { getDirectoryPage } from '@/services/directory/getDirectoryPage';
import { directoryPageKey } from '@/services/query/queryKeys';
import { useNotifyError } from './useNotifyError';

export const useDirectoryPage = (input: DirectoryListInput, enabled = true) => {
  const query = useQuery({
    queryKey: directoryPageKey(input),
    queryFn: () => getDirectoryPage(input),
    enabled,
    placeholderData: keepPreviousData,
    staleTime: 15_000
  });

  useNotifyError(query.error, "Impossible de charger l'annuaire", 'useDirectoryPage');

  return query;
};
