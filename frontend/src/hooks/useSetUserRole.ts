import { useMutation, useQueryClient } from '@tanstack/react-query';

import { adminUsersSetRole } from '@/services/admin/adminUsersSetRole';
import { adminUsersKey } from '@/services/query/queryKeys';
import { UserRole } from '@/types';
import { normalizeError } from '@/services/errors/normalizeError';
import { notifyError } from '@/services/errors/notify';
import { reportError } from '@/services/errors/reportError';

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
      queryClient.invalidateQueries({ queryKey: adminUsersKey() });
    },
    onError: (err) => {
      const appError = normalizeError(err, "Impossible de mettre a jour le role.");
      reportError(appError, { source: 'useSetUserRole' });
      notifyError(appError);
    }
  });
};
