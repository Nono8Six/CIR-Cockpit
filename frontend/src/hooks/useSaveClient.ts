import { useMutation, useQueryClient } from '@tanstack/react-query';

import { saveClient, ClientPayload } from '@/services/clients/saveClient';
import { clientsKey, entitySearchIndexKey } from '@/services/query/queryKeys';
import { normalizeError } from '@/services/errors/normalizeError';
import { notifyError } from '@/services/errors/notify';
import { reportError } from '@/services/errors/reportError';

export const useSaveClient = (agencyId: string | null, includeArchived: boolean) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: ClientPayload) =>
      saveClient(payload).match(
        (client) => client,
        (error) => {
          throw error;
        }
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: clientsKey(agencyId, includeArchived)
      });
      queryClient.invalidateQueries({
        queryKey: entitySearchIndexKey(agencyId, includeArchived)
      });
    },
    onError: (err) => {
      const appError = normalizeError(err, "Impossible d'enregistrer le client.");
      reportError(appError, { source: 'useSaveClient' });
      notifyError(appError);
    }
  });
};
