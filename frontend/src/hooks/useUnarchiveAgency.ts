import { useMutation, useQueryClient } from '@tanstack/react-query';

import { adminAgenciesUnarchive } from '@/services/admin/adminAgenciesUnarchive';
import { invalidateAgenciesQueries } from '@/services/query/queryInvalidation';
import { handleUiError } from '@/services/errors/handleUiError';
import { mapAdminDomainError } from '@/services/errors/mapAdminDomainError';

export const useUnarchiveAgency = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (agencyId: string) =>
      adminAgenciesUnarchive(agencyId).match(
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
        fallbackMessage: "Impossible de reactiver l'agence."
      });
      handleUiError(appError, appError.message, { source: 'useUnarchiveAgency' });
    }
  });
};
