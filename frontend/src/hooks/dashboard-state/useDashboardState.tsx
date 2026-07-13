import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';

import type { ConvertClientEntity } from '@/components/ConvertClientDialog';
import type { DashboardHeaderStats } from '@/components/dashboard/DashboardPageHeader';
import { isProspectRelationValue } from '@/constants/relations';
import { useDashboardFilters } from './useDashboardFilters';
import { createAppError, isAppError } from '@/services/errors/AppError';
import { handleUiError } from '@/services/errors/handleUiError';
import { notifySuccess } from '@/services/errors/notifySuccess';
import { invalidateInteractionsQuery } from '@/services/query/queryInvalidation';
import type { AgencyStatus, Interaction, InteractionUpdate, TimelineEvent } from '@/types';
import type { AgencyConfig } from '@/services/config';
import {
  buildMyDayView,
  type MyDayView
} from '@/utils/dashboard/dashboardAggregates';
import type { DashboardViewMode } from '@/utils/dashboard/dashboardFilters';
import {
  buildPipelineBoard,
  getPipelineStageLabel,
  type PipelineBoard,
  type PipelineMoveTarget
} from '@/utils/dashboard/dashboardPipeline';
import { buildReminderPresetValue } from '@/utils/date/buildReminderPresetValue';
import { formatDateTime } from '@/utils/date/formatDateTime';
import { getNowIsoString } from '@/utils/date/getNowIsoString';
import { isBeforeNow } from '@/utils/date/isBeforeNow';

import { useAddTimelineEvent } from '../interactions/timeline/useAddTimelineEvent';
import { useDeleteInteraction } from '../interactions/core/actions/useDeleteInteraction';
import { getDashboardChannelIcon } from './getDashboardChannelIcon';
import { useDashboardStatusHelpers } from './useDashboardStatusHelpers';

type UseDashboardStateParams = {
  interactions: Interaction[];
  statuses: AgencyStatus[];
  agencyId: string | null;
  onRequestConvert: (entity: ConvertClientEntity) => void;
  resolutions?: NonNullable<AgencyConfig['resolutions']>;
};

const buildTimelineSuccessMessage = (
  updates: InteractionUpdate | undefined,
  event: TimelineEvent,
  statusById: Map<string, AgencyStatus>,
): string => {
  if (updates?.status_id) {
    return `Statut changé : ${statusById.get(updates.status_id)?.label ?? updates.status ?? 'Statut mis à jour'}`;
  }

  if (updates?.status) {
    return `Statut changé : ${updates.status}`;
  }

  if (updates?.order_ref) {
    return 'N° de dossier enregistré';
  }

  if (event.type === 'reminder_change' || event.type === 'stage_change') {
    return event.content;
  }

  if (event.type === 'note') {
    return 'Note ajoutée';
  }

  return 'Dossier mis à jour';
};

export const useDashboardState = ({
  interactions,
  statuses,
  agencyId,
  onRequestConvert,
  resolutions,
}: UseDashboardStateParams) => {
  const [viewMode, setViewMode] = useState<DashboardViewMode>('myday');
  const [selectedInteraction, setSelectedInteraction] = useState<Interaction | null>(null);
  const [interactionToDelete, setInteractionToDelete] = useState<Interaction | null>(null);

  const queryClient = useQueryClient();
  const addTimelineMutation = useAddTimelineEvent(agencyId);
  const deleteInteractionMutation = useDeleteInteraction({ agencyId });
  const lastPeriodErrorMessageRef = useRef<string | null>(null);

  const { statusById, getStatusMeta, isStatusDone, isStatusTodo, getStatusBadgeClass } =
    useDashboardStatusHelpers(statuses, resolutions);


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
    resolutions,
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

  // Statistiques d'en-tete calculees sur l'ensemble des dossiers (hors recherche/periode)
  // pour que le titre et les onglets racontent toujours le meme etat global.
  const headerStats = useMemo<DashboardHeaderStats>(() => {
    const globalMyDay = buildMyDayView(interactions, { isStatusDone, isStatusTodo });
    const globalPipeline = buildPipelineBoard({ interactions, isStatusDone });

    return {
      overdueCount: globalMyDay.kpis.overdueCount,
      dueTodayCount: globalMyDay.kpis.dueTodayCount,
      openCount: globalMyDay.kpis.openCount,
      pipelineOpenCount:
        globalPipeline.unqualified.length
        + globalPipeline.qualification.length
        + globalPipeline.quote_sent.length
        + globalPipeline.negotiation.length,
      pipelineOpenAmount: globalPipeline.openAmountTotal,
      wonCount30d: globalPipeline.wonCount30d,
      lostCount30d: globalPipeline.lostCount30d
    };
  }, [interactions, isStatusDone, isStatusTodo]);

  const myDayView = useMemo<MyDayView | null>(() => {
    if (viewMode !== 'myday') {
      return null;
    }

    return buildMyDayView(filteredData, { isStatusDone, isStatusTodo });
  }, [filteredData, isStatusDone, isStatusTodo, viewMode]);

  const pipelineBoard = useMemo<PipelineBoard | null>(() => {
    if (viewMode !== 'pipeline') {
      return null;
    }

    return buildPipelineBoard({ interactions: filteredData, isStatusDone });
  }, [filteredData, isStatusDone, viewMode]);

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
            'Ce dossier a été modifié par un autre utilisateur. Rechargez les données.',
            { source: 'dashboard.details.conflict' },
          );
          return;
        }

        handleUiError(error, 'Impossible de mettre à jour le dossier.', {
          source: 'dashboard.details.update',
        });
      }
    },
    [addTimelineMutation, agencyId, queryClient, selectedInteraction, statusById],
  );

  const handleCompleteReminder = useCallback(
    async (interaction: Interaction) => {
      const now = getNowIsoString();
      await handleInteractionUpdate(
        interaction,
        {
          id: `${Date.now()}rm`,
          date: now,
          type: 'reminder_change',
          content: 'Relance effectuée'
        },
        { reminder_at: null, last_action_at: now }
      );
    },
    [handleInteractionUpdate],
  );

  const handlePostponeReminder = useCallback(
    async (interaction: Interaction, daysAhead: number) => {
      const now = getNowIsoString();
      const reminderValue = buildReminderPresetValue(daysAhead);
      await handleInteractionUpdate(
        interaction,
        {
          id: `${Date.now()}rm`,
          date: now,
          type: 'reminder_change',
          content: `Rappel planifié : ${formatDateTime(reminderValue)}`
        },
        { reminder_at: reminderValue, last_action_at: now }
      );
    },
    [handleInteractionUpdate],
  );

  // Deplacement d'etape pipeline. quote_sent pose la date d'envoi du devis et planifie
  // une relance J+7 a 09:00 si aucun rappel futur n'existe ; won/lost effacent le rappel.
  const handleStageChange = useCallback(
    async (
      interaction: Interaction,
      nextStage: PipelineMoveTarget,
      options?: { lostReason?: string }
    ) => {
      if ((interaction.stage ?? null) === nextStage) {
        return;
      }

      const now = getNowIsoString();
      const updates: InteractionUpdate = {
        stage: nextStage,
        stage_changed_at: now,
        last_action_at: now
      };
      let content = `Étape : ${getPipelineStageLabel(interaction.stage)} ➔ ${getPipelineStageLabel(nextStage)}`;

      if (nextStage === 'quote_sent') {
        if (!interaction.quote_sent_at) {
          updates.quote_sent_at = now;
        }
        const hasUpcomingReminder = Boolean(
          interaction.reminder_at && !isBeforeNow(interaction.reminder_at)
        );
        if (!hasUpcomingReminder) {
          const reminderValue = buildReminderPresetValue(7);
          updates.reminder_at = reminderValue;
          content += ` · Relance planifiée : ${formatDateTime(reminderValue)}`;
        }
      }

      if (nextStage === 'won' || nextStage === 'lost') {
        updates.reminder_at = null;
      }

      if (nextStage === 'lost') {
        updates.lost_reason = options?.lostReason?.trim() || null;
        if (updates.lost_reason) {
          content += ` · Motif : ${updates.lost_reason}`;
        }
      }

      await handleInteractionUpdate(
        interaction,
        {
          id: `${Date.now()}sg`,
          date: now,
          type: 'stage_change',
          content
        },
        updates
      );
    },
    [handleInteractionUpdate],
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
      notifySuccess('Interaction supprimée.');
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
    headerStats,
    myDayView,
    pipelineBoard,
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
    handleCompleteReminder,
    handlePostponeReminder,
    handleStageChange,
    isInteractionUpdatePending: addTimelineMutation.isPending,
    interactionToDelete,
    isDeleteInteractionPending: deleteInteractionMutation.isPending,
    handleRequestDeleteInteraction,
    handleConfirmDeleteInteraction,
  };
};
