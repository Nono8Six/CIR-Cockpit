import { useMutation, useQueryClient } from '@tanstack/react-query';

import { saveClient, ClientPayload } from '@/services/clients/saveClient';
import { invalidateEntityMutationQueries } from '@/services/query/queryInvalidation';
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
      void invalidateEntityMutationQueries(queryClient, { agencyId, includeArchived });
    },
    onError: (error) => {
      handleUiError(error, "Impossible d'enregistrer le client.", {
        source: 'useSaveClient.onError'
      });
    }
  });
};
