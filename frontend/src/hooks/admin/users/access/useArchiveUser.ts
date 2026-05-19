import { useMutation, useQueryClient } from '@tanstack/react-query';

import { archiveAdminUser } from '@/services/admin/archiveAdminUser';
import { invalidateAdminUsersQuery } from '@/services/query/queryInvalidation';
import { handleUiError } from '@/services/errors/handleUiError';
import { mapAdminDomainError } from '@/services/errors/mapAdminDomainError';

export const useArchiveUser = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (userId: string) =>
      archiveAdminUser(userId).match(
        (response) => response,
        (error) => {
          throw error;
        }
      ),
    onSuccess: () => {
      void invalidateAdminUsersQuery(queryClient);
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
