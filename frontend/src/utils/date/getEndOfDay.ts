import { endOfDay } from 'date-fns';

import { toDate } from './toDate';

export const getEndOfDay = (value: string | Date): Date =>
  endOfDay(toDate(value));
