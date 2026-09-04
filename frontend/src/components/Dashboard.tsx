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
import { useDashboardKeyboardShortcuts } from '@/hooks/dashboard-state/useDashboardKeyboardShortcuts';
import { dashboardSearchStateSchema } from '@/app/dashboardSearch';
import type { AgencyConfig } from '@/services/config';

interface DashboardProps {
  isActive: boolean;
  interactions: Interaction[];
  statuses: AgencyStatus[];
  historicalStatuses?: AgencyStatus[];
  agencyId: string | null;
  userId: string | null;
  onRequestConvert: (entity: ConvertClientEntity) => void;
  resolutions?: NonNullable<AgencyConfig['resolutions']>;
}

const Dashboard = ({
  isActive,
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
  useDashboardKeyboardShortcuts({
    isActive,
    searchInputRef,
    tableRows,
    activeInteractionId,
    setActiveInteractionId,
    onOpenInteraction: setSelectedInteraction,
    onRequestDeleteInteraction: handleRequestDeleteInteraction
  });

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
        title="Archiver cette activité"
        description={`L'activité "${interactionToDelete?.subject ?? ''}" restera consultable dans l'historique de compatibilité.`}
        confirmLabel={isDeleteInteractionPending ? 'Archivage…' : 'Archiver'}
        variant="destructive"
        onConfirm={() => {
          void handleConfirmDeleteInteraction();
        }}
      />
    </div>
  );
};

export default memo(Dashboard);
