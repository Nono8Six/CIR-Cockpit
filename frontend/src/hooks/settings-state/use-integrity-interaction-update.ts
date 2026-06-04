import { useMutation, useQueryClient } from '@tanstack/react-query';

import type { ConfigIntegrityInteractionUpdateInput } from '../../../../shared/schemas/system/config.schema';
import { saveConfigIntegrityInteractionUpdate } from '@/services/config';
import { handleUiError } from '@/services/errors/handleUiError';
import {
  agencyConfigKey,
  auditLogsRootKey,
  configIntegrityInteractionsRootKey,
  configUsageKey,
  interactionsRootKey
} from '@/services/query/queryKeys';

export const useIntegrityInteractionUpdate = (agencyId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: ConfigIntegrityInteractionUpdateInput) =>
      saveConfigIntegrityInteractionUpdate(input).match(
        (response) => response,
        (error) => { throw error; }
      ),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: agencyConfigKey(agencyId) }),
        queryClient.invalidateQueries({ queryKey: configUsageKey(agencyId) }),
        queryClient.invalidateQueries({ queryKey: configIntegrityInteractionsRootKey() }),
        queryClient.invalidateQueries({ queryKey: interactionsRootKey() }),
        queryClient.invalidateQueries({ queryKey: auditLogsRootKey() })
      ]);
    },
    onError: (error) => {
      handleUiError(error, "Impossible de corriger l'interaction.", {
        source: 'useIntegrityInteractionUpdate'
      });
    }
  });
};
