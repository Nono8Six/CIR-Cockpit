import { forwardRef, useEffect, useMemo, useState } from 'react';
import { format, isValid, parseISO } from 'date-fns';
import { Calendar as CalendarIcon } from 'lucide-react';
import type { DateRange } from 'react-day-picker';

import { Button } from '../../ui/inputs/basic/Button';
import { Calendar } from '../../ui/inputs/selects/Calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger
} from '../../ui/navigation/Popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '../../ui/inputs/selects/Select';
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
  { value: 'custom', label: 'Période personnalisée' }
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
    return 'Sélectionner une plage (dernière action)';
  }

  if (!range.to) {
    return `Du ${format(range.from, 'dd/MM/yyyy')} au …`;
  }

  return `Du ${format(range.from, 'dd/MM/yyyy')} au ${format(range.to, 'dd/MM/yyyy')}`;
};

type CompleteDateRange = { from: Date; to: Date };

const canApplyRange = (range: DateRange | undefined): range is CompleteDateRange =>
  Boolean(range?.from && range?.to);

const DashboardDateFilters = forwardRef<HTMLButtonElement, DashboardDateFiltersProps>(({
  period,
  onPeriodChange,
  periodErrorMessage,
  effectiveStartDate,
  effectiveEndDate,
  onDateRangeChange,
  onStartDateChange,
  onEndDateChange
}, ref) => {
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

  return (
    <div className="min-w-0 flex-1" data-testid="dashboard-date-filters">
      <div className="grid min-w-0 gap-2 sm:grid-cols-[minmax(9.5rem,12rem)_minmax(14rem,18rem)] sm:items-center lg:max-w-[31rem]">
        <Select
          value={period}
          onValueChange={(value) => {
            if (isFilterPeriod(value)) {
              onPeriodChange(value);
            }
          }}
        >
          <SelectTrigger
            ref={ref}
            data-testid="dashboard-period-select"
            density="dense"
            className="h-8 w-full border-border bg-card px-2.5 text-xs shadow-soft hover:bg-surface-1 focus-visible:border-primary/40 focus-visible:ring-1 focus-visible:ring-primary/40"
            aria-label="Période de filtrage"
          >
            <SelectValue placeholder="Période de filtrage" />
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
              return;
            }
            setPendingRange(undefined);
          }}
        >
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="outline"
              className="h-8 min-w-0 justify-start border-border bg-card px-3 text-left text-xs font-medium text-foreground/90 shadow-soft hover:bg-surface-1 focus-visible:border-primary/40 focus-visible:ring-1 focus-visible:ring-primary/40 focus-visible:ring-offset-0"
              data-testid="dashboard-date-range-trigger"
              aria-label="Selectionner la plage de dates"
              title={`${formatRangeLabel(activeRange)}. Le filtre période s'applique sur la date de dernière action des dossiers.`}
            >
              <CalendarIcon size={14} className="shrink-0 text-muted-foreground" />
              <span className="truncate">{formatRangeLabel(activeRange)}</span>
            </Button>
          </PopoverTrigger>
          <PopoverContent
            className="w-auto border-border p-2"
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
              className="rounded-lg border border-border bg-card"
              classNames={{
                day_selected: 'bg-primary text-white hover:bg-primary focus:bg-primary',
                range_start: 'bg-primary text-white',
                range_end: 'bg-primary text-white',
                range_middle: 'bg-destructive/10 text-primary',
                today: 'border border-ring text-primary'
              }}
            />
            <div className="mt-2 flex items-center justify-between gap-2 border-t border-border pt-2">
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground"
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

        <input
          id="dashboard-start-date"
          name="dashboard-start-date"
          data-testid="dashboard-start-date"
          type="text"
          value={effectiveStartDate}
          onChange={(event) => onStartDateChange(event.target.value)}
          className="sr-only"
          tabIndex={-1}
          aria-hidden="true"
        />
        <input
          id="dashboard-end-date"
          name="dashboard-end-date"
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
          className="mt-2 text-xs font-medium text-destructive"
          role="alert"
          data-testid="dashboard-period-error"
        >
          {periodErrorMessage}
        </p>
      )}
    </div>
  );
});

DashboardDateFilters.displayName = 'DashboardDateFilters';

export default DashboardDateFilters;
