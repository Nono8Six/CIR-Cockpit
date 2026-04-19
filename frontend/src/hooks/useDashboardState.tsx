import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';

import type { ConvertClientEntity } from '@/components/ConvertClientDialog';
import type { KanbanColumns } from '@/components/dashboard/DashboardKanban';
import { isProspectRelationValue } from '@/constants/relations';
import { useDashboardFilters } from '@/hooks/useDashboardFilters';
import { createAppError, isAppError } from '@/services/errors/AppError';
import { handleUiError } from '@/services/errors/handleUiError';
import { notifySuccess } from '@/services/errors/notify';
import { invalidateInteractionsQuery } from '@/services/query/queryInvalidation';
import type { AgencyStatus, Interaction, InteractionUpdate, TimelineEvent } from '@/types';
import { buildKanbanColumns } from '@/utils/dashboard/dashboardAggregates';

import { useAddTimelineEvent } from './useAddTimelineEvent';
import { useDeleteInteraction } from './useDeleteInteraction';
import { getDashboardChannelIcon } from './dashboard-state/getDashboardChannelIcon';
import { useDashboardStatusHelpers } from './dashboard-state/useDashboardStatusHelpers';

type ViewMode = 'kanban' | 'list';

type UseDashboardStateParams = {
  interactions: Interaction[];
  statuses: AgencyStatus[];
  agencyId: string | null;
  onRequestConvert: (entity: ConvertClientEntity) => void;
};

const buildTimelineSuccessMessage = (
  updates: InteractionUpdate | undefined,
  event: TimelineEvent,
  statusById: Map<string, AgencyStatus>,
): string => {
  if (updates?.status_id) {
    return `Statut change : ${statusById.get(updates.status_id)?.label ?? updates.status ?? 'Statut mis a jour'}`;
  }

  if (updates?.status) {
    return `Statut change : ${updates.status}`;
  }

  if (updates?.order_ref) {
    return 'N° de dossier enregistre';
  }

  if (event.type === 'note') {
    return 'Note ajoutee';
  }

  return 'Dossier mis a jour';
};

export const useDashboardState = ({
  interactions,
  statuses,
  agencyId,
  onRequestConvert,
}: UseDashboardStateParams) => {
  const [viewMode, setViewMode] = useState<ViewMode>('kanban');
  const [selectedInteraction, setSelectedInteraction] = useState<Interaction | null>(null);
  const [interactionToDelete, setInteractionToDelete] = useState<Interaction | null>(null);

  const queryClient = useQueryClient();
  const addTimelineMutation = useAddTimelineEvent(agencyId);
  const deleteInteractionMutation = useDeleteInteraction({ agencyId });
  const lastPeriodErrorMessageRef = useRef<string | null>(null);

  const { statusById, getStatusMeta, isStatusDone, isStatusTodo, getStatusBadgeClass, isReminderOverdue } =
    useDashboardStatusHelpers(statuses);

  const {
    searchTerm,
    setSearchTerm,
    period,
    setPeriod,
    periodErrorMessage,
    effectiveStartDate,
    effectiveEndDate,
    filteredData,
    handleDateRangeChange,
    handleStartDateChange,
    handleEndDateChange,
  } = useDashboardFilters({
    interactions,
    viewMode,
    isStatusDone,
  });

  useEffect(() => {
    if (!periodErrorMessage) {
      lastPeriodErrorMessageRef.current = null;
      return;
    }

    if (periodErrorMessage === lastPeriodErrorMessageRef.current) {
      return;
    }

    lastPeriodErrorMessageRef.current = periodErrorMessage;
    handleUiError(
      createAppError({
        code: 'VALIDATION_ERROR',
        message: periodErrorMessage,
        source: 'validation',
      }),
      periodErrorMessage,
      { source: 'dashboard.filters' },
    );
  }, [periodErrorMessage]);

  const kanbanColumns = useMemo<KanbanColumns | null>(() => {
    if (viewMode === 'list') {
      return null;
    }

    return buildKanbanColumns({
      interactions: filteredData,
      isStatusTodo,
      isStatusDone,
      isReminderOverdue,
    });
  }, [filteredData, isReminderOverdue, isStatusDone, isStatusTodo, viewMode]);

  const handleConvertRequest = useCallback(
    (interaction: Interaction) => {
      if (!interaction.entity_id || !isProspectRelationValue(interaction.entity_type)) {
        return;
      }

      onRequestConvert({
        id: interaction.entity_id,
        name: interaction.company_name,
        client_number: null,
        account_type: null,
      });
    },
    [onRequestConvert],
  );

  const handleInteractionUpdate = useCallback(
    async (interaction: Interaction, event: TimelineEvent, updates?: InteractionUpdate) => {
      try {
        const updated = await addTimelineMutation.mutateAsync({ interaction, event, updates });

        if (selectedInteraction?.id === interaction.id) {
          setSelectedInteraction(updated);
        }

        notifySuccess(buildTimelineSuccessMessage(updates, event, statusById));
      } catch (error) {
        if (isAppError(error) && error.code === 'CONFLICT') {
          setSelectedInteraction(null);
          void invalidateInteractionsQuery(queryClient, agencyId);
          handleUiError(
            error,
            'Ce dossier a ete modifie par un autre utilisateur. Rechargez les donnees.',
            { source: 'dashboard.details.conflict' },
          );
          return;
        }

        handleUiError(error, 'Impossible de mettre a jour le dossier.', {
          source: 'dashboard.details.update',
        });
      }
    },
    [addTimelineMutation, agencyId, queryClient, selectedInteraction, statusById],
  );

  const handleRequestDeleteInteraction = useCallback((interaction: Interaction) => {
    setInteractionToDelete(interaction);
  }, []);

  const handleConfirmDeleteInteraction = useCallback(async () => {
    if (!interactionToDelete) {
      return;
    }

    try {
      const deletedInteractionId = await deleteInteractionMutation.mutateAsync(interactionToDelete.id);
      if (selectedInteraction?.id === deletedInteractionId) {
        setSelectedInteraction(null);
      }
      setInteractionToDelete(null);
      notifySuccess('Interaction supprimee.');
    } catch {
      return;
    }
  }, [deleteInteractionMutation, interactionToDelete, selectedInteraction]);

  return {
    viewMode,
    searchTerm,
    selectedInteraction,
    period,
    periodErrorMessage,
    effectiveStartDate,
    effectiveEndDate,
    filteredData,
    kanbanColumns,
    getStatusMeta,
    getStatusBadgeClass,
    getChannelIcon: getDashboardChannelIcon,
    setViewMode,
    setSearchTerm,
    setPeriod,
    setSelectedInteraction,
    setInteractionToDelete,
    handleDateRangeChange,
    handleStartDateChange,
    handleEndDateChange,
    handleConvertRequest,
    handleInteractionUpdate,
    interactionToDelete,
    isDeleteInteractionPending: deleteInteractionMutation.isPending,
    handleRequestDeleteInteraction,
    handleConfirmDeleteInteraction,
  };
};
