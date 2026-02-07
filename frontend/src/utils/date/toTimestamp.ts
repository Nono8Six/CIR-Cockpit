import { toDate } from './toDate';

export const toTimestamp = (value: string | Date): number =>
  toDate(value).getTime();
