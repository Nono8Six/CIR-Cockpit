import { useMutation, useQueryClient } from '@tanstack/react-query';

import { saveClient, ClientPayload } from '@/services/clients/saveClient';
import {
  invalidateClientsQueries,
  invalidateEntitySearchIndexQueries
} from '@/services/query/queryInvalidation';
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
      void invalidateClientsQueries(queryClient, agencyId, includeArchived);
      void invalidateEntitySearchIndexQueries(queryClient, agencyId, includeArchived);
    },
    onError: (error) => {
      handleUiError(error, "Impossible d'enregistrer le client.", {
        source: 'useSaveClient.onError'
      });
    }
  });
};
