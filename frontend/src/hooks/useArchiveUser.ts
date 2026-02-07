import { useMutation, useQueryClient } from '@tanstack/react-query';

import { adminUsersArchive } from '@/services/admin/adminUsersArchive';
import { adminUsersKey } from '@/services/query/queryKeys';
import { normalizeError } from '@/services/errors/normalizeError';
import { notifyError } from '@/services/errors/notify';
import { reportError } from '@/services/errors/reportError';

export const useArchiveUser = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (userId: string) =>
      adminUsersArchive(userId).match(
        (response) => response,
        (error) => {
          throw error;
        }
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminUsersKey() });
    },
    onError: (err) => {
      const appError = normalizeError(err, "Impossible d'archiver l'utilisateur.");
      reportError(appError, { source: 'useArchiveUser' });
      notifyError(appError);
    }
  });
};
