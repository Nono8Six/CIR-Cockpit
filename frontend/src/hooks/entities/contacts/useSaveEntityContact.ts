import { useMutation, useQueryClient } from '@tanstack/react-query';

import { saveEntityContact, EntityContactPayload } from '@/services/entities/saveEntityContact';
import { invalidateEntityContactMutationQueries } from '@/services/query/queryInvalidation';
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
      void invalidateEntityContactMutationQueries(queryClient, { agencyId, entityId, includeArchived });
    },
    onError: (error) => {
      handleUiError(error, "Impossible d'enregistrer le contact.", {
        source: 'useSaveEntityContact.onError'
      });
    }
  });
};
