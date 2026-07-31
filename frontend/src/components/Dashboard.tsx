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
import PipelineLostDialog from './dashboard/pipeline/PipelineLostDialog';
import { useDashboardScope } from '@/hooks/dashboard-state/useDashboardScope';
import { useDashboardState } from '@/hooks/dashboard-state/useDashboardState';
import { dashboardSearchStateSchema } from '@/app/dashboardSearch';
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
    scopeFilter,
    setScopeFilter,
    sort,
    toggleSort,
    selectedInteraction,
    setSelectedInteraction,
    kpis,
    evolution,
    showEvolutionChart,
    openDossiersDelta,
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
        const currentIndex = tableRows.findIndex((row) => row.interaction.id === activeInteractionId);
        const nextIndex = event.key === 'ArrowDown'
          ? currentIndex === -1 ? 0 : Math.min(currentIndex + 1, tableRows.length - 1)
          : currentIndex === -1 ? 0 : Math.max(currentIndex - 1, 0);
        setActiveInteractionId(tableRows[nextIndex]?.interaction.id ?? null);
        return;
      }

      if (activeInteractionId && (event.key === 'Enter' || event.key.toLowerCase() === 'o')) {
        event.preventDefault();
        const activeRow = tableRows.find((row) => row.interaction.id === activeInteractionId);
        if (activeRow) {
          setSelectedInteraction(activeRow.interaction);
        }
        return;
      }

      if (activeInteractionId && (event.key === 'Backspace' || event.key === 'Delete')) {
        event.preventDefault();
        const activeRow = tableRows.find((row) => row.interaction.id === activeInteractionId);
        if (activeRow) {
          handleRequestDeleteInteraction(activeRow.interaction);
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

      <div className="flex min-h-0 flex-1 flex-col gap-2.5 pb-3 pt-2.5">
        <DashboardKpiRow
          overdueCount={kpis.overdueCount}
          oldestOverdueDays={kpis.oldestOverdueDays}
          dueTodayCount={kpis.dueTodayCount}
          toPlanCount={kpis.toPlanCount}
          openCount={kpis.openCount}
          openDossiersDelta={openDossiersDelta}
          pipelineOpenAmount={kpis.pipelineOpenAmount}
          pipelineOpenCount={kpis.pipelineOpenCount}
        />

        {showEvolutionChart ? (
          <DashboardEvolutionChart points={evolution} caption={chartCaption} />
        ) : null}

        <DashboardDossiersTable
          rows={tableRows}
          scope={scopeFilter}
          onScopeChange={setScopeFilter}
          channel={channelFilter}
          onChannelChange={setChannelFilter}
          sort={sort}
          onToggleSort={toggleSort}
          getStatusBadgeClass={getStatusBadgeClass}
          onSelectInteraction={handleSelectInteraction}
          onCompleteReminder={(interaction) => {
            void handleCompleteReminder(interaction);
          }}
          onPostponeReminder={(interaction, daysAhead) => {
            void handlePostponeReminder(interaction, daysAhead);
          }}
          isUpdatePending={isInteractionUpdatePending}
          activeInteractionId={displayedActiveInteractionId}
        />
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
