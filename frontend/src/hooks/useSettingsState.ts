import { useCallback, useEffect, useState } from 'react';

import type { AgencyConfig } from '@/services/config';
import type { AgencyStatus, StatusCategory } from '@/types';
import { notifyInfo, notifySuccess } from '@/services/errors/notify';
import { useSaveAgencyConfig } from './useSaveAgencyConfig';
import { addUniqueItem, createStatus, normalizeStatusesForUi, removeItemAt, updateItemAt } from './useSettingsState.helpers';

type UseSettingsStateParams = { config: AgencyConfig; canEdit: boolean; agencyId: string | null };

export const useSettingsState = ({ config, canEdit, agencyId }: UseSettingsStateParams) => {
  const readOnly = !canEdit;
  const saveConfigMutation = useSaveAgencyConfig(agencyId);
  const [families, setFamilies] = useState<string[]>([]);
  const [services, setServices] = useState<string[]>([]);
  const [entities, setEntities] = useState<string[]>([]);
  const [interactionTypes, setInteractionTypes] = useState<string[]>([]);
  const [statuses, setStatuses] = useState<AgencyStatus[]>([]);
  const [newFamily, setNewFamily] = useState('');
  const [newService, setNewService] = useState('');
  const [newEntity, setNewEntity] = useState('');
  const [newInteractionType, setNewInteractionType] = useState('');
  const [newStatus, setNewStatus] = useState('');
  const [newStatusCategory, setNewStatusCategory] = useState<StatusCategory>('todo');

  useEffect(() => {
    setFamilies(config.families);
    setServices(config.services);
    setEntities(config.entities);
    setInteractionTypes(config.interactionTypes);
    setStatuses(normalizeStatusesForUi(config.statuses));
  }, [config]);

  const handleSave = useCallback(async () => {
    if (!canEdit) return void notifyInfo('Acces lecture seule. Contactez un super admin pour modifier.');
    try {
      await saveConfigMutation.mutateAsync({ families, services, entities, interactionTypes, statuses });
      notifySuccess('Configuration sauvegardee');
    } catch {
      return;
    }
  }, [canEdit, entities, families, interactionTypes, saveConfigMutation, services, statuses]);

  const handleReset = useCallback(() => {
    if (!confirm('Recharger la configuration depuis la base ?')) return;
    setFamilies(config.families);
    setServices(config.services);
    setEntities(config.entities);
    setInteractionTypes(config.interactionTypes);
    setStatuses(normalizeStatusesForUi(config.statuses));
  }, [config]);

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
    setStatuses(normalizeStatusesForUi([...statuses, nextStatus]));
    setNewStatus('');
    setNewStatusCategory('todo');
  }, [newStatus, newStatusCategory, statuses]);

  const removeStatus = useCallback((index: number) => {
    const label = statuses[index]?.label?.trim();
    if (!confirm(label ? `Supprimer le statut "${label}" ?` : 'Supprimer ce statut ?')) return;
    setStatuses(previous => normalizeStatusesForUi(previous.filter((_, currentIndex) => currentIndex !== index)));
  }, [statuses]);

  const updateStatusLabel = useCallback((index: number, label: string) => setStatuses(previous => normalizeStatusesForUi(previous.map((status, currentIndex) => currentIndex === index ? { ...status, label } : status))), []);
  const updateStatusCategory = useCallback((index: number, category: StatusCategory) => setStatuses(previous => normalizeStatusesForUi(previous.map((status, currentIndex) => currentIndex === index ? { ...status, category, is_terminal: category === 'done' } : status))), []);

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
