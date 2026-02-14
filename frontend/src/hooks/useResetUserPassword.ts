import { useMutation, useQueryClient } from '@tanstack/react-query';

import { adminUsersResetPassword } from '@/services/admin/adminUsersResetPassword';
import { adminUsersKey } from '@/services/query/queryKeys';
import { handleUiError } from '@/services/errors/handleUiError';
import { mapAdminDomainError } from '@/services/errors/mapAdminDomainError';

export const useResetUserPassword = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ userId, password }: { userId: string; password?: string }) =>
      adminUsersResetPassword(userId, password).match(
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
        action: 'reset_password',
        fallbackMessage: 'Impossible de reinitialiser le mot de passe.'
      });
      handleUiError(appError, appError.message, { source: 'useResetUserPassword' });
    }
  });
};
