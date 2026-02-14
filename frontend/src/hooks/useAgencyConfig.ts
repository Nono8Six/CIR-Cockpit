import { useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';

import { createAppError } from '@/services/errors/AppError';
import { getAgencyConfig } from '@/services/config';
import { agencyConfigKey } from '@/services/query/queryKeys';
import { handleUiError } from '@/services/errors/handleUiError';
import { mapSettingsDomainError } from '@/services/errors/mapSettingsDomainError';

export const useAgencyConfig = (agencyId: string | null, enabled: boolean) => {
  const query = useQuery({
    queryKey: agencyId ? agencyConfigKey(agencyId) : ['agency-config', 'none'],
    queryFn: () => {
      if (!agencyId) {
        return Promise.reject(createAppError({
          code: 'AGENCY_ID_INVALID',
          message: "Identifiant d'agence requis.",
          source: 'validation'
        }));
      }
      return getAgencyConfig(agencyId);
    },
    enabled: enabled && !!agencyId
  });

  const lastSignatureRef = useRef<string | null>(null);

  useEffect(() => {
    if (!query.error) return;
    const appError = mapSettingsDomainError(query.error, {
      action: 'load_config',
      fallbackMessage: 'Impossible de charger la configuration.'
    });
    const signature = `${appError.code}:${appError.message}`;
    if (lastSignatureRef.current === signature) return;
    lastSignatureRef.current = signature;
    handleUiError(appError, appError.message, { source: 'useAgencyConfig' });
  }, [query.error]);

  return query;
};
