import { useQuery } from '@tanstack/react-query';

import { createAppError } from '@/services/errors/AppError';
import { getCockpitPhoneLookup } from '@/services/cockpit/getCockpitPhoneLookup';
import { cockpitPhoneLookupKey } from '@/services/query/queryKeys';
import { useNotifyError } from './useNotifyError';

export const normalizeCockpitLookupPhone = (value: string): string =>
  value.replace(/\D/g, '');

export const useCockpitPhoneLookup = (
  agencyId: string | null,
  phone: string,
  enabled = true
) => {
  const normalizedPhone = normalizeCockpitLookupPhone(phone);
  const query = useQuery({
    queryKey: cockpitPhoneLookupKey(agencyId, normalizedPhone),
    queryFn: () => {
      if (!agencyId) {
        return Promise.reject(createAppError({
          code: 'VALIDATION_ERROR',
          message: 'Identifiant agence requis.',
          source: 'validation'
        }));
      }

      return getCockpitPhoneLookup({ agency_id: agencyId, phone: normalizedPhone, limit: 5 });
    },
    enabled: enabled && Boolean(agencyId) && normalizedPhone.length >= 6,
    staleTime: 60 * 1000
  });

  useNotifyError(query.error, "Impossible de rechercher l'historique du numero", 'useCockpitPhoneLookup');

  return { ...query, normalizedPhone };
};
