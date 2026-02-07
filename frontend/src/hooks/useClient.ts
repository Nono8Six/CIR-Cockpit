import { useQuery } from '@tanstack/react-query';

import { createAppError } from '@/services/errors/AppError';
import { getClientById } from '@/services/clients/getClientById';
import { clientKey } from '@/services/query/queryKeys';
import { useNotifyError } from './useNotifyError';

export const useClient = (clientId: string | null, enabled = true) => {
  const query = useQuery({
    queryKey: clientId ? clientKey(clientId) : ['client', 'none'],
    queryFn: () => {
      if (!clientId) {
        return Promise.reject(createAppError({
          code: 'VALIDATION_ERROR',
          message: 'Identifiant client requis.',
          source: 'validation'
        }));
      }
      return getClientById(clientId);
    },
    enabled: enabled && !!clientId
  });

  useNotifyError(query.error, 'Impossible de charger le client', 'useClient');

  return query;
};
