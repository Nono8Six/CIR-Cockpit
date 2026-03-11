import { keepPreviousData, useQuery } from '@tanstack/react-query';

import { type DirectoryDuplicatesInput } from 'shared/schemas/directory.schema';
import { getDirectoryDuplicates } from '@/services/directory/getDirectoryDuplicates';
import { directoryDuplicatesKey } from '@/services/query/queryKeys';
import { useNotifyError } from './useNotifyError';

export const useDirectoryDuplicates = (input: DirectoryDuplicatesInput, enabled = true) => {
  const query = useQuery({
    queryKey: directoryDuplicatesKey(input),
    queryFn: () => getDirectoryDuplicates(input),
    enabled,
    placeholderData: keepPreviousData,
    staleTime: 15_000
  });

  useNotifyError(query.error, 'Impossible de verifier les doublons', 'useDirectoryDuplicates');

  return query;
};
