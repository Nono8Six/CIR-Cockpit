import { endOfMonth, startOfMonth, subDays, subMonths } from 'date-fns';

import { formatDateInputValue } from './formatDateInputValue';

export type FilterPeriod = 'today' | 'yesterday' | 'last7' | 'thisMonth' | 'lastMonth' | 'custom';

export const getPresetDateRange = (
  period: FilterPeriod,
  customStart: string,
  customEnd: string
): { startDate: string; endDate: string } => {
  if (period === 'custom') {
    return { startDate: customStart, endDate: customEnd };
  }

  const today = new Date();
  let start = today;
  let end = today;

  switch (period) {
    case 'today':
      break;
    case 'yesterday':
      start = subDays(today, 1);
      end = subDays(today, 1);
      break;
    case 'last7':
      start = subDays(today, 6);
      break;
    case 'thisMonth':
      start = startOfMonth(today);
      break;
    case 'lastMonth':
      {
        const previousMonth = subMonths(today, 1);
        start = startOfMonth(previousMonth);
        end = endOfMonth(previousMonth);
      }
      break;
    default:
      break;
  }

  return {
    startDate: formatDateInputValue(start),
    endDate: formatDateInputValue(end)
  };
};
