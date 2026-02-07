import { useMutation, useQueryClient } from '@tanstack/react-query';

import { deleteEntityContact } from '@/services/entities/deleteEntityContact';
import { clientContactsKey } from '@/services/query/queryKeys';
import { normalizeError } from '@/services/errors/normalizeError';
import { notifyError } from '@/services/errors/notify';
import { reportError } from '@/services/errors/reportError';

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
    onError: (err) => {
      const appError = normalizeError(err, 'Impossible de supprimer le contact.');
      reportError(appError, { source: 'useDeleteEntityContact' });
      notifyError(appError);
    }
  });
};
