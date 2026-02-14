import { useEffect, useMemo, useState } from 'react';
import { format, isValid, parseISO } from 'date-fns';
import { Calendar as CalendarIcon, CircleHelp } from 'lucide-react';
import type { DateRange } from 'react-day-picker';

import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger
} from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from '@/components/ui/tooltip';
import { formatDateInputValue } from '@/utils/date/formatDateInputValue';
import type { FilterPeriod } from '@/utils/date/getPresetDateRange';
import { isFilterPeriod } from '@/utils/typeGuards';

type DashboardDateFiltersProps = {
  period: FilterPeriod;
  onPeriodChange: (period: FilterPeriod) => void;
  periodErrorMessage: string | null;
  effectiveStartDate: string;
  effectiveEndDate: string;
  onDateRangeChange: (startDate: string, endDate: string) => void;
  onStartDateChange: (value: string) => void;
  onEndDateChange: (value: string) => void;
};

const PERIOD_OPTIONS: Array<{ value: FilterPeriod; label: string }> = [
  { value: 'today', label: "Aujourd'hui" },
  { value: 'yesterday', label: 'Hier' },
  { value: 'last7', label: '7 derniers jours' },
  { value: 'thisMonth', label: 'Mois en cours' },
  { value: 'lastMonth', label: 'Mois dernier' },
  { value: 'custom', label: 'Periode personnalisee' }
];

const parseIsoDate = (value: string): Date | undefined => {
  if (!value) {
    return undefined;
  }

  const parsed = parseISO(value);
  return isValid(parsed) ? parsed : undefined;
};

const buildDateRange = (startDate: string, endDate: string): DateRange | undefined => {
  const from = parseIsoDate(startDate);
  const to = parseIsoDate(endDate);

  if (!from || !to) {
    return undefined;
  }

  return { from, to };
};

const formatRangeLabel = (range: DateRange | undefined): string => {
  if (!range?.from) {
    return 'Selectionner une plage de dates (derniere action)';
  }

  if (!range.to) {
    return `Du ${format(range.from, 'dd/MM/yyyy')} au ...`;
  }

  return `Du ${format(range.from, 'dd/MM/yyyy')} au ${format(range.to, 'dd/MM/yyyy')}`;
};

type CompleteDateRange = { from: Date; to: Date };

const canApplyRange = (range: DateRange | undefined): range is CompleteDateRange =>
  Boolean(range?.from && range?.to);

const DashboardDateFilters = ({
  period,
  onPeriodChange,
  periodErrorMessage,
  effectiveStartDate,
  effectiveEndDate,
  onDateRangeChange,
  onStartDateChange,
  onEndDateChange
}: DashboardDateFiltersProps) => {
  const [isDesktop, setIsDesktop] = useState(false);
  const [isRangePopoverOpen, setIsRangePopoverOpen] = useState(false);
  const selectedRange = useMemo(
    () => buildDateRange(effectiveStartDate, effectiveEndDate),
    [effectiveEndDate, effectiveStartDate]
  );
  const [pendingRange, setPendingRange] = useState<DateRange | undefined>(selectedRange);
  const activeRange = isRangePopoverOpen ? pendingRange ?? selectedRange : selectedRange;

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) {
      return;
    }

    const media = window.matchMedia('(min-width: 1024px)');
    const handleChange = () => setIsDesktop(media.matches);

    handleChange();
    media.addEventListener('change', handleChange);
    return () => media.removeEventListener('change', handleChange);
  }, []);

  useEffect(() => {
    if (!isRangePopoverOpen) {
      setPendingRange(selectedRange);
    }
  }, [isRangePopoverOpen, selectedRange]);

  return (
    <div
      className="w-full rounded-md border border-slate-200 bg-slate-50 p-1"
      data-testid="dashboard-date-filters"
    >
      <div className="grid gap-1 sm:grid-cols-[minmax(150px,190px)_minmax(0,1fr)_auto] lg:grid-cols-[minmax(170px,210px)_minmax(0,1fr)_auto] lg:items-center">
        <Select
          value={period}
          onValueChange={(value) => {
            if (isFilterPeriod(value)) {
              onPeriodChange(value);
            }
          }}
        >
          <SelectTrigger
            data-testid="dashboard-period-select"
            density="dense"
            className="h-8 bg-white px-2 text-sm"
            aria-label="Periode de filtrage"
          >
            <SelectValue placeholder="Periode de filtrage" />
          </SelectTrigger>
          <SelectContent>
            {PERIOD_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Popover
          open={isRangePopoverOpen}
          onOpenChange={(open) => {
            setIsRangePopoverOpen(open);
            if (open) {
              setPendingRange(selectedRange);
            }
          }}
        >
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="outline"
              className="h-8 justify-start border-slate-200 bg-white px-2 text-left text-xs font-medium text-slate-700 sm:text-sm"
              data-testid="dashboard-date-range-trigger"
              aria-label="Selectionner la plage de dates"
              title={formatRangeLabel(activeRange)}
            >
              <CalendarIcon size={14} className="shrink-0 text-slate-500" />
              <span className="truncate">{formatRangeLabel(activeRange)}</span>
            </Button>
          </PopoverTrigger>
          <PopoverContent
            className="w-auto border-slate-200 p-2"
            align="start"
            sideOffset={6}
            data-testid="dashboard-date-range-popover"
          >
            <Calendar
              mode="range"
              defaultMonth={pendingRange?.from ?? selectedRange?.from}
              selected={pendingRange ?? selectedRange}
              onSelect={(nextRange) => {
                if (!nextRange?.from) {
                  return;
                }

                setPendingRange(nextRange);
              }}
              numberOfMonths={isDesktop ? 2 : 1}
              className="rounded-lg border border-slate-200 bg-white"
              classNames={{
                day_selected: 'bg-cir-red text-white hover:bg-cir-red focus:bg-cir-red',
                range_start: 'bg-cir-red text-white',
                range_end: 'bg-cir-red text-white',
                range_middle: 'bg-red-50 text-cir-red',
                today: 'border border-cir-red text-cir-red'
              }}
            />
            <div className="mt-2 flex items-center justify-between gap-2 border-t border-slate-200 pt-2">
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="h-8 px-2 text-xs text-slate-600 hover:text-slate-800"
                onClick={() => {
                  setPendingRange(selectedRange);
                  setIsRangePopoverOpen(false);
                }}
                data-testid="dashboard-date-range-cancel"
              >
                Annuler
              </Button>
              <Button
                type="button"
                size="sm"
                className="h-8 px-2 text-xs"
                disabled={!canApplyRange(pendingRange)}
                onClick={() => {
                  if (!canApplyRange(pendingRange)) {
                    return;
                  }

                  const nextStartDate = formatDateInputValue(pendingRange.from);
                  const nextEndDate = formatDateInputValue(pendingRange.to);
                  onDateRangeChange(nextStartDate, nextEndDate);
                  setIsRangePopoverOpen(false);
                }}
                data-testid="dashboard-date-range-apply"
              >
                Appliquer
              </Button>
            </div>
          </PopoverContent>
        </Popover>

        <div className="justify-self-end" data-testid="dashboard-date-range-help">
          <TooltipProvider delayDuration={150}>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  className="inline-flex h-8 items-center justify-center gap-1 rounded-md border border-slate-200 bg-white px-2 text-xs font-medium text-slate-600 transition-colors hover:text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                  aria-label="Aide filtre periode"
                  data-testid="dashboard-date-range-help-trigger"
                >
                  <CircleHelp size={12} />
                  <span className="hidden sm:inline">Aide</span>
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="max-w-[19rem]">
                Selectionnez une plage pour afficher les dossiers dont la derniere action
                est comprise entre ces deux dates. Exemple: du 22/01/2026 au 10/02/2026.
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <span className="sr-only">
            Le filtre periode s applique sur la date de derniere action des dossiers.
          </span>
        </div>

        <input
          data-testid="dashboard-start-date"
          type="text"
          value={effectiveStartDate}
          onChange={(event) => onStartDateChange(event.target.value)}
          className="sr-only"
          tabIndex={-1}
          aria-hidden="true"
        />
        <input
          data-testid="dashboard-end-date"
          type="text"
          value={effectiveEndDate}
          onChange={(event) => onEndDateChange(event.target.value)}
          className="sr-only"
          tabIndex={-1}
          aria-hidden="true"
        />
      </div>
      {periodErrorMessage && (
        <p
          className="mt-2 text-xs font-medium text-red-700"
          role="alert"
          data-testid="dashboard-period-error"
        >
          {periodErrorMessage}
        </p>
      )}
    </div>
  );
};

export default DashboardDateFilters;
