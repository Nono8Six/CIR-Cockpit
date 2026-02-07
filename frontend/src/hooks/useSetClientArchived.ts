import { useMutation, useQueryClient } from '@tanstack/react-query';

import { setClientArchived } from '@/services/clients/setClientArchived';
import { clientsKey } from '@/services/query/queryKeys';
import { normalizeError } from '@/services/errors/normalizeError';
import { notifyError } from '@/services/errors/notify';
import { reportError } from '@/services/errors/reportError';

export const useSetClientArchived = (agencyId: string | null) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ clientId, archived }: { clientId: string; archived: boolean }) =>
      setClientArchived(clientId, archived).match(
        (client) => client,
        (error) => {
          throw error;
        }
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: clientsKey(agencyId, false)
      });
      queryClient.invalidateQueries({
        queryKey: clientsKey(agencyId, true)
      });
    },
    onError: (err) => {
      const appError = normalizeError(err, "Impossible de modifier l'archive du client.");
      reportError(appError, { source: 'useSetClientArchived' });
      notifyError(appError);
    }
  });
};
