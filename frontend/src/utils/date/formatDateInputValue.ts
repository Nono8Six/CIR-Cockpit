import { format } from 'date-fns';

export const formatDateInputValue = (date: Date): string =>
  format(date, 'yyyy-MM-dd');
