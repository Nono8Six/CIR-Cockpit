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
  type SettingsFormValues,
} from './settingsFormSchema';

import { useSettingsMutations } from './use-settings-mutations';
import { useSettingsForm } from './use-settings-form';
import { useReferenceItems } from './use-reference-items';
import { useReferenceStatuses } from './use-reference-statuses';

type UseSettingsStateParams = {
  snapshot: ResolvedConfigSnapshot;
  canEditAgencySettings: boolean;
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
  agencyId,
}: UseSettingsStateParams) => {
  const readOnly = !canEditAgencySettings;

  const { saveReferencesMutation, referenceActionMutation } = useSettingsMutations(agencyId);

  const {
    form,
    families,
    services,
    interactionTypes,
    statuses,
    newFamily,
    newService,
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

  const setNewFamily = useCallback((value: string) => setStringField('newFamily', value), [setStringField]);
  const setNewService = useCallback((value: string) => setStringField('newService', value), [setStringField]);
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
          await saveReferencesMutation.mutateAsync({
            agency_id: values.agency_id,
            statuses: normalizeStatusesForUi(values.statuses).map((status) => ({
              id: status.id,
              label: status.label,
              category: status.category,
            })),
            services: values.services,
            families: values.families,
            interactionTypes: values.interactionTypes,
          });
          reset({
            ...values,
            statuses: normalizeStatusesForUi(values.statuses),
            newFamily: '',
            newService: '',
            newInteractionType: '',
            newStatus: '',
            newStatusCategory: 'todo',
          });
          notifySuccess('Configuration sauvegardee');
        } catch {
          return;
        }
      },
      () => {
        const firstError =
          formState.errors.statuses?.message ??
          formState.errors.services?.message ??
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
    isSaving: saveReferencesMutation.isPending || referenceActionMutation.isPending,
    families,
    services,
    interactionTypes,
    statuses,
    newFamily,
    newService,
    newInteractionType,
    newStatus,
    newStatusCategory,
    setNewFamily,
    setNewService,
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
    setInteractionTypes,
    setStatuses,
    isDirty: formState.isDirty,
  };
};
