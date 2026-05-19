import { useMutation, useQueryClient } from '@tanstack/react-query';

import { deleteInteraction } from '@/services/interactions/deleteInteraction';
import { handleUiError } from '@/services/errors/handleUiError';
import {
  invalidateEntityInteractionsQueries,
  invalidateInteractionsQuery
} from '@/services/query/queryInvalidation';
import { interactionsKey } from '@/services/query/queryKeys';
import type { Interaction } from '@/types';

type UseDeleteInteractionParams = {
  agencyId: string | null;
  entityId?: string | null;
};

const removeInteractionFromList = (
  list: Interaction[] | undefined,
  interactionId: string
): Interaction[] | undefined => {
  if (!list) return list;
  return list.filter((item) => item.id !== interactionId);
};

export const useDeleteInteraction = ({ agencyId, entityId }: UseDeleteInteractionParams) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (interactionId: string) =>
      deleteInteraction(interactionId).match(
        (deletedInteractionId) => deletedInteractionId,
        (error) => {
          throw error;
        }
      ),
    onSuccess: (deletedInteractionId) => {
      if (agencyId) {
        queryClient.setQueryData<Interaction[]>(interactionsKey(agencyId), (current) =>
          removeInteractionFromList(current, deletedInteractionId)
        );
        void invalidateInteractionsQuery(queryClient, agencyId);
      }
      void invalidateEntityInteractionsQueries(queryClient, entityId ?? null);
    },
    onError: (error) => {
      handleUiError(error, "Impossible de supprimer l'interaction.", {
        source: 'useDeleteInteraction.onError'
      });
    }
  });
};
