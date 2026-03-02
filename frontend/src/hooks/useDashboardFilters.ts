import { useCallback, useDeferredValue, useMemo, useRef, useState } from 'react';

import type { Interaction } from '@/types';
import {
  buildDateBounds,
  filterInteractionsBySearch,
  filterInteractionsByViewMode,
  validateCustomDateRange,
  type DashboardViewMode
} from '@/utils/dashboard/dashboardFilters';
import { getPresetDateRange, type FilterPeriod } from '@/utils/date/getPresetDateRange';
import { getTodayIsoDate } from '@/utils/date/getTodayIsoDate';

type UseDashboardFiltersParams = {
  interactions: Interaction[];
  viewMode: DashboardViewMode;
  isStatusDone: (interaction: Interaction) => boolean;
};

export const useDashboardFilters = ({
  interactions,
  viewMode,
  isStatusDone
}: UseDashboardFiltersParams) => {
  const today = getTodayIsoDate();
  const [searchTerm, setSearchTerm] = useState('');
  const [period, setPeriod] = useState<FilterPeriod>('today');
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(today);
  const [periodErrorMessage, setPeriodErrorMessage] = useState<string | null>(null);
  const [lastValidCustomRange, setLastValidCustomRange] = useState({
    startDate: today,
    endDate: today
  });

  const startDateRef = useRef(today);
  const endDateRef = useRef(today);
  const deferredSearchTerm = useDeferredValue(searchTerm);
  const normalizedSearchTerm = useMemo(
    () => deferredSearchTerm.trim().toLowerCase(),
    [deferredSearchTerm]
  );
  const compactSearchTerm = useMemo(
    () => normalizedSearchTerm.replace(/\s/g, ''),
    [normalizedSearchTerm]
  );

  const presetDates = useMemo(
    () => getPresetDateRange(period, startDate, endDate),
    [period, startDate, endDate]
  );
  const customRangeError = useMemo(
    () => validateCustomDateRange(startDate, endDate),
    [startDate, endDate]
  );

  const effectiveStartDate =
    period === 'custom'
      ? customRangeError
        ? lastValidCustomRange.startDate
        : startDate
      : presetDates.startDate;
  const effectiveEndDate =
    period === 'custom'
      ? customRangeError
        ? lastValidCustomRange.endDate
        : endDate
      : presetDates.endDate;

  const dateBounds = useMemo(
    () => buildDateBounds(effectiveStartDate, effectiveEndDate),
    [effectiveEndDate, effectiveStartDate]
  );

  const filteredData = useMemo(() => {
    const searchFiltered = filterInteractionsBySearch(
      interactions,
      normalizedSearchTerm,
      compactSearchTerm
    );

    return filterInteractionsByViewMode({
      interactions: searchFiltered,
      viewMode,
      dateBounds,
      isStatusDone
    });
  }, [compactSearchTerm, dateBounds, interactions, isStatusDone, normalizedSearchTerm, viewMode]);

  const setCustomDateRange = useCallback((nextStartDate: string, nextEndDate: string) => {
    startDateRef.current = nextStartDate;
    endDateRef.current = nextEndDate;
    setPeriod('custom');
    setStartDate(nextStartDate);
    setEndDate(nextEndDate);

    const validationMessage = validateCustomDateRange(nextStartDate, nextEndDate);
    if (validationMessage) {
      setPeriodErrorMessage(validationMessage);
      return;
    }

    setPeriodErrorMessage(null);
    setLastValidCustomRange({
      startDate: nextStartDate,
      endDate: nextEndDate
    });
  }, []);

  const handleDateRangeChange = useCallback(
    (nextStartDate: string, nextEndDate: string) => {
      setCustomDateRange(nextStartDate, nextEndDate);
    },
    [setCustomDateRange]
  );

  const handlePeriodChange = useCallback((nextPeriod: FilterPeriod) => {
    setPeriod(nextPeriod);
    if (nextPeriod !== 'custom') {
      setPeriodErrorMessage(null);
    }
  }, []);

  return {
    searchTerm,
    setSearchTerm,
    period,
    setPeriod: handlePeriodChange,
    periodErrorMessage,
    effectiveStartDate,
    effectiveEndDate,
    filteredData,
    handleDateRangeChange,
    handleStartDateChange: (value: string) => setCustomDateRange(value, endDateRef.current),
    handleEndDateChange: (value: string) => setCustomDateRange(startDateRef.current, value)
  };
};
