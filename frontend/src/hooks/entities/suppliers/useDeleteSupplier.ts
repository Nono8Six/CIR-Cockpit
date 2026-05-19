import { useMutation, useQueryClient } from '@tanstack/react-query';
import { deleteSupplier } from '@/services/entities/deleteSupplier';
import {
  invalidateDirectoryQueries,
  invalidateEntitySearchIndexQueries
} from '@/services/query/queryInvalidation';
import { handleUiError } from '@/services/errors/handleUiError';

/**
 * Custom hook to delete a supplier entity.
 *
 * @param includeArchived - Flag indicating whether archived entities are included in directory options.
 * @returns A mutation object to delete a supplier.
 */
export const useDeleteSupplier = (includeArchived: boolean) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (supplierId: string) =>
      deleteSupplier(supplierId).match(
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
      handleUiError(error, 'Impossible de supprimer le fournisseur.', {
        source: 'useDeleteSupplier.onError'
      });
    }
  });
};
