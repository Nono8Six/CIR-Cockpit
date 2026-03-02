import type { Interaction } from '@/types';

import {
  resolveActivityTimestamp,
  sortInteractionsByLatestActivity
} from '@/utils/dashboard/dashboardSort';
import { getEndOfDay } from '@/utils/date/getEndOfDay';
import { getStartOfDay } from '@/utils/date/getStartOfDay';

export type DateBounds = {
  start: number;
  end: number;
};

export type DashboardViewMode = 'kanban' | 'list';

type FilterInteractionsByViewModeParams = {
  interactions: Interaction[];
  viewMode: DashboardViewMode;
  dateBounds: DateBounds | null;
  isStatusDone: (interaction: Interaction) => boolean;
};

export const validateCustomDateRange = (startDate: string, endDate: string): string | null => {
  if (!startDate || !endDate) {
    return 'Renseignez une date de debut et de fin.';
  }

  if (startDate > endDate) {
    return 'La date de debut doit preceder la date de fin.';
  }

  return null;
};

export const buildDateBounds = (startDate: string, endDate: string): DateBounds | null => {
  const start = getStartOfDay(startDate).getTime();
  const end = getEndOfDay(endDate).getTime();

  if (Number.isNaN(start) || Number.isNaN(end) || start > end) {
    return null;
  }

  return { start, end };
};

export const isTimestampWithinBounds = (timestamp: number, bounds: DateBounds): boolean =>
  timestamp >= bounds.start && timestamp <= bounds.end;

export const filterInteractionsBySearch = (
  interactions: Interaction[],
  normalizedSearchTerm: string,
  compactSearchTerm: string
): Interaction[] => {
  if (!normalizedSearchTerm) {
    return interactions;
  }

  return interactions.filter((interaction) =>
    interaction.company_name.toLowerCase().includes(normalizedSearchTerm)
    || interaction.contact_name.toLowerCase().includes(normalizedSearchTerm)
    || interaction.subject.toLowerCase().includes(normalizedSearchTerm)
    || Boolean(interaction.order_ref && interaction.order_ref.includes(compactSearchTerm))
    || Boolean(interaction.contact_phone && interaction.contact_phone.includes(compactSearchTerm))
    || Boolean(
      interaction.contact_email
      && interaction.contact_email.toLowerCase().includes(normalizedSearchTerm)
    )
    || interaction.mega_families.some((family) =>
      family.toLowerCase().includes(normalizedSearchTerm)
    )
  );
};

export const filterInteractionsByViewMode = ({
  interactions,
  viewMode,
  dateBounds,
  isStatusDone
}: FilterInteractionsByViewModeParams): Interaction[] => {
  if (!dateBounds) {
    if (viewMode === 'list') {
      return sortInteractionsByLatestActivity(interactions);
    }

    return interactions.filter((interaction) => !isStatusDone(interaction));
  }

  if (viewMode === 'list') {
    return sortInteractionsByLatestActivity(
      interactions.filter((interaction) => {
        const lastActivityAt = resolveActivityTimestamp(interaction);
        return isTimestampWithinBounds(lastActivityAt, dateBounds);
      })
    );
  }

  return interactions.filter((interaction) => {
    const lastActivityAt = resolveActivityTimestamp(interaction);
    return isTimestampWithinBounds(lastActivityAt, dateBounds);
  });
};
