import { formatDateInputValue } from './formatDateInputValue';

export const getTodayIsoDate = (): string => formatDateInputValue(new Date());
