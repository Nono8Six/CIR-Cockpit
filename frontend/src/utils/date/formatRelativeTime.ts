import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

import { toDate } from './toDate';

export const formatRelativeTime = (value: string | Date): string =>
  formatDistanceToNow(toDate(value), { locale: fr, addSuffix: true });
