import { useQuery } from '@tanstack/react-query';

import { type DirectoryCompanyDetailsInput } from 'shared/schemas/directory.schema';
import { getDirectoryCompanyDetails } from '@/services/directory/getDirectoryCompanyDetails';
import { directoryCompanyDetailsKey } from '@/services/query/queryKeys';

import { useNotifyError } from './useNotifyError';

export const useDirectoryCompanyDetails = (
  input: DirectoryCompanyDetailsInput,
  enabled = true
) => {
  const normalizedSiren = input.siren.trim();

  const query = useQuery({
    queryKey: directoryCompanyDetailsKey({ siren: normalizedSiren }),
    queryFn: () => getDirectoryCompanyDetails({ siren: normalizedSiren }),
    enabled: enabled && normalizedSiren.length === 9,
    retry: false,
    staleTime: 10 * 60_000
  });

  useNotifyError(
    query.error,
    "Impossible de charger les informations société",
    'useDirectoryCompanyDetails'
  );

  return query;
};
