import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearch } from '@tanstack/react-router';
import { AgencyStatus, Interaction } from '@/types';
import { ConvertClientEntity } from './ConvertClientDialog';
import ConfirmDialog from './ConfirmDialog';
import DashboardDetailsOverlay from './dashboard/DashboardDetailsOverlay';
import DashboardDetailsActions from './dashboard/overview/DashboardDetailsActions';
import DashboardDossiersTable from './dashboard/overview/DashboardDossiersTable';
import DashboardEvolutionChart from './dashboard/overview/DashboardEvolutionChart';
import DashboardKpiRow from './dashboard/overview/DashboardKpiRow';
import DashboardOverviewHeader from './dashboard/overview/DashboardOverviewHeader';
import DashboardPipelineSummary from './dashboard/overview/DashboardPipelineSummary';
import DashboardPriorityQueue from './dashboard/overview/DashboardPriorityQueue';
import DashboardTopClients from './dashboard/overview/DashboardTopClients';
import PipelineLostDialog from './dashboard/pipeline/PipelineLostDialog';
import { useDashboardScope } from '@/hooks/dashboard-state/useDashboardScope';
import { useDashboardState } from '@/hooks/dashboard-state/useDashboardState';
import { dashboardSearchStateSchema } from '@/app/dashboardSearch';
import { OVERVIEW_PERIODS } from '@/utils/dashboard/dashboardOverview';
import type { AgencyConfig } from '@/services/config';

interface DashboardProps {
  interactions: Interaction[];
  statuses: AgencyStatus[];
  historicalStatuses?: AgencyStatus[];
  agencyId: string | null;
  userId: string | null;
  onRequestConvert: (entity: ConvertClientEntity) => void;
  resolutions?: NonNullable<AgencyConfig['resolutions']>;
}

const Dashboard = ({
  interactions,
  statuses,
  historicalStatuses = [],
  agencyId,
  userId,
  onRequestConvert,
  resolutions = []
}: DashboardProps) => {
  const navigate = useNavigate({ from: '/dashboard' });
  const rawSearch = useSearch({ strict: false });
  const dashboardSearch = dashboardSearchStateSchema.safeParse(rawSearch);
  const requestedInteractionId = dashboardSearch.success ? dashboardSearch.data.interactionId : undefined;
  const displayStatuses = useMemo(
    () => [...statuses, ...historicalStatuses],
    [historicalStatuses, statuses]
  );

  const {
    scope,
    setScope,
    members,
    scopedInteractions,
    scopeLabel,
    viewerMember,
    selectedMember,
    isConsolidated
  } = useDashboardScope({ interactions, agencyId, userId });

  const {
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
    getStatusBadgeClass,
    handleConvertRequest,
    handleInteractionUpdate,
    handleCompleteReminder,
    handlePostponeReminder,
    handleStageChange,
    isInteractionUpdatePending,
    interactionToDelete,
    isDeleteInteractionPending,
    setInteractionToDelete,
    handleRequestDeleteInteraction,
    handleConfirmDeleteInteraction
  } = useDashboardState({
    interactions: scopedInteractions,
    statuses: displayStatuses,
    agencyId,
    onRequestConvert,
    resolutions
  });

  const [activeInteractionId, setActiveInteractionId] = useState<string | null>(null);
  const [interactionToMarkLost, setInteractionToMarkLost] = useState<Interaction | null>(null);

  const searchInputRef = useRef<HTMLInputElement>(null);
  const requestedInteraction = useMemo(
    () => interactions.find((item) => item.id === requestedInteractionId) ?? null,
    [interactions, requestedInteractionId]
  );
  const displayedInteraction = selectedInteraction ?? requestedInteraction;
  const displayedActiveInteractionId = activeInteractionId ?? requestedInteractionId ?? null;
  useEffect(() => {
    if (!requestedInteractionId) return;
    if (requestedInteraction) return;
    void navigate({ search: (previous) => ({ ...previous, interactionId: undefined }), replace: true });
  }, [navigate, requestedInteraction, requestedInteractionId]);

  const handleSelectInteraction = useCallback((interaction: Interaction) => {
    setActiveInteractionId(interaction.id);
    setSelectedInteraction(interaction);
  }, [setSelectedInteraction]);

  const handleConfirmLost = useCallback(
    (interaction: Interaction, lostReason: string) => {
      void handleStageChange(interaction, 'lost', { lostReason }).then(() => {
        setInteractionToMarkLost(null);
      });
    },
    [handleStageChange]
  );

  // Raccourcis : "/" focalise la recherche, fleches + Entree naviguent la table.
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const activeEl = document.activeElement;

      if (
        activeEl instanceof HTMLInputElement ||
        activeEl instanceof HTMLTextAreaElement ||
        (activeEl as HTMLElement)?.isContentEditable ||
        activeEl?.closest('[role="dialog"]') ||
        activeEl?.closest('[role="menu"]')
      ) {
        return;
      }

      if (event.key === '/') {
        event.preventDefault();
        searchInputRef.current?.focus();
        searchInputRef.current?.select();
        return;
      }

      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        if (tableRows.length === 0) return;
        event.preventDefault();
        const currentIndex = tableRows.findIndex((item) => item.id === activeInteractionId);
        const nextIndex = event.key === 'ArrowDown'
          ? currentIndex === -1 ? 0 : Math.min(currentIndex + 1, tableRows.length - 1)
          : currentIndex === -1 ? 0 : Math.max(currentIndex - 1, 0);
        setActiveInteractionId(tableRows[nextIndex]?.id ?? null);
        return;
      }

      if (activeInteractionId && (event.key === 'Enter' || event.key.toLowerCase() === 'o')) {
        event.preventDefault();
        const activeItem = tableRows.find((item) => item.id === activeInteractionId);
        if (activeItem) {
          setSelectedInteraction(activeItem);
        }
        return;
      }

      if (activeInteractionId && (event.key === 'Backspace' || event.key === 'Delete')) {
        event.preventDefault();
        const activeItem = tableRows.find((item) => item.id === activeInteractionId);
        if (activeItem) {
          handleRequestDeleteInteraction(activeItem);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    tableRows,
    activeInteractionId,
    setSelectedInteraction,
    handleRequestDeleteInteraction
  ]);

  const periodLabel =
    OVERVIEW_PERIODS.find((entry) => entry.key === overviewPeriod)?.label ?? '30 j';
  const chartCaption = `${scopeLabel} · 12 dernières semaines`;

  return (
    <div
      className="relative flex h-full min-h-0 flex-col overflow-hidden bg-transparent"
      data-testid="dashboard-root"
    >
      <DashboardOverviewHeader
        scope={scope}
        onScopeChange={setScope}
        members={members}
        viewerMember={viewerMember}
        selectedMember={selectedMember}
        scopeLabel={scopeLabel}
        isConsolidated={isConsolidated}
        period={overviewPeriod}
        onPeriodChange={setOverviewPeriod}
        searchTerm={searchTerm}
        onSearchTermChange={setSearchTerm}
        searchRef={searchInputRef}
      />

      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="flex flex-col gap-3.5 pb-6 pt-3.5">
          <DashboardKpiRow
            overdueCount={kpis.overdueCount}
            oldestOverdueDays={kpis.oldestOverdueDays}
            dueTodayCount={kpis.dueTodayCount}
            toPlanCount={kpis.toPlanCount}
            openCount={kpis.openCount}
            pipelineOpenAmount={kpis.pipelineOpenAmount}
            pipelineOpenCount={kpis.pipelineOpenCount}
            wonCount30d={kpis.wonCount30d}
            lostCount30d={kpis.lostCount30d}
            conversionRate={kpis.conversionRate}
            evolution={evolution}
          />

          <DashboardEvolutionChart points={evolution} caption={chartCaption} />

          <div className="grid items-start gap-3.5 lg:grid-cols-2 xl:grid-cols-[1.15fr_1.3fr_0.95fr]">
            <DashboardPriorityQueue
              view={myDayView}
              toPlanCount={kpis.toPlanCount}
              isUpdatePending={isInteractionUpdatePending}
              onSelectInteraction={handleSelectInteraction}
              onCompleteReminder={(interaction) => {
                void handleCompleteReminder(interaction);
              }}
              onPostponeReminder={(interaction, daysAhead) => {
                void handlePostponeReminder(interaction, daysAhead);
              }}
            />
            <DashboardPipelineSummary board={pipelineBoard} />
            <DashboardTopClients entries={topClients} periodLabel={periodLabel} />
          </div>

          <DashboardDossiersTable
            rows={tableRows}
            totalCount={tableRows.length}
            channel={channelFilter}
            onChannelChange={setChannelFilter}
            getStatusBadgeClass={getStatusBadgeClass}
            onSelectInteraction={handleSelectInteraction}
            activeInteractionId={displayedActiveInteractionId}
          />
        </div>
      </div>

      {displayedInteraction && (
        <DashboardDetailsOverlay
          interaction={displayedInteraction}
          onClose={() => {
            setSelectedInteraction(null);
            void navigate({ search: (previous) => ({ ...previous, interactionId: undefined }), replace: true });
          }}
          onUpdate={handleInteractionUpdate}
          statuses={statuses}
          historicalStatuses={historicalStatuses}
          onRequestConvert={handleConvertRequest}
          onDeleteInteraction={handleRequestDeleteInteraction}
          quickActions={
            <DashboardDetailsActions
              interaction={displayedInteraction}
              isPending={isInteractionUpdatePending}
              onCompleteReminder={(interaction) => {
                void handleCompleteReminder(interaction);
              }}
              onPostponeReminder={(interaction, daysAhead) => {
                void handlePostponeReminder(interaction, daysAhead);
              }}
              onStageChange={(interaction, stage) => {
                void handleStageChange(interaction, stage);
              }}
              onRequestLost={setInteractionToMarkLost}
            />
          }
        />
      )}

      <PipelineLostDialog
        interaction={interactionToMarkLost}
        isSubmitting={isInteractionUpdatePending}
        onConfirm={handleConfirmLost}
        onCancel={() => setInteractionToMarkLost(null)}
      />

      <ConfirmDialog
        open={interactionToDelete !== null}
        onOpenChange={(open) => {
          if (!open && !isDeleteInteractionPending) {
            setInteractionToDelete(null);
          }
        }}
        title="Supprimer cette interaction"
        description={`L'interaction "${interactionToDelete?.subject ?? ''}" sera définitivement supprimée.`}
        confirmLabel={isDeleteInteractionPending ? 'Suppression…' : 'Supprimer'}
        variant="destructive"
        onConfirm={() => {
          void handleConfirmDeleteInteraction();
        }}
      />
    </div>
  );
};

export default memo(Dashboard);
