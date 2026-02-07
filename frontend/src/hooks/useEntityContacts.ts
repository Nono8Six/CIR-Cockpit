import { useQuery } from '@tanstack/react-query';

import { createAppError } from '@/services/errors/AppError';
import { getEntityContacts } from '@/services/entities/getEntityContacts';
import { clientContactsKey } from '@/services/query/queryKeys';
import { useNotifyError } from './useNotifyError';

export const useEntityContacts = (entityId: string | null, includeArchived = false, enabled = true) => {
  const query = useQuery({
    queryKey: entityId ? clientContactsKey(entityId, includeArchived) : ['entity-contacts', 'none'],
    queryFn: () => {
      if (!entityId) {
        return Promise.reject(createAppError({
          code: 'VALIDATION_ERROR',
          message: "Identifiant d'entite requis.",
          source: 'validation'
        }));
      }
      return getEntityContacts(entityId, includeArchived);
    },
    enabled: enabled && !!entityId
  });

  useNotifyError(query.error, 'Impossible de charger les contacts', 'useEntityContacts');

  return query;
};
