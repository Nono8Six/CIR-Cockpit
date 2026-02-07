import { useMutation, useQueryClient } from '@tanstack/react-query';

import { saveEntity, EntityPayload } from '@/services/entities/saveEntity';
import { entitySearchIndexKey, prospectsKey } from '@/services/query/queryKeys';
import { normalizeError } from '@/services/errors/normalizeError';
import { notifyError } from '@/services/errors/notify';
import { reportError } from '@/services/errors/reportError';

export const useSaveProspect = (
  agencyId: string | null,
  includeArchived: boolean,
  orphansOnly: boolean
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
      queryClient.invalidateQueries({ queryKey: prospectsKey(agencyId, includeArchived, orphansOnly) });
      queryClient.invalidateQueries({ queryKey: entitySearchIndexKey(agencyId, includeArchived) });
    },
    onError: (err) => {
      const appError = normalizeError(err, "Impossible d'enregistrer le prospect.");
      reportError(appError, { source: 'useSaveProspect' });
      notifyError(appError);
    }
  });
};
