import { useMutation, useQueryClient } from '@tanstack/react-query';

import { adminAgenciesHardDelete } from '@/services/admin/adminAgenciesHardDelete';
import { agenciesKey } from '@/services/query/queryKeys';
import { normalizeError } from '@/services/errors/normalizeError';
import { notifyError } from '@/services/errors/notify';
import { reportError } from '@/services/errors/reportError';

export const useHardDeleteAgency = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (agencyId: string) =>
      adminAgenciesHardDelete(agencyId).match(
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
      const appError = normalizeError(err, "Impossible de supprimer l'agence.");
      reportError(appError, { source: 'useHardDeleteAgency' });
      notifyError(appError);
    }
  });
};
