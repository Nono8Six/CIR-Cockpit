import { useMutation, useQueryClient } from '@tanstack/react-query';

import { adminAgenciesCreate } from '@/services/admin/adminAgenciesCreate';
import { invalidateAgenciesQueries } from '@/services/query/queryInvalidation';
import { handleUiError } from '@/services/errors/handleUiError';
import { mapAdminDomainError } from '@/services/errors/mapAdminDomainError';

export const useCreateAgency = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (name: string) =>
      adminAgenciesCreate(name).match(
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
        action: 'create_agency',
        fallbackMessage: "Impossible de creer l'agence."
      });
      handleUiError(appError, appError.message, { source: 'useCreateAgency' });
    }
  });
};
