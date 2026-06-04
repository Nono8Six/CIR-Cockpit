import { useCallback } from 'react';
import type { UseMutationResult } from '@tanstack/react-query';
import type { ConfigReferenceActionInput, EditableConfigReferenceDimension } from '../../../../shared/schemas/system/config.schema';
import { notifySuccess } from '@/services/errors/notifySuccess';
import { notifyInfo } from '@/services/errors/notifyInfo';
import { addUniqueItem, updateItemAt } from './use-settings-state.helpers';

type UseReferenceItemsParams = {
  agencyId: string | null;
  referenceActionMutation: UseMutationResult<unknown, Error, ConfigReferenceActionInput>;
  canRunImmediateAction: () => boolean;
};

/**
 * Custom hook to perform CRUD operations on settings reference arrays (families, services, etc.).
 *
 * @param params - The hook parameters.
 * @returns The generic item manipulation handlers.
 */
export const useReferenceItems = ({
  agencyId,
  referenceActionMutation,
  canRunImmediateAction
}: UseReferenceItemsParams) => {
  const addItem = useCallback(
    async (
      dimension: EditableConfigReferenceDimension,
      item: string,
      list: string[],
      _setList: (list: string[]) => void,
      clearInput: () => void,
      uppercase = false
    ) => {
      void _setList;
      const next = addUniqueItem(item, list, uppercase);
      if (next !== list) {
        if (!canRunImmediateAction()) return;
        if (!agencyId) {
          return void notifyInfo('Identifiant agence requis.');
        }
        try {
          await referenceActionMutation.mutateAsync({
            action: 'add',
            agency_id: agencyId,
            dimension,
            label: next[next.length - 1] ?? ''
          });
        } catch {
          return;
        }
        clearInput();
        notifySuccess('Valeur ajoutee.');
      }
    },
    [agencyId, canRunImmediateAction, referenceActionMutation]
  );

  const removeItem = useCallback(
    async (
      dimension: EditableConfigReferenceDimension,
      index: number,
      list: string[],
      _setList: (list: string[]) => void
    ) => {
      void _setList;
      const label = list[index]?.trim();
      if (!canRunImmediateAction()) return;
      if (!agencyId || !label) {
        return void notifyInfo('Identifiant agence requis.');
      }
      try {
        await referenceActionMutation.mutateAsync({
          action: 'archive',
          agency_id: agencyId,
          dimension,
          label
        });
      } catch {
        return;
      }
      notifySuccess('Valeur retiree.');
    },
    [agencyId, canRunImmediateAction, referenceActionMutation]
  );

  const renameItem = useCallback(
    async (
      dimension: EditableConfigReferenceDimension,
      index: number,
      nextLabel: string,
      list: string[],
      _setList: (list: string[]) => void,
      uppercase = false
    ) => {
      void _setList;
      const previousLabel = list[index]?.trim();
      const normalizedNextLabel = uppercase ? nextLabel.trim().toUpperCase() : nextLabel.trim();
      if (!agencyId || !previousLabel || !normalizedNextLabel || previousLabel === normalizedNextLabel) return;
      if (!canRunImmediateAction()) return;

      try {
        await referenceActionMutation.mutateAsync({
          action: 'rename',
          agency_id: agencyId,
          dimension,
          previous_label: previousLabel,
          next_label: normalizedNextLabel
        });
      } catch {
        return;
      }
      notifySuccess('Libelle corrige.');
    },
    [agencyId, canRunImmediateAction, referenceActionMutation]
  );

  const updateItem = useCallback(
    (
      index: number,
      value: string,
      list: string[],
      setList: (list: string[]) => void,
      uppercase = false
    ) => {
      setList(updateItemAt(index, value, list, uppercase));
    },
    []
  );

  return {
    addItem,
    removeItem,
    renameItem,
    updateItem
  };
};
