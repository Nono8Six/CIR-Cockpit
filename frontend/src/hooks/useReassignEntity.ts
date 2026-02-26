import { useMutation, useQueryClient } from '@tanstack/react-query';

import { reassignEntity, type ReassignEntityPayload } from '@/services/entities/reassignEntity';
import { handleUiError } from '@/services/errors/handleUiError';
import { invalidateEntityDirectoryQueries } from '@/services/query/queryInvalidation';

export const useReassignEntity = (currentAgencyId: string | null, currentOrphansOnly = false) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: ReassignEntityPayload) =>
      reassignEntity(payload).match(
        (result) => result,
        (error) => {
          throw error;
        }
      ),
    onSuccess: (_, payload) => {
      void invalidateEntityDirectoryQueries(queryClient, {
        agencyId: payload.target_agency_id
      });

      if (currentAgencyId === payload.target_agency_id && !currentOrphansOnly) return;
      void invalidateEntityDirectoryQueries(queryClient, {
        agencyId: currentAgencyId,
        orphansOnly: currentOrphansOnly
      });
    },
    onError: (error) => {
      handleUiError(error, "Impossible de reassigner l'entite.", {
        source: 'useReassignEntity.onError'
      });
    }
  });
};
