import { useMutation, useQueryClient } from '@tanstack/react-query';

import { adminUsersUnarchive } from '@/services/admin/adminUsersUnarchive';
import { adminUsersKey } from '@/services/query/queryKeys';
import { normalizeError } from '@/services/errors/normalizeError';
import { notifyError } from '@/services/errors/notify';
import { reportError } from '@/services/errors/reportError';

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
      queryClient.invalidateQueries({ queryKey: adminUsersKey() });
    },
    onError: (err) => {
      const appError = normalizeError(err, "Impossible de reactiver l'utilisateur.");
      reportError(appError, { source: 'useUnarchiveUser' });
      notifyError(appError);
    }
  });
};
