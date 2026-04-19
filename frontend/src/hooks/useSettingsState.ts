import { useCallback, useEffect } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import type { ResolvedConfigSnapshot } from 'shared/schemas/config.schema';

import type { AgencyStatus, StatusCategory } from '@/types';
import { notifyInfo, notifySuccess } from '@/services/errors/notify';

import { useSaveAgencyConfig } from './useSaveAgencyConfig';
import { useSaveProductConfig } from './useSaveProductConfig';
import {
  addUniqueItem,
  createStatus,
  normalizeStatusesForUi,
  removeItemAt,
  updateItemAt,
} from './useSettingsState.helpers';
import {
  buildSettingsFormDefaultValues,
  settingsFormSchema,
  toAgencyOnboardingPayload,
  type AccountTypeOverrideValue,
  type BooleanOverrideValue,
  type SettingsFormValues,
} from './settings-state/settingsFormSchema';

type UseSettingsStateParams = {
  snapshot: ResolvedConfigSnapshot;
  canEditAgencySettings: boolean;
  canEditProductSettings: boolean;
  agencyId: string | null;
};

export const useSettingsState = ({
  snapshot,
  canEditAgencySettings,
  canEditProductSettings,
  agencyId,
}: UseSettingsStateParams) => {
  const readOnly = !canEditAgencySettings && !canEditProductSettings;
  const saveAgencyConfigMutation = useSaveAgencyConfig(agencyId);
  const saveProductConfigMutation = useSaveProductConfig(agencyId);
  const form = useForm<SettingsFormValues>({
    resolver: zodResolver(settingsFormSchema),
    defaultValues: buildSettingsFormDefaultValues(snapshot, agencyId),
    mode: 'onChange',
  });

  const { control, setValue, reset, handleSubmit, formState } = form;

  const allowManualEntryOverride = useWatch({ control, name: 'agencyAllowManualEntry' }) ?? 'inherit';
  const defaultCompanyAccountTypeOverride =
    useWatch({ control, name: 'agencyDefaultCompanyAccountType' }) ?? 'inherit';
  const productAllowManualEntry = useWatch({ control, name: 'productAllowManualEntry' }) ?? true;
  const productDefaultCompanyAccountType =
    useWatch({ control, name: 'productDefaultCompanyAccountType' }) ?? 'term';
  const productUiShellV2 = useWatch({ control, name: 'productUiShellV2' }) ?? false;
  const families = useWatch({ control, name: 'families' }) ?? [];
  const services = useWatch({ control, name: 'services' }) ?? [];
  const entities = useWatch({ control, name: 'entities' }) ?? [];
  const interactionTypes = useWatch({ control, name: 'interactionTypes' }) ?? [];
  const statuses = useWatch({ control, name: 'statuses' }) ?? [];
  const newFamily = useWatch({ control, name: 'newFamily' }) ?? '';
  const newService = useWatch({ control, name: 'newService' }) ?? '';
  const newEntity = useWatch({ control, name: 'newEntity' }) ?? '';
  const newInteractionType = useWatch({ control, name: 'newInteractionType' }) ?? '';
  const newStatus = useWatch({ control, name: 'newStatus' }) ?? '';
  const newStatusCategory = useWatch({ control, name: 'newStatusCategory' }) ?? 'todo';

  useEffect(() => {
    reset(buildSettingsFormDefaultValues(snapshot, agencyId));
  }, [agencyId, reset, snapshot]);

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

  const addItem = useCallback(
    (
      item: string,
      list: string[],
      setList: (list: string[]) => void,
      clearInput: () => void,
      uppercase = false,
    ) => {
      const next = addUniqueItem(item, list, uppercase);
      if (next !== list) {
        setList(next);
        clearInput();
      }
    },
    [],
  );

  const removeItem = useCallback((index: number, list: string[], setList: (list: string[]) => void) => {
    const label = list[index]?.trim();
    if (!confirm(label ? `Supprimer l'element "${label}" ?` : 'Supprimer cet element ?')) return;
    setList(removeItemAt(index, list));
  }, []);

  const updateItem = useCallback(
    (index: number, value: string, list: string[], setList: (list: string[]) => void, uppercase = false) => {
      setList(updateItemAt(index, value, list, uppercase));
    },
    [],
  );

  const addStatus = useCallback(() => {
    if (statuses.some((status) => status.label.trim().toLowerCase() === newStatus.trim().toLowerCase()))
      return;
    const nextStatus = createStatus(newStatus, newStatusCategory, statuses.length + 1);
    if (!nextStatus)
      return void notifyInfo('Impossible de generer un identifiant de statut. Rechargez la page.');
    setStatuses([...statuses, nextStatus]);
    setNewStatus('');
    setNewStatusCategory('todo');
  }, [newStatus, newStatusCategory, setNewStatus, setNewStatusCategory, setStatuses, statuses]);

  const removeStatus = useCallback(
    (index: number) => {
      const label = statuses[index]?.label?.trim();
      if (!confirm(label ? `Supprimer le statut "${label}" ?` : 'Supprimer ce statut ?')) return;
      setStatuses(statuses.filter((_, currentIndex) => currentIndex !== index));
    },
    [setStatuses, statuses],
  );

  const updateStatusLabel = useCallback(
    (index: number, label: string) => {
      setStatuses(
        statuses.map((status, currentIndex) => (currentIndex === index ? { ...status, label } : status)),
      );
    },
    [setStatuses, statuses],
  );
  const updateStatusCategory = useCallback(
    (index: number, category: StatusCategory) => {
      setStatuses(
        statuses.map((status, currentIndex) =>
          currentIndex === index ? { ...status, category, is_terminal: category === 'done' } : status,
        ),
      );
    },
    [setStatuses, statuses],
  );

  return {
    readOnly,
    isSaving: saveAgencyConfigMutation.isPending || saveProductConfigMutation.isPending,
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
    addStatus,
    removeStatus,
    updateStatusLabel,
    updateStatusCategory,
    setFamilies,
    setServices,
    setEntities,
    setInteractionTypes,
  };
};
