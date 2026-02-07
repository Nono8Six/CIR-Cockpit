import { isValid, parseISO } from 'date-fns';

export const toDate = (value: string | Date): Date => {
  if (value instanceof Date) return value;
  const parsed = parseISO(value);
  return isValid(parsed) ? parsed : new Date(value);
};
