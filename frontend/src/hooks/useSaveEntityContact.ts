import { useMutation, useQueryClient } from '@tanstack/react-query';

import { saveEntityContact, EntityContactPayload } from '@/services/entities/saveEntityContact';
import { clientContactsKey, entitySearchIndexKey } from '@/services/query/queryKeys';
import { handleUiError } from '@/services/errors/handleUiError';

export const useSaveEntityContact = (
  entityId: string | null,
  includeArchived = false,
  agencyId: string | null = null
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: EntityContactPayload) =>
      saveEntityContact(payload).match(
        (contact) => contact,
        (error) => {
          throw error;
        }
      ),
    onSuccess: () => {
      if (!entityId) return;
      queryClient.invalidateQueries({ queryKey: clientContactsKey(entityId, includeArchived) });
      queryClient.invalidateQueries({ queryKey: entitySearchIndexKey(agencyId, includeArchived) });
    },
    onError: (error) => {
      handleUiError(error, "Impossible d'enregistrer le contact.", {
        source: 'useSaveEntityContact.onError'
      });
    }
  });
};
