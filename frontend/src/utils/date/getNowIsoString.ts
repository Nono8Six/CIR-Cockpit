import { formatISO } from 'date-fns';

export const getNowIsoString = (): string => formatISO(new Date());
