import { useMutation, useQueryClient } from '@tanstack/react-query';

import { saveClient, ClientPayload } from '@/services/clients/saveClient';
import { clientsKey, entitySearchIndexKey } from '@/services/query/queryKeys';
import { handleUiError } from '@/services/errors/handleUiError';

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
    onError: (error) => {
      handleUiError(error, "Impossible d'enregistrer le client.", {
        source: 'useSaveClient.onError'
      });
    }
  });
};
