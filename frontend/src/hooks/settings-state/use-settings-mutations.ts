import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { ConfigReferenceActionInput } from '../../../../shared/schemas/system/config.schema';
import { saveConfigReferenceAction } from '@/services/config';
import { handleUiError } from '@/services/errors/handleUiError';
import { agencyConfigKey, configUsageKey } from '@/services/query/queryKeys';
import { useSaveAgencyConfig } from '../admin/agencies/actions/useSaveAgencyConfig';
import { useSaveProductConfig } from '../entities/core/useSaveProductConfig';

/**
 * Custom hook to manage React Query mutations for settings actions and updates.
 *
 * @param agencyId - The active agency ID.
 * @returns An object containing the mutations.
 */
export const useSettingsMutations = (agencyId: string | null) => {
  const queryClient = useQueryClient();
  const saveAgencyConfigMutation = useSaveAgencyConfig(agencyId);
  const saveProductConfigMutation = useSaveProductConfig(agencyId);

  const referenceActionMutation = useMutation({
    mutationFn: (input: ConfigReferenceActionInput) =>
      saveConfigReferenceAction(input).match(
        (response) => response,
        (error) => {
          throw error;
        }
      ),
    onSuccess: async () => {
      if (!agencyId) return;
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: agencyConfigKey(agencyId) }),
        queryClient.invalidateQueries({ queryKey: configUsageKey(agencyId) })
      ]);
    },
    onError: (error) => {
      handleUiError(error, 'Impossible de mettre a jour le referentiel.', {
        source: 'useSettingsState.referenceAction'
      });
    }
  });

  return {
    saveAgencyConfigMutation,
    saveProductConfigMutation,
    referenceActionMutation
  };
};
