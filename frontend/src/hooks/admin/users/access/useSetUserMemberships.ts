import { useMutation, useQueryClient } from '@tanstack/react-query';

import { setAdminUserMemberships, MembershipMode } from '@/services/admin/setAdminUserMemberships';
import { invalidateAdminUsersQuery } from '@/services/query/queryInvalidation';
import { handleUiError } from '@/services/errors/handleUiError';
import { mapAdminDomainError } from '@/services/errors/mapAdminDomainError';

export const useSetUserMemberships = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ userId, agencyIds, mode }: { userId: string; agencyIds: string[]; mode?: MembershipMode }) =>
      setAdminUserMemberships(userId, agencyIds, mode).match(
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
        fallbackMessage: 'Impossible de mettre a jour les agences.'
      });
      handleUiError(appError, appError.message, { source: 'useSetUserMemberships' });
    }
  });
};
