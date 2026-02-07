import { useMutation, useQueryClient } from '@tanstack/react-query';

import { adminUsersCreate, CreateAdminUserPayload } from '@/services/admin/adminUsersCreate';
import { adminUsersKey } from '@/services/query/queryKeys';
import { normalizeError } from '@/services/errors/normalizeError';
import { notifyError } from '@/services/errors/notify';
import { reportError } from '@/services/errors/reportError';

export const useCreateAdminUser = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateAdminUserPayload) =>
      adminUsersCreate(payload).match(
        (response) => response,
        (error) => {
          throw error;
        }
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminUsersKey() });
    },
    onError: (err) => {
      const appError = normalizeError(err, "Impossible de creer l'utilisateur.");
      reportError(appError, { source: 'useCreateAdminUser' });
      notifyError(appError);
    }
  });
};
