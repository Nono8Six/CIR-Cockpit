import { useMutation, useQueryClient } from '@tanstack/react-query';

import { adminAgenciesRename } from '@/services/admin/adminAgenciesRename';
import { agenciesKey } from '@/services/query/queryKeys';
import { handleUiError } from '@/services/errors/handleUiError';
import { mapAdminDomainError } from '@/services/errors/mapAdminDomainError';

export const useRenameAgency = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ agencyId, name }: { agencyId: string; name: string }) =>
      adminAgenciesRename(agencyId, name).match(
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
        action: 'update_agency',
        fallbackMessage: "Impossible de renommer l'agence."
      });
      handleUiError(appError, appError.message, { source: 'useRenameAgency' });
    }
  });
};
