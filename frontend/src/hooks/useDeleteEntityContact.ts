import { useMutation, useQueryClient } from '@tanstack/react-query';

import { deleteEntityContact } from '@/services/entities/deleteEntityContact';
import { clientContactsKey } from '@/services/query/queryKeys';
import { handleUiError } from '@/services/errors/handleUiError';

export const useDeleteEntityContact = (entityId: string | null, includeArchived = false) => {
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
      if (!entityId) return;
      queryClient.invalidateQueries({ queryKey: clientContactsKey(entityId, includeArchived) });
    },
    onError: (error) => {
      handleUiError(error, 'Impossible de supprimer le contact.', {
        source: 'useDeleteEntityContact.onError'
      });
    }
  });
};
