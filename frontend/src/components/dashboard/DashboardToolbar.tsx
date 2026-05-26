import type { RefObject } from 'react';
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
  searchRef?: RefObject<HTMLInputElement | null>;
  dateFiltersRef?: RefObject<HTMLButtonElement | null>;
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
  onSearchTermChange,
  searchRef,
  dateFiltersRef
}: DashboardToolbarProps) => (
  <div
    className="mb-3 shrink-0 border-b border-border/70 bg-background/75 pb-3 pt-2"
    data-testid="dashboard-toolbar"
  >
    <div className="flex flex-col gap-2 xl:flex-row xl:items-center xl:justify-between">
      <div className="flex min-w-0 flex-1 flex-col gap-2 lg:flex-row lg:items-center">
        <DashboardViewModeSwitch viewMode={viewMode} onViewModeChange={onViewModeChange} />
        <DashboardDateFilters
          ref={dateFiltersRef}
          period={period}
          onPeriodChange={onPeriodChange}
          periodErrorMessage={periodErrorMessage}
          effectiveStartDate={effectiveStartDate}
          effectiveEndDate={effectiveEndDate}
          onDateRangeChange={onDateRangeChange}
          onStartDateChange={onStartDateChange}
          onEndDateChange={onEndDateChange}
        />
      </div>
      <div className="min-w-0 xl:w-[22rem]">
        <DashboardSearchInput
          ref={searchRef}
          searchTerm={searchTerm}
          onSearchTermChange={onSearchTermChange}
        />
      </div>
    </div>
  </div>
);

export default DashboardToolbar;
