import { useMutation, useQueryClient } from '@tanstack/react-query';

import { bulkDeleteAdminUsers } from '@/services/admin/bulkDeleteAdminUsers';
import { handleUiError } from '@/services/errors/handleUiError';
import { mapAdminDomainError } from '@/services/errors/mapAdminDomainError';
import { invalidateAdminUsersQuery } from '@/services/query/queryInvalidation';

export const useBulkDeleteUsers = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (userIds: string[]) =>
      bulkDeleteAdminUsers(userIds).match(
        (response) => response,
        (error) => {
          throw error;
        }
      ),
    onSuccess: async () => {
      await invalidateAdminUsersQuery(queryClient);
    },
    onError: (err) => {
      const appError = mapAdminDomainError(err, {
        action: 'delete_user',
        fallbackMessage: 'Impossible de supprimer les utilisateurs selectionnes.'
      });
      handleUiError(appError, appError.message, { source: 'useBulkDeleteUsers' });
    }
  });
};
