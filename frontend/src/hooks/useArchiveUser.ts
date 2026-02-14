import { useMutation, useQueryClient } from '@tanstack/react-query';

import { adminUsersArchive } from '@/services/admin/adminUsersArchive';
import { adminUsersKey } from '@/services/query/queryKeys';
import { handleUiError } from '@/services/errors/handleUiError';
import { mapAdminDomainError } from '@/services/errors/mapAdminDomainError';

export const useArchiveUser = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (userId: string) =>
      adminUsersArchive(userId).match(
        (response) => response,
        (error) => {
          throw error;
        }
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminUsersKey() });
    },
    onError: (err) => {
      const appError = mapAdminDomainError(err, {
        action: 'update_user',
        fallbackMessage: "Impossible d'archiver l'utilisateur."
      });
      handleUiError(appError, appError.message, { source: 'useArchiveUser' });
    }
  });
};
