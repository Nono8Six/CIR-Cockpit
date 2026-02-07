import { useMutation, useQueryClient } from '@tanstack/react-query';

import { adminUsersSetMemberships, MembershipMode } from '@/services/admin/adminUsersSetMemberships';
import { adminUsersKey } from '@/services/query/queryKeys';
import { normalizeError } from '@/services/errors/normalizeError';
import { notifyError } from '@/services/errors/notify';
import { reportError } from '@/services/errors/reportError';

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
      const appError = normalizeError(err, 'Impossible de mettre a jour les agences.');
      reportError(appError, { source: 'useSetUserMemberships' });
      notifyError(appError);
    }
  });
};
