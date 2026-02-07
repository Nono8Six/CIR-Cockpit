import { isBefore } from 'date-fns';

import { toDate } from './toDate';

export const isBeforeNow = (value: string): boolean =>
  isBefore(toDate(value), new Date());
