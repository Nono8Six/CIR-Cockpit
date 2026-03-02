import { useQuery } from '@tanstack/react-query';

import { createAppError } from '@/services/errors/AppError';
import { getInteractionsByEntity } from '@/services/interactions/getInteractionsByEntity';
import { entityInteractionsKey } from '@/services/query/queryKeys';
import { useNotifyError } from './useNotifyError';

export const useEntityInteractions = (
  entityId: string | null,
  page: number,
  pageSize: number,
  enabled = true
) => {
  const query = useQuery({
    queryKey: entityInteractionsKey(entityId, page, pageSize),
    queryFn: () => {
      if (!entityId) {
        return Promise.reject(createAppError({
          code: 'VALIDATION_ERROR',
          message: "Identifiant d'entite requis.",
          source: 'validation'
        }));
      }
      return getInteractionsByEntity(entityId, page, pageSize);
    },
    enabled: enabled && !!entityId
  });

  useNotifyError(query.error, "Impossible de charger les interactions du client", 'useEntityInteractions');

  return query;
};
