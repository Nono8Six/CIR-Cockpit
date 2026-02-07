import { useMutation, useQueryClient } from '@tanstack/react-query';

import { adminAgenciesCreate } from '@/services/admin/adminAgenciesCreate';
import { agenciesKey } from '@/services/query/queryKeys';
import { normalizeError } from '@/services/errors/normalizeError';
import { notifyError } from '@/services/errors/notify';
import { reportError } from '@/services/errors/reportError';

export const useCreateAgency = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (name: string) =>
      adminAgenciesCreate(name).match(
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
      const appError = normalizeError(err, "Impossible de creer l'agence.");
      reportError(appError, { source: 'useCreateAgency' });
      notifyError(appError);
    }
  });
};
