import { useQuery } from '@tanstack/react-query';

import { createAppError } from '@/services/errors/AppError';
import { getInteractions } from '@/services/interactions/getInteractions';
import { interactionsKey } from '@/services/query/queryKeys';
import { useNotifyError } from './useNotifyError';

export const useInteractions = (agencyId: string | null, enabled: boolean) => {
  const query = useQuery({
    queryKey: interactionsKey(agencyId),
    queryFn: () => {
      if (!agencyId) {
        return Promise.reject(createAppError({
          code: 'AGENCY_ID_INVALID',
          message: "Identifiant d'agence requis.",
          source: 'validation'
        }));
      }
      return getInteractions(agencyId);
    },
    enabled: enabled && !!agencyId
  });

  useNotifyError(query.error, "Impossible de charger les interactions", 'useInteractions');

  return query;
};
