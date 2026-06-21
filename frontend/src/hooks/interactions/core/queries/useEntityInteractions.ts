import { keepPreviousData, useQuery } from '@tanstack/react-query';

import { createAppError } from '@/services/errors/AppError';
import { getInteractionsByEntity, type EntityInteractionsScope } from '@/services/interactions/getInteractionsByEntity';
import { entityInteractionsKey } from '@/services/query/queryKeys';
import { useNotifyError } from '../../../cockpit-utils/useNotifyError';

export const useEntityInteractions = (
  entityId: string | null,
  page: number,
  pageSize: number,
  enabled = true,
  scope: EntityInteractionsScope = 'all'
) => {
  const query = useQuery({
    queryKey: entityInteractionsKey(entityId, page, pageSize, scope),
    queryFn: () => {
      if (!entityId) {
        return Promise.reject(createAppError({
          code: 'VALIDATION_ERROR',
          message: "Identifiant d'entite requis.",
          source: 'validation'
        }));
      }
      return getInteractionsByEntity(entityId, page, pageSize, scope);
    },
    placeholderData: keepPreviousData,
    enabled: enabled && !!entityId
  });

  useNotifyError(query.error, "Impossible de charger les interactions du client", 'useEntityInteractions');

  return query;
};
