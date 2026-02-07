import { startOfDay } from 'date-fns';

import { toDate } from './toDate';

export const getStartOfDay = (value: string | Date): Date =>
  startOfDay(toDate(value));
