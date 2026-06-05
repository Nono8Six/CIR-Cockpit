import { useMutation, useQueryClient } from '@tanstack/react-query';

import { setClientArchived } from '@/services/clients/setClientArchived';
import { invalidateEntityMutationQueries } from '@/services/query/queryInvalidation';
import { handleUiError } from '@/services/errors/handleUiError';

/**
 * Hook personnalisé pour archiver/désarchiver un client.
 *
 * @param {string | null} agencyId - L'identifiant de l'agence courante.
 * @returns Le hook de mutation react-query configuré pour modifier l'archivage du client.
 */
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
      void invalidateEntityMutationQueries(queryClient, { agencyId });
    },
    onError: (error) => {
      handleUiError(error, "Impossible de modifier l'archive du client.", {
        source: 'useSetClientArchived.onError'
      });
    }
  });
};
