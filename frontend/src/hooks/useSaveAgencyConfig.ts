import { useMutation, useQueryClient } from '@tanstack/react-query';

import { saveAgencyConfig } from '@/services/config';
import { agencyConfigKey } from '@/services/query/queryKeys';
import { normalizeError } from '@/services/errors/normalizeError';
import { notifyError } from '@/services/errors/notify';
import { reportError } from '@/services/errors/reportError';
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
      const appError = normalizeError(err, 'Impossible de sauvegarder la configuration.');
      reportError(appError, { source: 'useSaveAgencyConfig' });
      notifyError(appError);
    }
  });
};
