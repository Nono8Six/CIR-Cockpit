import { useMutation, useQueryClient } from '@tanstack/react-query';

import { adminAgenciesUnarchive } from '@/services/admin/adminAgenciesUnarchive';
import { agenciesKey } from '@/services/query/queryKeys';
import { normalizeError } from '@/services/errors/normalizeError';
import { notifyError } from '@/services/errors/notify';
import { reportError } from '@/services/errors/reportError';

export const useUnarchiveAgency = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (agencyId: string) =>
      adminAgenciesUnarchive(agencyId).match(
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
      const appError = normalizeError(err, "Impossible de reactiver l'agence.");
      reportError(appError, { source: 'useUnarchiveAgency' });
      notifyError(appError);
    }
  });
};
