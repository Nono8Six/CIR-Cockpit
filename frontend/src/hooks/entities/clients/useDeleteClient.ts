import { useMutation, useQueryClient } from '@tanstack/react-query';

import { deleteClient } from '@/services/clients/deleteClient';
import {
  invalidateClientsQueries,
  invalidateDirectoryQueries,
  invalidateEntitySearchIndexQueries,
  invalidateProspectsQueries
} from '@/services/query/queryInvalidation';
import { handleUiError } from '@/services/errors/handleUiError';

/**
 * Hook personnalisé pour supprimer un client et invalider les requêtes associées.
 *
 * @param {string | null} agencyId - L'identifiant de l'agence courante.
 * @param {boolean} [orphansOnly=false] - Indique s'il faut filtrer uniquement par prospects orphelins.
 * @returns Le hook de mutation react-query configuré pour supprimer un client.
 */
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
