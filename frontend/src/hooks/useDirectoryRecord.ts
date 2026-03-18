import { keepPreviousData, useQuery } from '@tanstack/react-query';

import { type DirectoryRouteRef } from 'shared/schemas/directory.schema';
import { getDirectoryRecord } from '@/services/directory/getDirectoryRecord';
import { directoryRecordKey } from '@/services/query/queryKeys';
import { useNotifyError } from './useNotifyError';

export const useDirectoryRecord = (route: DirectoryRouteRef, enabled = true) => {
  const query = useQuery({
    queryKey: directoryRecordKey(route),
    queryFn: () => getDirectoryRecord(route),
    enabled,
    staleTime: 30_000,
    placeholderData: keepPreviousData
  });

  useNotifyError(query.error, "Impossible de charger la fiche annuaire", 'useDirectoryRecord');

  return query;
};
