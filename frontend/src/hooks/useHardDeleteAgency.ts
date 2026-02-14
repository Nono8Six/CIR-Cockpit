import { useMutation, useQueryClient } from '@tanstack/react-query';

import { adminAgenciesHardDelete } from '@/services/admin/adminAgenciesHardDelete';
import { agenciesKey } from '@/services/query/queryKeys';
import { handleUiError } from '@/services/errors/handleUiError';
import { mapAdminDomainError } from '@/services/errors/mapAdminDomainError';

export const useHardDeleteAgency = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (agencyId: string) =>
      adminAgenciesHardDelete(agencyId).match(
        (response) => response,
        (error) => {
          throw error;
        }
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: agenciesKey(true) });
      queryClient.invalidateQueries({ queryKey: agenciesKey(false) });
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
