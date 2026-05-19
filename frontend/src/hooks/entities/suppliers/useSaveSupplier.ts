import { useMutation, useQueryClient } from '@tanstack/react-query';

import { saveEntity, type EntityPayload } from '@/services/entities/saveEntity';
import {
  invalidateDirectoryQueries,
  invalidateEntitySearchIndexQueries
} from '@/services/query/queryInvalidation';
import { handleUiError } from '@/services/errors/handleUiError';

/**
 * Custom hook to save (create or update) a supplier entity.
 *
 * @param includeArchived - Flag indicating whether archived entities are included in directory options.
 * @returns A mutation object to save a supplier.
 */
export const useSaveSupplier = (
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
      void invalidateEntitySearchIndexQueries(queryClient, null, includeArchived);
      void invalidateDirectoryQueries(queryClient);
    },
    onError: (error) => {
      handleUiError(error, "Impossible d'enregistrer le fournisseur.", {
        source: 'useSaveSupplier.onError'
      });
    }
  });
};
