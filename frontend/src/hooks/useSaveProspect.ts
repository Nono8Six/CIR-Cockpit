import { useMutation, useQueryClient } from '@tanstack/react-query';

import { saveEntity, EntityPayload } from '@/services/entities/saveEntity';
import {
  invalidateEntitySearchIndexQueries,
  invalidateProspectsQueries
} from '@/services/query/queryInvalidation';
import { handleUiError } from '@/services/errors/handleUiError';

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
      void invalidateProspectsQueries(queryClient, { agencyId, includeArchived, orphansOnly });
      void invalidateEntitySearchIndexQueries(queryClient, agencyId, includeArchived);
    },
    onError: (error) => {
      handleUiError(error, "Impossible d'enregistrer le prospect.", {
        source: 'useSaveProspect.onError'
      });
    }
  });
};
