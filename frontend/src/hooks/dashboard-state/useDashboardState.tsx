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
import { filterInteractionsBySearch } from '@/utils/dashboard/dashboardFilters';
import {
  DEFAULT_DOSSIER_SORT,
  buildDossierRows,
  buildOpenDossiersDelta,
  buildWeeklyEvolution,
  computeConversionRate,
  getDefaultSortDirection,
  getOverviewPeriodDays,
  hasEnoughEvolutionPoints,
  selectDossierRows,
  type DossierChannelFilter,
  type DossierRow,
  type DossierScopeFilter,
  type DossierSort,
  type DossierSortKey,
  type OpenDossiersDelta,
  type OverviewPeriodKey,
  type WeeklyEvolutionPoint
} from '@/utils/dashboard/dashboardOverview';
import {
  buildPipelineBoard,
  getPipelineStageLabel,
  type PipelineBoard,
  type PipelineMoveTarget
} from '@/utils/dashboard/dashboardPipeline';
import { getNowIsoString } from '@/utils/date/getNowIsoString';

import { useAddTimelineEvent } from '../interactions/timeline/useAddTimelineEvent';
import { useDeleteInteraction } from '../interactions/core/actions/useDeleteInteraction';
import { getDashboardChannelIcon } from './getDashboardChannelIcon';
import { useDashboardStatusHelpers } from './useDashboardStatusHelpers';

export type DashboardOverviewKpis = {
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
  const [scopeFilter, setScopeFilter] = useState<DossierScopeFilter>('open');
  const [sort, setSort] = useState<DossierSort>(DEFAULT_DOSSIER_SORT);
  const [selectedInteraction, setSelectedInteraction] = useState<Interaction | null>(null);
  const [interactionToDelete, setInteractionToDelete] = useState<Interaction | null>(null);

  const queryClient = useQueryClient();
  const addTimelineMutation = useAddTimelineEvent(agencyId);
  const deleteInteractionMutation = useDeleteInteraction({ agencyId });

  const { statusById, getStatusMeta, isStatusDone, getStatusBadgeClass } =
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

  const kpis = useMemo<DashboardOverviewKpis>(() => {
    return {
      openCount: interactions.filter((interaction) => !isStatusDone(interaction)).length,
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
  }, [interactions, isStatusDone, pipelineBoard]);

  const evolution = useMemo<WeeklyEvolutionPoint[]>(
    () => buildWeeklyEvolution({ interactions, isStatusDone }),
    [interactions, isStatusDone]
  );

  const periodDays = getOverviewPeriodDays(overviewPeriod);

  const showEvolutionChart = useMemo(() => hasEnoughEvolutionPoints(evolution), [evolution]);
  const openDossiersDelta = useMemo<OpenDossiersDelta | null>(
    () => buildOpenDossiersDelta(evolution),
    [evolution]
  );

  const dossierRows = useMemo<DossierRow[]>(
    () => buildDossierRows({ interactions: searchedInteractions, isStatusDone }),
    [isStatusDone, searchedInteractions]
  );

  const tableRows = useMemo<DossierRow[]>(
    () =>
      selectDossierRows({
        rows: dossierRows,
        scope: scopeFilter,
        channel: channelFilter,
        periodDays,
        sort
      }),
    [channelFilter, dossierRows, periodDays, scopeFilter, sort]
  );

  // Un clic sur une colonne deja active inverse le sens, sinon on repart du sens naturel.
  const toggleSort = useCallback((key: DossierSortKey) => {
    setSort((previous) =>
      previous.key === key
        ? { key, direction: previous.direction === 'asc' ? 'desc' : 'asc' }
        : { key, direction: getDefaultSortDirection(key) }
    );
  }, []);

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

  // Deplacement d'etape pipeline. Le travail futur est planifie exclusivement dans Tâches.
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
      notifySuccess('Activité archivée.');
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
    scopeFilter,
    setScopeFilter,
    sort,
    toggleSort,
    selectedInteraction,
    setSelectedInteraction,
    kpis,
    pipelineBoard,
    evolution,
    showEvolutionChart,
    openDossiersDelta,
    tableRows,
    getStatusMeta,
    getStatusBadgeClass,
    getChannelIcon: getDashboardChannelIcon,
    handleConvertRequest,
    handleInteractionUpdate,
    handleStageChange,
    isInteractionUpdatePending: addTimelineMutation.isPending,
    interactionToDelete,
    isDeleteInteractionPending: deleteInteractionMutation.isPending,
    setInteractionToDelete,
    handleRequestDeleteInteraction,
    handleConfirmDeleteInteraction
  };
};
