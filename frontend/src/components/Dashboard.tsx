import { AgencyStatus, Interaction } from '@/types';
import { ConvertClientEntity } from './ConvertClientDialog';
import DashboardToolbar from './dashboard/DashboardToolbar';
import DashboardKanban from './dashboard/DashboardKanban';
import DashboardList from './dashboard/DashboardList';
import DashboardDetailsOverlay from './dashboard/DashboardDetailsOverlay';
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
    handleInteractionUpdate
  } = useDashboardState({ interactions, statuses, agencyId, onRequestConvert });

  return (
    <div
      className="relative flex h-full min-h-0 flex-col overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm"
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

      <div className="relative flex-1 min-h-0 bg-slate-50">
        {viewMode === 'kanban' && kanbanColumns && (
          <DashboardKanban
            columns={kanbanColumns}
            onSelectInteraction={setSelectedInteraction}
            getStatusMeta={getStatusMeta}
          />
        )}

        {viewMode === 'list' && (
          <DashboardList
            rows={filteredData}
            getChannelIcon={getChannelIcon}
            getStatusBadgeClass={getStatusBadgeClass}
            onSelectInteraction={setSelectedInteraction}
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
        />
      )}

    </div>
  );
};

export default Dashboard;

