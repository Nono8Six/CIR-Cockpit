import { format } from 'date-fns';

export const formatDateTimeLocalInput = (date: Date): string =>
  format(date, "yyyy-MM-dd'T'HH:mm");
