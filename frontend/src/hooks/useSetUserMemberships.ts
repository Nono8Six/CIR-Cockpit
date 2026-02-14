import { useMutation, useQueryClient } from '@tanstack/react-query';

import { adminUsersSetMemberships, MembershipMode } from '@/services/admin/adminUsersSetMemberships';
import { adminUsersKey } from '@/services/query/queryKeys';
import { handleUiError } from '@/services/errors/handleUiError';
import { mapAdminDomainError } from '@/services/errors/mapAdminDomainError';

export const useSetUserMemberships = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ userId, agencyIds, mode }: { userId: string; agencyIds: string[]; mode?: MembershipMode }) =>
      adminUsersSetMemberships(userId, agencyIds, mode).match(
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
        fallbackMessage: 'Impossible de mettre a jour les agences.'
      });
      handleUiError(appError, appError.message, { source: 'useSetUserMemberships' });
    }
  });
};
