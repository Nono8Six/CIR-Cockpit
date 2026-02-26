import { useCallback, useEffect } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod/v4';

import type { AgencyConfig } from '@/services/config';
import type { AgencyStatus, StatusCategory } from '@/types';
import { notifyInfo, notifySuccess } from '@/services/errors/notify';
import { useSaveAgencyConfig } from './useSaveAgencyConfig';
import { addUniqueItem, createStatus, normalizeStatusesForUi, removeItemAt, updateItemAt } from './useSettingsState.helpers';
import { uuidSchema } from '../../../shared/schemas/auth.schema';

type UseSettingsStateParams = { config: AgencyConfig; canEdit: boolean; agencyId: string | null };

const statusCategorySchema = z.enum(['todo', 'in_progress', 'done']);
const MAX_CONFIG_LABEL_LENGTH = 120;

const settingsStatusSchema = z.object({
  id: z.string().optional(),
  agency_id: z.string().optional(),
  label: z.string().trim().min(1, 'Label requis').max(MAX_CONFIG_LABEL_LENGTH, 'Label trop long'),
  category: statusCategorySchema,
  is_terminal: z.boolean(),
  is_default: z.boolean(),
  sort_order: z.number().int()
}).strict();

const settingsFormSchema = z.object({
  agency_id: uuidSchema,
  statuses: z.array(settingsStatusSchema).min(1, 'Au moins un statut requis'),
  services: z.array(z.string().trim().max(MAX_CONFIG_LABEL_LENGTH, 'Label service trop long')),
  entities: z.array(z.string().trim().max(MAX_CONFIG_LABEL_LENGTH, 'Label entite trop long')),
  families: z.array(z.string().trim().max(MAX_CONFIG_LABEL_LENGTH, 'Label famille trop long')),
  interactionTypes: z.array(z.string().trim().max(MAX_CONFIG_LABEL_LENGTH, "Label type d'interaction trop long")),
  newFamily: z.string(),
  newService: z.string(),
  newEntity: z.string(),
  newInteractionType: z.string(),
  newStatus: z.string(),
  newStatusCategory: statusCategorySchema
}).strict();

type SettingsFormValues = z.infer<typeof settingsFormSchema>;

const buildDefaultValues = (config: AgencyConfig, agencyId: string | null): SettingsFormValues => ({
  agency_id: agencyId ?? '',
  statuses: normalizeStatusesForUi(config.statuses),
  services: config.services,
  entities: config.entities,
  families: config.families,
  interactionTypes: config.interactionTypes,
  newFamily: '',
  newService: '',
  newEntity: '',
  newInteractionType: '',
  newStatus: '',
  newStatusCategory: 'todo'
});

export const useSettingsState = ({ config, canEdit, agencyId }: UseSettingsStateParams) => {
  const readOnly = !canEdit;
  const saveConfigMutation = useSaveAgencyConfig(agencyId);
  const form = useForm<SettingsFormValues>({
    resolver: zodResolver(settingsFormSchema),
    defaultValues: buildDefaultValues(config, agencyId),
    mode: 'onChange'
  });

  const { control, setValue, reset, handleSubmit, formState } = form;

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
    reset(buildDefaultValues(config, agencyId));
  }, [agencyId, config, reset]);

  const setStringField = useCallback((field: keyof SettingsFormValues, value: string) => {
    setValue(field, value as never, { shouldDirty: true, shouldValidate: true });
  }, [setValue]);
  const setArrayField = useCallback((field: keyof SettingsFormValues, value: string[] | AgencyStatus[]) => {
    setValue(field, value as never, { shouldDirty: true, shouldValidate: true });
  }, [setValue]);

  const setNewFamily = useCallback((value: string) => setStringField('newFamily', value), [setStringField]);
  const setNewService = useCallback((value: string) => setStringField('newService', value), [setStringField]);
  const setNewEntity = useCallback((value: string) => setStringField('newEntity', value), [setStringField]);
  const setNewInteractionType = useCallback((value: string) => setStringField('newInteractionType', value), [setStringField]);
  const setNewStatus = useCallback((value: string) => setStringField('newStatus', value), [setStringField]);
  const setNewStatusCategory = useCallback((value: StatusCategory) => {
    setValue('newStatusCategory', value, { shouldDirty: true, shouldValidate: true });
  }, [setValue]);
  const setFamilies = useCallback((next: string[]) => setArrayField('families', next), [setArrayField]);
  const setServices = useCallback((next: string[]) => setArrayField('services', next), [setArrayField]);
  const setEntities = useCallback((next: string[]) => setArrayField('entities', next), [setArrayField]);
  const setInteractionTypes = useCallback((next: string[]) => setArrayField('interactionTypes', next), [setArrayField]);
  const setStatuses = useCallback((next: AgencyStatus[]) => setArrayField('statuses', normalizeStatusesForUi(next)), [setArrayField]);

  const handleSave = async () => {
    if (!canEdit) return void notifyInfo('Acces lecture seule. Contactez un super admin pour modifier.');

    const submit = handleSubmit(async (values) => {
      try {
        await saveConfigMutation.mutateAsync({
          families: values.families,
          services: values.services,
          entities: values.entities,
          interactionTypes: values.interactionTypes,
          statuses: normalizeStatusesForUi(values.statuses)
        });
        notifySuccess('Configuration sauvegardee');
      } catch {
        return;
      }
    }, () => {
      const firstError = formState.errors.statuses?.message
        ?? formState.errors.services?.message
        ?? formState.errors.entities?.message
        ?? formState.errors.families?.message
        ?? formState.errors.interactionTypes?.message
        ?? formState.errors.agency_id?.message
        ?? 'Configuration invalide.';
      notifyInfo(firstError);
    });

    await submit();
  };

  const handleReset = useCallback(() => {
    if (!confirm('Recharger la configuration depuis la base ?')) return;
    reset(buildDefaultValues(config, agencyId));
  }, [agencyId, config, reset]);

  const addItem = useCallback((item: string, list: string[], setList: (list: string[]) => void, clearInput: () => void, uppercase = false) => {
    const next = addUniqueItem(item, list, uppercase);
    if (next !== list) {
      setList(next);
      clearInput();
    }
  }, []);

  const removeItem = useCallback((index: number, list: string[], setList: (list: string[]) => void) => {
    const label = list[index]?.trim();
    if (!confirm(label ? `Supprimer l'element "${label}" ?` : 'Supprimer cet element ?')) return;
    setList(removeItemAt(index, list));
  }, []);

  const updateItem = useCallback((index: number, value: string, list: string[], setList: (list: string[]) => void, uppercase = false) => {
    setList(updateItemAt(index, value, list, uppercase));
  }, []);

  const addStatus = useCallback(() => {
    if (statuses.some(status => status.label.trim().toLowerCase() === newStatus.trim().toLowerCase())) return;
    const nextStatus = createStatus(newStatus, newStatusCategory, statuses.length + 1);
    if (!nextStatus) return void notifyInfo('Impossible de generer un identifiant de statut. Rechargez la page.');
    setStatuses([...statuses, nextStatus]);
    setNewStatus('');
    setNewStatusCategory('todo');
  }, [newStatus, newStatusCategory, setNewStatus, setNewStatusCategory, setStatuses, statuses]);

  const removeStatus = useCallback((index: number) => {
    const label = statuses[index]?.label?.trim();
    if (!confirm(label ? `Supprimer le statut "${label}" ?` : 'Supprimer ce statut ?')) return;
    setStatuses(statuses.filter((_, currentIndex) => currentIndex !== index));
  }, [setStatuses, statuses]);

  const updateStatusLabel = useCallback((index: number, label: string) => {
    setStatuses(statuses.map((status, currentIndex) => currentIndex === index ? { ...status, label } : status));
  }, [setStatuses, statuses]);
  const updateStatusCategory = useCallback((index: number, category: StatusCategory) => {
    setStatuses(statuses.map((status, currentIndex) => currentIndex === index ? { ...status, category, is_terminal: category === 'done' } : status));
  }, [setStatuses, statuses]);

  return {
    readOnly,
    isSaving: saveConfigMutation.isPending,
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
    setInteractionTypes
  };
};
