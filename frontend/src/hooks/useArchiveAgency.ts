import { useMutation, useQueryClient } from '@tanstack/react-query';

import { adminAgenciesArchive } from '@/services/admin/adminAgenciesArchive';
import { agenciesKey } from '@/services/query/queryKeys';
import { normalizeError } from '@/services/errors/normalizeError';
import { notifyError } from '@/services/errors/notify';
import { reportError } from '@/services/errors/reportError';

export const useArchiveAgency = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (agencyId: string) =>
      adminAgenciesArchive(agencyId).match(
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
      const appError = normalizeError(err, "Impossible d'archiver l'agence.");
      reportError(appError, { source: 'useArchiveAgency' });
      notifyError(appError);
    }
  });
};
