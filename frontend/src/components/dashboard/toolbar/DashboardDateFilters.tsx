import { Filter } from 'lucide-react';

import type { FilterPeriod } from '@/utils/date/getPresetDateRange';
import { isFilterPeriod } from '@/utils/typeGuards';

type DashboardDateFiltersProps = { period: FilterPeriod; onPeriodChange: (period: FilterPeriod) => void; effectiveStartDate: string; effectiveEndDate: string; onStartDateChange: (value: string) => void; onEndDateChange: (value: string) => void };

const DashboardDateFilters = ({ period, onPeriodChange, effectiveStartDate, effectiveEndDate, onStartDateChange, onEndDateChange }: DashboardDateFiltersProps) => {
  return (
    <div className="flex flex-col sm:flex-row items-center gap-2 bg-slate-50 border border-slate-200 rounded-md p-1">
      <div className="flex items-center gap-2 px-2">
        <Filter size={14} className="text-slate-400" />
        <select value={period} onChange={(event) => { if (isFilterPeriod(event.target.value)) onPeriodChange(event.target.value); }} className="bg-transparent text-sm font-medium text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cir-red/30 focus-visible:ring-offset-2 focus-visible:ring-offset-white cursor-pointer" aria-label="Periode de filtrage" name="dashboard-period">
          <option value="today">Aujourd&apos;hui</option><option value="yesterday">Hier</option><option value="last7">7 derniers jours</option><option value="thisMonth">Mois en cours</option><option value="lastMonth">Mois dernier</option><option value="custom">Periode personnalisee</option>
        </select>
      </div>
      <div className="h-4 w-px bg-slate-300 hidden sm:block"></div>
      <div className="flex items-center gap-2">
        <input type="date" value={effectiveStartDate} onChange={(event) => onStartDateChange(event.target.value)} className="bg-white border border-slate-200 rounded px-2 py-1 text-xs text-slate-600 focus:outline-none focus:border-blue-400" aria-label="Date de debut" name="dashboard-start-date" autoComplete="off" />
        <span className="text-slate-400 text-xs">a</span>
        <input type="date" value={effectiveEndDate} onChange={(event) => onEndDateChange(event.target.value)} className="bg-white border border-slate-200 rounded px-2 py-1 text-xs text-slate-600 focus:outline-none focus:border-blue-400" aria-label="Date de fin" name="dashboard-end-date" autoComplete="off" />
      </div>
    </div>
  );
};

export default DashboardDateFilters;
