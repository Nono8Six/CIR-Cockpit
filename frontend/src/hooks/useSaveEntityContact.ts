import { useMutation, useQueryClient } from '@tanstack/react-query';

import { saveEntityContact, EntityContactPayload } from '@/services/entities/saveEntityContact';
import { clientContactsKey, entitySearchIndexKey } from '@/services/query/queryKeys';
import { normalizeError } from '@/services/errors/normalizeError';
import { notifyError } from '@/services/errors/notify';
import { reportError } from '@/services/errors/reportError';

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
    onError: (err) => {
      const appError = normalizeError(err, "Impossible d'enregistrer le contact.");
      reportError(appError, { source: 'useSaveEntityContact' });
      notifyError(appError);
    }
  });
};
