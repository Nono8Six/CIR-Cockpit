import { useMutation, useQueryClient } from '@tanstack/react-query';

import { setClientArchived } from '@/services/clients/setClientArchived';
import { invalidateClientsQueries } from '@/services/query/queryInvalidation';
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
    },
    onError: (error) => {
      handleUiError(error, "Impossible de modifier l'archive du client.", {
        source: 'useSetClientArchived.onError'
      });
    }
  });
};
