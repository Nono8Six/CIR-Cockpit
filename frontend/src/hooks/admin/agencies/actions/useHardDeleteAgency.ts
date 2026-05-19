import { useMutation, useQueryClient } from '@tanstack/react-query';

import { hardDeleteAdminAgency } from '@/services/admin/hardDeleteAdminAgency';
import { invalidateAgenciesQueries } from '@/services/query/queryInvalidation';
import { handleUiError } from '@/services/errors/handleUiError';
import { mapAdminDomainError } from '@/services/errors/mapAdminDomainError';

export const useHardDeleteAgency = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (agencyId: string) =>
      hardDeleteAdminAgency(agencyId).match(
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
        action: 'delete_agency',
        fallbackMessage: "Impossible de supprimer l'agence."
      });
      handleUiError(appError, appError.message, { source: 'useHardDeleteAgency' });
    }
  });
};
