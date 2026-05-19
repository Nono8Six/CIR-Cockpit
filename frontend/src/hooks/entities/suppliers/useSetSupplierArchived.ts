import { useMutation, useQueryClient } from '@tanstack/react-query';
import { setSupplierArchived } from '@/services/entities/setSupplierArchived';
import {
  invalidateDirectoryQueries,
  invalidateEntitySearchIndexQueries
} from '@/services/query/queryInvalidation';
import { handleUiError } from '@/services/errors/handleUiError';

/**
 * Custom hook to set a supplier's archived status.
 *
 * @param includeArchived - Flag indicating whether archived entities are included in directory options.
 * @returns A mutation object to archive/restore a supplier.
 */
export const useSetSupplierArchived = (includeArchived: boolean) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ supplierId, archived }: { supplierId: string; archived: boolean }) =>
      setSupplierArchived(supplierId, archived).match(
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
      handleUiError(error, 'Impossible de mettre à jour le fournisseur.', {
        source: 'useSetSupplierArchived.onError'
      });
    }
  });
};
