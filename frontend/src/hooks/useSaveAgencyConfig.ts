import { useMutation, useQueryClient } from '@tanstack/react-query';

import { saveAgencyConfig } from '@/services/config';
import { agencyConfigKey } from '@/services/query/queryKeys';
import { handleUiError } from '@/services/errors/handleUiError';
import { mapSettingsDomainError } from '@/services/errors/mapSettingsDomainError';
import type { AgencyConfig } from '@/services/config/getAgencyConfig';
import type { AppError } from '@/services/errors/AppError';

export const useSaveAgencyConfig = (agencyId: string | null) => {
  const queryClient = useQueryClient();

  return useMutation<void, AppError, AgencyConfig>({
    mutationFn: (config: AgencyConfig) =>
      saveAgencyConfig(config).match(
        () => undefined,
        (error) => {
          throw error;
        }
      ),
    onSuccess: async () => {
      if (!agencyId) return;
      await queryClient.invalidateQueries({ queryKey: agencyConfigKey(agencyId) });
    },
    onError: (err) => {
      const appError = mapSettingsDomainError(err, {
        action: 'save_config',
        fallbackMessage: 'Impossible de sauvegarder la configuration.'
      });
      handleUiError(appError, appError.message, { source: 'useSaveAgencyConfig' });
    }
  });
};
