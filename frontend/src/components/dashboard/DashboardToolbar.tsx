import type { RefObject } from 'react';
import type { DashboardViewMode } from '@/utils/dashboard/dashboardFilters';
import type { FilterPeriod } from '@/utils/date/getPresetDateRange';
import DashboardDateFilters from './toolbar/DashboardDateFilters';
import DashboardSearchInput from './toolbar/DashboardSearchInput';

type DashboardToolbarProps = {
  viewMode: DashboardViewMode;
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

// Barre d'outils contextuelle sous les onglets : recherche partout,
// filtres de periode uniquement sur l'Historique (les autres vues sont des stocks).
const DashboardToolbar = ({
  viewMode,
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
    className="flex shrink-0 flex-col gap-2 pt-3 sm:flex-row sm:items-center sm:justify-between"
    data-testid="dashboard-toolbar"
  >
    <div className="w-full sm:max-w-xs">
      <DashboardSearchInput
        ref={searchRef}
        searchTerm={searchTerm}
        onSearchTermChange={onSearchTermChange}
      />
    </div>
    {viewMode === 'list' ? (
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
    ) : null}
  </div>
);

export default DashboardToolbar;
