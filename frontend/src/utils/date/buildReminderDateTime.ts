import { addDays, addHours, set } from 'date-fns';

import { formatDateTimeLocalInput } from './formatDateTimeLocalInput';

export type ReminderPreset = '1h' | 'tomorrow' | '3days' | 'nextWeek';

export const buildReminderDateTime = (preset: ReminderPreset): string => {
  const now = new Date();
  let date = new Date(now);

  switch (preset) {
    case '1h':
      date = addHours(now, 1);
      break;
    case 'tomorrow':
      date = set(addDays(now, 1), { hours: 9, minutes: 0, seconds: 0, milliseconds: 0 });
      break;
    case '3days':
      date = set(addDays(now, 3), { hours: 9, minutes: 0, seconds: 0, milliseconds: 0 });
      break;
    case 'nextWeek':
      date = set(addDays(now, 7), { hours: 9, minutes: 0, seconds: 0, milliseconds: 0 });
      break;
    default:
      break;
  }

  return formatDateTimeLocalInput(date);
};
