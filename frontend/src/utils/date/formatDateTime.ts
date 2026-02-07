import { formatDate } from './formatDate';
import { formatTime } from './formatTime';

export const formatDateTime = (value: string | Date): string =>
  `${formatDate(value)} ${formatTime(value)}`;
