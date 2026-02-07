import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

import { toDate } from './toDate';

export const formatDate = (value: string | Date): string =>
  format(toDate(value), 'dd/MM/yyyy', { locale: fr });
