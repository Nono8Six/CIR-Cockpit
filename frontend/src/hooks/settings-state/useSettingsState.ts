import { useCallback } from 'react';
import type {
  ResolvedConfigSnapshot
} from '../../../../shared/schemas/system/config.schema';

import type { AgencyStatus, StatusCategory } from '@/types';
import { notifySuccess } from '@/services/errors/notifySuccess';
import { notifyInfo } from '@/services/errors/notifyInfo';
import {
  normalizeStatusesForUi,
} from './use-settings-state.helpers';
import {
  buildSettingsFormDefaultValues,
  toAgencyOnboardingPayload,
  type AccountTypeOverrideValue,
  type BooleanOverrideValue,
  type SettingsFormValues,
} from './settingsFormSchema';

import { useSettingsMutations } from './use-settings-mutations';
import { useSettingsForm } from './use-settings-form';
import { useReferenceItems } from './use-reference-items';
import { useReferenceStatuses } from './use-reference-statuses';

type UseSettingsStateParams = {
  snapshot: ResolvedConfigSnapshot;
  canEditAgencySettings: boolean;
  canEditProductSettings: boolean;
  agencyId: string | null;
};

/**
 * Orchestrator hook for managing settings workspace state, form sync, and reference mutations.
 *
 * @param params - Hook parameters.
 * @returns Combined settings workspace actions and values.
 */
export const useSettingsState = ({
  snapshot,
  canEditAgencySettings,
  canEditProductSettings,
  agencyId,
}: UseSettingsStateParams) => {
  const readOnly = !canEditAgencySettings && !canEditProductSettings;

  const { saveAgencyConfigMutation, saveProductConfigMutation, referenceActionMutation } = useSettingsMutations(agencyId);

  const {
    form,
    allowManualEntryOverride,
    defaultCompanyAccountTypeOverride,
    productAllowManualEntry,
    productDefaultCompanyAccountType,
    productUiShellV2,
    families,
    services,
    entities,
    interactionTypes,
    statuses,
    newFamily,
    newService,
    newEntity,
    newInteractionType,
    newStatus,
    newStatusCategory
  } = useSettingsForm(snapshot, agencyId);

  const { setValue, reset, handleSubmit, formState } = form;

  const setStringField = useCallback(
    (field: keyof SettingsFormValues, value: string) => {
      setValue(field, value as never, { shouldDirty: true, shouldValidate: true });
    },
    [setValue],
  );

  const setArrayField = useCallback(
    (field: keyof SettingsFormValues, value: string[] | AgencyStatus[]) => {
      setValue(field, value as never, { shouldDirty: true, shouldValidate: true });
    },
    [setValue],
  );

  const setBooleanField = useCallback(
    (field: keyof SettingsFormValues, value: boolean) => {
      setValue(field, value as never, { shouldDirty: true, shouldValidate: true });
    },
    [setValue],
  );

  const setAllowManualEntryOverride = useCallback(
    (value: BooleanOverrideValue) => {
      setValue('agencyAllowManualEntry', value, { shouldDirty: true, shouldValidate: true });
    },
    [setValue],
  );

  const setDefaultCompanyAccountTypeOverride = useCallback(
    (value: AccountTypeOverrideValue) => {
      setValue('agencyDefaultCompanyAccountType', value, { shouldDirty: true, shouldValidate: true });
    },
    [setValue],
  );

  const setProductAllowManualEntry = useCallback(
    (value: boolean) => {
      setBooleanField('productAllowManualEntry', value);
    },
    [setBooleanField],
  );

  const setProductDefaultCompanyAccountType = useCallback(
    (value: 'term' | 'cash') => {
      setValue('productDefaultCompanyAccountType', value, { shouldDirty: true, shouldValidate: true });
    },
    [setValue],
  );

  const setProductUiShellV2 = useCallback(
    (value: boolean) => {
      setBooleanField('productUiShellV2', value);
    },
    [setBooleanField],
  );

  const setNewFamily = useCallback((value: string) => setStringField('newFamily', value), [setStringField]);
  const setNewService = useCallback((value: string) => setStringField('newService', value), [setStringField]);
  const setNewEntity = useCallback((value: string) => setStringField('newEntity', value), [setStringField]);
  const setNewInteractionType = useCallback(
    (value: string) => setStringField('newInteractionType', value),
    [setStringField],
  );
  const setNewStatus = useCallback((value: string) => setStringField('newStatus', value), [setStringField]);
  
  const setNewStatusCategory = useCallback(
    (value: StatusCategory) => {
      setValue('newStatusCategory', value, { shouldDirty: true, shouldValidate: true });
    },
    [setValue],
  );

  const setFamilies = useCallback((next: string[]) => setArrayField('families', next), [setArrayField]);
  const setServices = useCallback((next: string[]) => setArrayField('services', next), [setArrayField]);
  const setEntities = useCallback((next: string[]) => setArrayField('entities', next), [setArrayField]);
  const setInteractionTypes = useCallback(
    (next: string[]) => setArrayField('interactionTypes', next),
    [setArrayField],
  );
  
  const setStatuses = useCallback(
    (next: AgencyStatus[]) => {
      setArrayField('statuses', normalizeStatusesForUi(next));
    },
    [setArrayField],
  );

  const handleSave = async () => {
    if (readOnly) {
      return void notifyInfo('Acces lecture seule. Contactez un administrateur pour modifier.');
    }

    const submit = handleSubmit(
      async (values) => {
        try {
          if (canEditAgencySettings) {
            await saveAgencyConfigMutation.mutateAsync({
              agency_id: values.agency_id,
              onboarding: toAgencyOnboardingPayload(values),
              references: {
                statuses: normalizeStatusesForUi(values.statuses).map((status) => ({
                  id: status.id,
                  label: status.label,
                  category: status.category,
                })),
                services: values.services,
                entities: values.entities,
                families: values.families,
                interaction_types: values.interactionTypes,
              },
            });
          }

          if (canEditProductSettings) {
            await saveProductConfigMutation.mutateAsync({
              feature_flags: {
                ui_shell_v2: values.productUiShellV2,
              },
              onboarding: {
                allow_manual_entry: values.productAllowManualEntry,
                default_account_type_company: values.productDefaultCompanyAccountType,
                default_account_type_individual: snapshot.product.onboarding.default_account_type_individual,
              },
            });
          }

          notifySuccess('Configuration sauvegardee');
        } catch {
          return;
        }
      },
      () => {
        const firstError =
          formState.errors.statuses?.message ??
          formState.errors.services?.message ??
          formState.errors.entities?.message ??
          formState.errors.families?.message ??
          formState.errors.interactionTypes?.message ??
          formState.errors.agency_id?.message ??
          'Configuration invalide.';
        notifyInfo(firstError);
      },
    );

    await submit();
  };

  const handleReset = useCallback(() => {
    if (!confirm('Recharger la configuration depuis la base ?')) return;
    reset(buildSettingsFormDefaultValues(snapshot, agencyId));
  }, [agencyId, reset, snapshot]);

  const { addItem, removeItem, renameItem, updateItem } = useReferenceItems({
    agencyId,
    referenceActionMutation
  });

  const {
    addStatus,
    removeStatus,
    updateStatusLabel,
    updateStatusCategory,
    renameStatus
  } = useReferenceStatuses({
    agencyId,
    referenceActionMutation,
    statuses,
    setStatuses,
    newStatus,
    setNewStatus,
    newStatusCategory,
    setNewStatusCategory
  });

  return {
    readOnly,
    isSaving: saveAgencyConfigMutation.isPending || saveProductConfigMutation.isPending || referenceActionMutation.isPending,
    allowManualEntryOverride,
    defaultCompanyAccountTypeOverride,
    productAllowManualEntry,
    productDefaultCompanyAccountType,
    productUiShellV2,
    families,
    services,
    entities,
    interactionTypes,
    statuses,
    newFamily,
    newService,
    newEntity,
    newInteractionType,
    newStatus,
    newStatusCategory,
    setAllowManualEntryOverride,
    setDefaultCompanyAccountTypeOverride,
    setProductAllowManualEntry,
    setProductDefaultCompanyAccountType,
    setProductUiShellV2,
    setNewFamily,
    setNewService,
    setNewEntity,
    setNewInteractionType,
    setNewStatus,
    setNewStatusCategory,
    handleSave,
    handleReset,
    addItem,
    removeItem,
    updateItem,
    renameItem,
    addStatus,
    removeStatus,
    updateStatusLabel,
    updateStatusCategory,
    renameStatus,
    setFamilies,
    setServices,
    setEntities,
    setInteractionTypes,
    setStatuses,
    isDirty: formState.isDirty,
  };
};
