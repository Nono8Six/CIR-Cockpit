import { useQuery } from '@tanstack/react-query';

import { createAppError } from '@/services/errors/AppError';
import { getCockpitAgencyMembers } from '@/services/cockpit/getCockpitAgencyMembers';
import { cockpitAgencyMembersKey } from '@/services/query/queryKeys';
import { useNotifyError } from './useNotifyError';

export const useCockpitAgencyMembers = (agencyId: string | null, enabled = true) => {
  const query = useQuery({
    queryKey: cockpitAgencyMembersKey(agencyId),
    queryFn: () => {
      if (!agencyId) {
        return Promise.reject(createAppError({
          code: 'VALIDATION_ERROR',
          message: 'Identifiant agence requis.',
          source: 'validation'
        }));
      }

      return getCockpitAgencyMembers({ agency_id: agencyId });
    },
    enabled: enabled && Boolean(agencyId),
    staleTime: 5 * 60 * 1000
  });

  useNotifyError(query.error, "Impossible de charger les membres de l'agence", 'useCockpitAgencyMembers');

  return query;
};
