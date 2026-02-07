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
    handleStartDateChange,
    handleEndDateChange,
    handleConvertRequest,
    handleInteractionUpdate
  } = useDashboardState({ interactions, statuses, agencyId, onRequestConvert });

  return (
    <div className="flex flex-col h-full bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden relative">
      <DashboardToolbar
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        period={period}
        onPeriodChange={setPeriod}
        effectiveStartDate={effectiveStartDate}
        effectiveEndDate={effectiveEndDate}
        onStartDateChange={handleStartDateChange}
        onEndDateChange={handleEndDateChange}
        searchTerm={searchTerm}
        onSearchTermChange={setSearchTerm}
      />

      <div className="flex-1 overflow-hidden p-0 relative bg-slate-50">
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

