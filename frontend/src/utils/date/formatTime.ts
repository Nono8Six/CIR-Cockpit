import { format } from 'date-fns';

import { toDate } from './toDate';

export const formatTime = (value: string | Date): string =>
  format(toDate(value), 'HH:mm');
