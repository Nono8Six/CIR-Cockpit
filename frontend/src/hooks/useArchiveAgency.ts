import { useMutation, useQueryClient } from '@tanstack/react-query';

import { adminAgenciesArchive } from '@/services/admin/adminAgenciesArchive';
import { invalidateAgenciesQueries } from '@/services/query/queryInvalidation';
import { handleUiError } from '@/services/errors/handleUiError';
import { mapAdminDomainError } from '@/services/errors/mapAdminDomainError';

export const useArchiveAgency = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (agencyId: string) =>
      adminAgenciesArchive(agencyId).match(
        (response) => response,
        (error) => {
          throw error;
        }
      ),
    onSuccess: () => {
      void invalidateAgenciesQueries(queryClient);
    },
    onError: (err) => {
      const appError = mapAdminDomainError(err, {
        action: 'update_agency',
        fallbackMessage: "Impossible d'archiver l'agence."
      });
      handleUiError(appError, appError.message, { source: 'useArchiveAgency' });
    }
  });
};
