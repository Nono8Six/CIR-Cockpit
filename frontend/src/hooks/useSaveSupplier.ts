import { useMutation, useQueryClient } from '@tanstack/react-query';

import { saveEntity, EntityPayload } from '@/services/entities/saveEntity';
import {
  invalidateDirectoryQueries,
  invalidateEntitySearchIndexQueries
} from '@/services/query/queryInvalidation';
import { handleUiError } from '@/services/errors/handleUiError';

export const useSaveSupplier = (
  agencyId: string | null,
  includeArchived: boolean
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: EntityPayload) =>
      saveEntity(payload).match(
        (entity) => entity,
        (error) => {
          throw error;
        }
    ),
    onSuccess: () => {
      void invalidateEntitySearchIndexQueries(queryClient, agencyId, includeArchived);
      void invalidateDirectoryQueries(queryClient);
    },
    onError: (error) => {
      handleUiError(error, "Impossible d'enregistrer le fournisseur.", {
        source: 'useSaveSupplier.onError'
      });
    }
  });
};
