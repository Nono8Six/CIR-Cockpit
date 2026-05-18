import { useMutation, useQueryClient } from '@tanstack/react-query';

import {
  deleteSupplier,
  saveEntity,
  setSupplierArchived,
  EntityPayload
} from '@/services/entities/saveEntity';
import {
  invalidateDirectoryQueries,
  invalidateEntitySearchIndexQueries
} from '@/services/query/queryInvalidation';
import { handleUiError } from '@/services/errors/handleUiError';

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
