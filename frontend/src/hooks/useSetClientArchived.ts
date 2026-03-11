import { useMutation, useQueryClient } from '@tanstack/react-query';

import { deleteClient, setClientArchived } from '@/services/clients/setClientArchived';
import {
  invalidateClientsQueries,
  invalidateDirectoryQueries,
  invalidateEntitySearchIndexQueries,
  invalidateProspectsQueries
} from '@/services/query/queryInvalidation';
import { handleUiError } from '@/services/errors/handleUiError';

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
      void invalidateClientsQueries(queryClient, agencyId);
      void invalidateDirectoryQueries(queryClient);
    },
    onError: (error) => {
      handleUiError(error, "Impossible de modifier l'archive du client.", {
        source: 'useSetClientArchived.onError'
      });
    }
  });
};

export const useDeleteClient = (agencyId: string | null, orphansOnly = false) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: { clientId: string; deleteRelatedInteractions: boolean }) =>
      deleteClient(payload.clientId, payload.deleteRelatedInteractions).match(
        (client) => client,
        (error) => {
          throw error;
        }
      ),
    onSuccess: () => {
      void Promise.all([
        invalidateClientsQueries(queryClient, agencyId),
        invalidateProspectsQueries(queryClient, { agencyId, orphansOnly }),
        invalidateEntitySearchIndexQueries(queryClient, agencyId),
        invalidateDirectoryQueries(queryClient)
      ]);
    },
    onError: (error) => {
      handleUiError(error, 'Impossible de supprimer le client.', {
        source: 'useDeleteClient.onError'
      });
    }
  });
};
