import { useCallback } from 'react';
import type { UseMutationResult } from '@tanstack/react-query';
import type { ConfigReferenceActionInput } from '../../../../shared/schemas/system/config.schema';
import type { AgencyStatus, StatusCategory } from '@/types';
import { notifySuccess } from '@/services/errors/notifySuccess';
import { notifyInfo } from '@/services/errors/notifyInfo';
import { createStatus } from './use-settings-state.helpers';

type UseReferenceStatusesParams = {
  agencyId: string | null;
  referenceActionMutation: UseMutationResult<unknown, Error, ConfigReferenceActionInput>;
  statuses: AgencyStatus[];
  setStatuses: (statuses: AgencyStatus[]) => void;
  newStatus: string;
  setNewStatus: (value: string) => void;
  newStatusCategory: StatusCategory;
  setNewStatusCategory: (value: StatusCategory) => void;
};

/**
 * Custom hook to perform CRUD operations on settings reference statuses.
 *
 * @param params - The hook parameters.
 * @returns The status-specific reference manipulation handlers.
 */
export const useReferenceStatuses = ({
  agencyId,
  referenceActionMutation,
  statuses,
  setStatuses,
  newStatus,
  setNewStatus,
  newStatusCategory,
  setNewStatusCategory
}: UseReferenceStatusesParams) => {
  const addStatus = useCallback(async () => {
    if (statuses.some((status) => status.label.trim().toLowerCase() === newStatus.trim().toLowerCase()))
      return;
    const nextStatus = createStatus(newStatus, newStatusCategory, statuses.length + 1);
    if (!nextStatus)
      return void notifyInfo('Impossible de generer un identifiant de statut. Rechargez la page.');
    if (!agencyId) {
      return void notifyInfo('Identifiant agence requis.');
    }
    try {
      await referenceActionMutation.mutateAsync({
        action: 'add',
        agency_id: agencyId,
        dimension: 'statuses',
        status_id: nextStatus.id,
        label: nextStatus.label,
        category: nextStatus.category
      });
    } catch {
      return;
    }
    setStatuses([...statuses, nextStatus]);
    setNewStatus('');
    setNewStatusCategory('todo');
    notifySuccess('Statut ajoute.');
  }, [
    agencyId,
    newStatus,
    newStatusCategory,
    referenceActionMutation,
    setNewStatus,
    setNewStatusCategory,
    setStatuses,
    statuses
  ]);

  const removeStatus = useCallback(
    async (index: number) => {
      const label = statuses[index]?.label?.trim();
      if (!confirm(label ? `Supprimer le statut "${label}" ?` : 'Supprimer ce statut ?')) return;
      if (!agencyId || !statuses[index]?.id) {
        return void notifyInfo('Identifiant statut requis.');
      }
      try {
        await referenceActionMutation.mutateAsync({
          action: 'delete',
          agency_id: agencyId,
          dimension: 'statuses',
          reference_id: statuses[index]?.id
        });
      } catch {
        return;
      }
      setStatuses(statuses.filter((_, currentIndex) => currentIndex !== index));
      notifySuccess('Statut supprime.');
    },
    [agencyId, referenceActionMutation, setStatuses, statuses]
  );

  const updateStatusLabel = useCallback(
    (index: number, label: string) => {
      setStatuses(
        statuses.map((status, currentIndex) => (currentIndex === index ? { ...status, label } : status))
      );
    },
    [setStatuses, statuses]
  );

  const updateStatusCategory = useCallback(
    (index: number, category: StatusCategory) => {
      setStatuses(
        statuses.map((status, currentIndex) =>
          currentIndex === index ? { ...status, category, is_terminal: category === 'done' } : status
        )
      );
    },
    [setStatuses, statuses]
  );

  const renameStatus = useCallback(
    async (index: number, nextLabel: string) => {
      const status = statuses[index];
      const normalizedNextLabel = nextLabel.trim();
      if (!agencyId || !status?.id || !normalizedNextLabel || status.label === normalizedNextLabel) return;

      try {
        await referenceActionMutation.mutateAsync({
          action: 'rename',
          agency_id: agencyId,
          dimension: 'statuses',
          reference_id: status.id,
          next_label: normalizedNextLabel
        });
      } catch {
        return;
      }
      setStatuses(
        statuses.map((current, currentIndex) =>
          currentIndex === index ? { ...current, label: normalizedNextLabel } : current
        )
      );
      notifySuccess('Statut renomme.');
    },
    [agencyId, referenceActionMutation, setStatuses, statuses]
  );

  return {
    addStatus,
    removeStatus,
    updateStatusLabel,
    updateStatusCategory,
    renameStatus
  };
};
