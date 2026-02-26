import { useMutation, useQueryClient } from '@tanstack/react-query';

import { adminUsersDelete } from '@/services/admin/adminUsersDelete';
import { handleUiError } from '@/services/errors/handleUiError';
import { mapAdminDomainError } from '@/services/errors/mapAdminDomainError';
import { invalidateAdminUsersQuery } from '@/services/query/queryInvalidation';

export const useDeleteUser = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (userId: string) =>
      adminUsersDelete(userId).match(
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
        action: 'delete_user',
        fallbackMessage: "Impossible de supprimer l'utilisateur."
      });
      handleUiError(appError, appError.message, { source: 'useDeleteUser' });
    }
  });
};
