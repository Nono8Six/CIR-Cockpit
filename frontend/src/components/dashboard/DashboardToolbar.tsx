import type { FilterPeriod } from '@/utils/date/getPresetDateRange';
import DashboardDateFilters from './toolbar/DashboardDateFilters';
import DashboardSearchInput from './toolbar/DashboardSearchInput';
import DashboardViewModeSwitch from './toolbar/DashboardViewModeSwitch';

type ViewMode = 'kanban' | 'list';

type DashboardToolbarProps = {
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  period: FilterPeriod;
  onPeriodChange: (period: FilterPeriod) => void;
  periodErrorMessage: string | null;
  effectiveStartDate: string;
  effectiveEndDate: string;
  onDateRangeChange: (startDate: string, endDate: string) => void;
  onStartDateChange: (value: string) => void;
  onEndDateChange: (value: string) => void;
  searchTerm: string;
  onSearchTermChange: (value: string) => void;
};

const DashboardToolbar = ({
  viewMode,
  onViewModeChange,
  period,
  onPeriodChange,
  periodErrorMessage,
  effectiveStartDate,
  effectiveEndDate,
  onDateRangeChange,
  onStartDateChange,
  onEndDateChange,
  searchTerm,
  onSearchTermChange
}: DashboardToolbarProps) => (
  <div
    className="shrink-0 border-b border-border bg-card p-2 sm:p-3"
    data-testid="dashboard-toolbar"
  >
    <div className="grid gap-2 lg:grid-cols-[auto_minmax(0,1fr)_minmax(16rem,20rem)] lg:items-center">
      <DashboardViewModeSwitch viewMode={viewMode} onViewModeChange={onViewModeChange} />
      <DashboardDateFilters
        period={period}
        onPeriodChange={onPeriodChange}
        periodErrorMessage={periodErrorMessage}
        effectiveStartDate={effectiveStartDate}
        effectiveEndDate={effectiveEndDate}
        onDateRangeChange={onDateRangeChange}
        onStartDateChange={onStartDateChange}
        onEndDateChange={onEndDateChange}
      />
      <div className="min-w-0">
        <DashboardSearchInput
          searchTerm={searchTerm}
          onSearchTermChange={onSearchTermChange}
        />
      </div>
    </div>
  </div>
);

export default DashboardToolbar;
