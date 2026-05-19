import { keepPreviousData, useQuery } from '@tanstack/react-query';

import type { DirectoryOptionsFacetInput } from '../../../../../shared/schemas/system/directory.schema';

import { getDirectoryOptionDepartments } from '@/services/directory/getDirectoryOptionDepartments';
import { directoryOptionDepartmentsKey } from '@/services/query/queryKeys';
import { useNotifyError } from '../../cockpit-utils/useNotifyError';

export const useDirectoryOptionDepartments = (
  input: DirectoryOptionsFacetInput,
  enabled = true
) => {
  const query = useQuery({
    queryKey: directoryOptionDepartmentsKey(input),
    queryFn: () => getDirectoryOptionDepartments(input),
    enabled,
    placeholderData: keepPreviousData,
    staleTime: 60_000
  });

  useNotifyError(query.error, "Impossible de charger les departements de l'annuaire", 'useDirectoryOptionDepartments');

  return query;
};
