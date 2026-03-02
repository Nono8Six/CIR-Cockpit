import { memo } from 'react';
import { AgencyStatus, Interaction } from '@/types';
import { ConvertClientEntity } from './ConvertClientDialog';
import DashboardToolbar from './dashboard/DashboardToolbar';
import DashboardKanban from './dashboard/DashboardKanban';
import DashboardList from './dashboard/DashboardList';
import DashboardDetailsOverlay from './dashboard/DashboardDetailsOverlay';
import ConfirmDialog from './ConfirmDialog';
import { useDashboardState } from '@/hooks/useDashboardState';

interface DashboardProps {
  interactions: Interaction[];
  statuses: AgencyStatus[];
  agencyId: string | null;
  onRequestConvert: (entity: ConvertClientEntity) => void;
}

const Dashboard = ({ interactions, statuses, agencyId, onRequestConvert }: DashboardProps) => {
  const {
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
    getChannelIcon,
    setViewMode,
    setSearchTerm,
    setPeriod,
    setSelectedInteraction,
    handleDateRangeChange,
    handleStartDateChange,
    handleEndDateChange,
    handleConvertRequest,
    handleInteractionUpdate,
    interactionToDelete,
    isDeleteInteractionPending,
    setInteractionToDelete,
    handleRequestDeleteInteraction,
    handleConfirmDeleteInteraction
  } = useDashboardState({ interactions, statuses, agencyId, onRequestConvert });

  return (
    <div
      className="relative flex h-full min-h-0 flex-col overflow-hidden rounded-lg border border-border bg-card shadow-sm"
      data-testid="dashboard-root"
    >
      <DashboardToolbar
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        period={period}
        onPeriodChange={setPeriod}
        periodErrorMessage={periodErrorMessage}
        effectiveStartDate={effectiveStartDate}
        effectiveEndDate={effectiveEndDate}
        onDateRangeChange={handleDateRangeChange}
        onStartDateChange={handleStartDateChange}
        onEndDateChange={handleEndDateChange}
        searchTerm={searchTerm}
        onSearchTermChange={setSearchTerm}
      />

      <div className="relative flex-1 min-h-0 bg-surface-1">
        {viewMode === 'kanban' && kanbanColumns && (
          <DashboardKanban
            columns={kanbanColumns}
            onSelectInteraction={setSelectedInteraction}
            getStatusMeta={getStatusMeta}
            onDeleteInteraction={handleRequestDeleteInteraction}
          />
        )}

        {viewMode === 'list' && (
          <DashboardList
            rows={filteredData}
            getChannelIcon={getChannelIcon}
            getStatusBadgeClass={getStatusBadgeClass}
            onSelectInteraction={setSelectedInteraction}
            onDeleteInteraction={handleRequestDeleteInteraction}
          />
        )}
      </div>

      {selectedInteraction && (
        <DashboardDetailsOverlay
          interaction={selectedInteraction}
          onClose={() => setSelectedInteraction(null)}
          onUpdate={handleInteractionUpdate}
          statuses={statuses}
          onRequestConvert={handleConvertRequest}
          onDeleteInteraction={handleRequestDeleteInteraction}
        />
      )}

      <ConfirmDialog
        open={interactionToDelete !== null}
        onOpenChange={(open) => {
          if (!open && !isDeleteInteractionPending) {
            setInteractionToDelete(null);
          }
        }}
        title="Supprimer cette interaction"
        description={`L'interaction "${interactionToDelete?.subject ?? ''}" sera definitivement supprimee.`}
        confirmLabel={isDeleteInteractionPending ? 'Suppression...' : 'Supprimer'}
        variant="destructive"
        onConfirm={() => {
          void handleConfirmDeleteInteraction();
        }}
      />

    </div>
  );
};

export default memo(Dashboard);

