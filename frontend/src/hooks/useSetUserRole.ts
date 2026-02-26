import { useMutation, useQueryClient } from '@tanstack/react-query';

import { adminUsersSetRole } from '@/services/admin/adminUsersSetRole';
import { invalidateAdminUsersQuery } from '@/services/query/queryInvalidation';
import { UserRole } from '@/types';
import { handleUiError } from '@/services/errors/handleUiError';
import { mapAdminDomainError } from '@/services/errors/mapAdminDomainError';

export const useSetUserRole = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: UserRole }) =>
      adminUsersSetRole(userId, role).match(
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
        fallbackMessage: "Impossible de mettre a jour le role."
      });
      handleUiError(appError, appError.message, { source: 'useSetUserRole' });
    }
  });
};
