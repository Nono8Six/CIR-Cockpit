import { useMutation, useQueryClient } from '@tanstack/react-query';

import { adminUsersResetPassword } from '@/services/admin/adminUsersResetPassword';
import { adminUsersKey } from '@/services/query/queryKeys';
import { normalizeError } from '@/services/errors/normalizeError';
import { notifyError } from '@/services/errors/notify';
import { reportError } from '@/services/errors/reportError';

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
      const appError = normalizeError(err, 'Impossible de reinitialiser le mot de passe.');
      reportError(appError, { source: 'useResetUserPassword' });
      notifyError(appError);
    }
  });
};
