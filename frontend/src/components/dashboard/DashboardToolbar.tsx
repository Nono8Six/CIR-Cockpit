import type { FilterPeriod } from '@/utils/date/getPresetDateRange';
import { ToolbarRow } from '@/components/ui/toolbar-row';
import DashboardViewModeSwitch from './toolbar/DashboardViewModeSwitch';
import DashboardDateFilters from './toolbar/DashboardDateFilters';
import DashboardSearchInput from './toolbar/DashboardSearchInput';

type ViewMode = 'kanban' | 'list';

type DashboardToolbarProps = {
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  period: FilterPeriod;
  onPeriodChange: (period: FilterPeriod) => void;
  effectiveStartDate: string;
  effectiveEndDate: string;
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
  effectiveStartDate,
  effectiveEndDate,
  onStartDateChange,
  onEndDateChange,
  searchTerm,
  onSearchTermChange
}: DashboardToolbarProps) => (
  <ToolbarRow
    className="bg-white border-b border-slate-200 p-3 xl:flex-nowrap xl:items-center shrink-0"
    density="comfortable"
  >
    <DashboardViewModeSwitch viewMode={viewMode} onViewModeChange={onViewModeChange} />
    <DashboardDateFilters
      period={period}
      onPeriodChange={onPeriodChange}
      effectiveStartDate={effectiveStartDate}
      effectiveEndDate={effectiveEndDate}
      onStartDateChange={onStartDateChange}
      onEndDateChange={onEndDateChange}
    />
    <DashboardSearchInput searchTerm={searchTerm} onSearchTermChange={onSearchTermChange} />
  </ToolbarRow>
);

export default DashboardToolbar;
