import { useMutation, useQueryClient } from '@tanstack/react-query';

import { adminUsersUnarchive } from '@/services/admin/adminUsersUnarchive';
import { invalidateAdminUsersQuery } from '@/services/query/queryInvalidation';
import { handleUiError } from '@/services/errors/handleUiError';
import { mapAdminDomainError } from '@/services/errors/mapAdminDomainError';

export const useUnarchiveUser = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (userId: string) =>
      adminUsersUnarchive(userId).match(
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
        fallbackMessage: "Impossible de reactiver l'utilisateur."
      });
      handleUiError(appError, appError.message, { source: 'useUnarchiveUser' });
    }
  });
};
