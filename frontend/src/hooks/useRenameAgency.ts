import { useMutation, useQueryClient } from '@tanstack/react-query';

import { adminAgenciesRename } from '@/services/admin/adminAgenciesRename';
import { agenciesKey } from '@/services/query/queryKeys';
import { normalizeError } from '@/services/errors/normalizeError';
import { notifyError } from '@/services/errors/notify';
import { reportError } from '@/services/errors/reportError';

export const useRenameAgency = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ agencyId, name }: { agencyId: string; name: string }) =>
      adminAgenciesRename(agencyId, name).match(
        (response) => response,
        (error) => {
          throw error;
        }
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: agenciesKey(true) });
      queryClient.invalidateQueries({ queryKey: agenciesKey(false) });
    },
    onError: (err) => {
      const appError = normalizeError(err, "Impossible de renommer l'agence.");
      reportError(appError, { source: 'useRenameAgency' });
      notifyError(appError);
    }
  });
};
