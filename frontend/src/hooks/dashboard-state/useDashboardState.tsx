import { useCallback, useDeferredValue, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';

import type { ConvertClientEntity } from '@/components/ConvertClientDialog';
import { isProspectRelationValue } from '@/constants/relations';
import { isAppError } from '@/services/errors/AppError';
import { handleUiError } from '@/services/errors/handleUiError';
import { notifySuccess } from '@/services/errors/notifySuccess';
import { invalidateInteractionsQuery } from '@/services/query/queryInvalidation';
import type { AgencyStatus, Interaction, InteractionUpdate, TimelineEvent } from '@/types';
import type { AgencyConfig } from '@/services/config';
import {
  buildMyDayView,
  type MyDayView
} from '@/utils/dashboard/dashboardAggregates';
import { filterInteractionsBySearch } from '@/utils/dashboard/dashboardFilters';
import {
  buildTopClients,
  buildWeeklyEvolution,
  computeConversionRate,
  filterDossiersForTable,
  getOldestOverdueDays,
  getOverviewPeriodDays,
  type DossierChannelFilter,
  type OverviewPeriodKey,
  type TopClientEntry,
  type WeeklyEvolutionPoint
} from '@/utils/dashboard/dashboardOverview';
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

export type DashboardOverviewKpis = {
  overdueCount: number;
  oldestOverdueDays: number | null;
  dueTodayCount: number;
  toPlanCount: number;
  openCount: number;
  pipelineOpenCount: number;
  pipelineOpenAmount: number;
  wonCount30d: number;
  lostCount30d: number;
  conversionRate: number | null;
};

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
  resolutions = [],
}: UseDashboardStateParams) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [overviewPeriod, setOverviewPeriod] = useState<OverviewPeriodKey>('30d');
  const [channelFilter, setChannelFilter] = useState<DossierChannelFilter>('all');
  const [selectedInteraction, setSelectedInteraction] = useState<Interaction | null>(null);
  const [interactionToDelete, setInteractionToDelete] = useState<Interaction | null>(null);

  const queryClient = useQueryClient();
  const addTimelineMutation = useAddTimelineEvent(agencyId);
  const deleteInteractionMutation = useDeleteInteraction({ agencyId });

  const { statusById, getStatusMeta, isStatusDone, isStatusTodo, getStatusBadgeClass } =
    useDashboardStatusHelpers(statuses, resolutions);

  const deferredSearchTerm = useDeferredValue(searchTerm);
  const normalizedSearchTerm = useMemo(
    () => deferredSearchTerm.trim().toLowerCase(),
    [deferredSearchTerm]
  );
  const compactSearchTerm = useMemo(
    () => normalizedSearchTerm.replace(/\s/g, ''),
    [normalizedSearchTerm]
  );

  const searchedInteractions = useMemo(
    () => filterInteractionsBySearch(interactions, normalizedSearchTerm, compactSearchTerm, resolutions),
    [compactSearchTerm, interactions, normalizedSearchTerm, resolutions]
  );

  // Les agregats (KPI, pipeline, courbes, top clients) reposent sur tout le
  // perimetre ; la recherche ne filtre que les listes (file et table).
  const pipelineBoard = useMemo<PipelineBoard>(
    () => buildPipelineBoard({ interactions, isStatusDone }),
    [interactions, isStatusDone]
  );

  const globalMyDay = useMemo<MyDayView>(
    () => buildMyDayView(interactions, { isStatusDone, isStatusTodo }),
    [interactions, isStatusDone, isStatusTodo]
  );

  const myDayView = useMemo<MyDayView>(
    () => buildMyDayView(searchedInteractions, { isStatusDone, isStatusTodo }),
    [isStatusDone, isStatusTodo, searchedInteractions]
  );

  const kpis = useMemo<DashboardOverviewKpis>(() => {
    return {
      overdueCount: globalMyDay.kpis.overdueCount,
      oldestOverdueDays: getOldestOverdueDays(globalMyDay.groups.overdue),
      dueTodayCount: globalMyDay.kpis.dueTodayCount,
      toPlanCount: globalMyDay.groups.toPlan.length,
      openCount: globalMyDay.kpis.openCount,
      pipelineOpenCount:
        pipelineBoard.unqualified.length
        + pipelineBoard.qualification.length
        + pipelineBoard.quote_sent.length
        + pipelineBoard.negotiation.length,
      pipelineOpenAmount: pipelineBoard.openAmountTotal,
      wonCount30d: pipelineBoard.wonCount30d,
      lostCount30d: pipelineBoard.lostCount30d,
      conversionRate: computeConversionRate(pipelineBoard.wonCount30d, pipelineBoard.lostCount30d)
    };
  }, [globalMyDay, pipelineBoard]);

  const evolution = useMemo<WeeklyEvolutionPoint[]>(
    () => buildWeeklyEvolution({ interactions, isStatusDone }),
    [interactions, isStatusDone]
  );

  const periodDays = getOverviewPeriodDays(overviewPeriod);

  const topClients = useMemo<TopClientEntry[]>(
    () => buildTopClients({ interactions, periodDays }),
    [interactions, periodDays]
  );

  const tableRows = useMemo(
    () =>
      filterDossiersForTable({
        interactions: searchedInteractions,
        periodDays,
        channel: channelFilter
      }),
    [channelFilter, periodDays, searchedInteractions]
  );

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
    searchTerm,
    setSearchTerm,
    overviewPeriod,
    setOverviewPeriod,
    channelFilter,
    setChannelFilter,
    selectedInteraction,
    setSelectedInteraction,
    kpis,
    myDayView,
    pipelineBoard,
    evolution,
    topClients,
    tableRows,
    getStatusMeta,
    getStatusBadgeClass,
    getChannelIcon: getDashboardChannelIcon,
    handleConvertRequest,
    handleInteractionUpdate,
    handleCompleteReminder,
    handlePostponeReminder,
    handleStageChange,
    isInteractionUpdatePending: addTimelineMutation.isPending,
    interactionToDelete,
    isDeleteInteractionPending: deleteInteractionMutation.isPending,
    setInteractionToDelete,
    handleRequestDeleteInteraction,
    handleConfirmDeleteInteraction
  };
};
