import type { RefObject } from 'react';
import type { FilterPeriod } from '@/utils/date/getPresetDateRange';
import DashboardDateFilters from './toolbar/DashboardDateFilters';
import DashboardSearchInput from './toolbar/DashboardSearchInput';
import DashboardViewModeSwitch from './toolbar/DashboardViewModeSwitch';
import { PageToolbar, PageToolbarGroup } from '../app-shell/PageToolbar';

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
  <PageToolbar
    className="mb-3 shrink-0 bg-card/65"
    data-testid="dashboard-toolbar"
  >
    <PageToolbarGroup className="flex-1 flex-col items-stretch lg:flex-row lg:items-center">
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
    </PageToolbarGroup>
    <PageToolbarGroup className="xl:w-[22rem]">
      <DashboardSearchInput
        ref={searchRef}
        searchTerm={searchTerm}
        onSearchTermChange={onSearchTermChange}
      />
    </PageToolbarGroup>
  </PageToolbar>
);

export default DashboardToolbar;
