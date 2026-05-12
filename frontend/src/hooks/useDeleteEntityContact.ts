import { useMutation, useQueryClient } from '@tanstack/react-query';

import { deleteEntityContact } from '@/services/entities/deleteEntityContact';
import {
  invalidateClientContactsQuery,
  invalidateDirectoryQueries,
  invalidateEntitySearchIndexQueries
} from '@/services/query/queryInvalidation';
import { handleUiError } from '@/services/errors/handleUiError';

export const useDeleteEntityContact = (
  entityId: string | null,
  includeArchived = false,
  agencyId: string | null = null
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (contactId: string) =>
      deleteEntityContact(contactId).match(
        () => undefined,
        (error) => {
          throw error;
        }
      ),
    onSuccess: () => {
      void invalidateClientContactsQuery(queryClient, entityId, includeArchived);
      void invalidateEntitySearchIndexQueries(queryClient, agencyId, includeArchived);
      void invalidateDirectoryQueries(queryClient);
    },
    onError: (error) => {
      handleUiError(error, 'Impossible de supprimer le contact.', {
        source: 'useDeleteEntityContact.onError'
      });
    }
  });
};
