import { useMutation, useQueryClient } from '@tanstack/react-query';

import { updateAdminUserIdentity, UpdateUserIdentityPayload } from '@/services/admin/updateAdminUserIdentity';
import { handleUiError } from '@/services/errors/handleUiError';
import { mapAdminDomainError } from '@/services/errors/mapAdminDomainError';
import { invalidateAdminUsersQuery } from '@/services/query/queryInvalidation';

export const useUpdateUserIdentity = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: UpdateUserIdentityPayload) =>
      updateAdminUserIdentity(payload).match(
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
        fallbackMessage: "Impossible de mettre a jour l'utilisateur."
      });
      handleUiError(appError, appError.message, { source: 'useUpdateUserIdentity' });
    }
  });
};
