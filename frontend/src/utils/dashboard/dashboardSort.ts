import type { Interaction } from '@/types';
import { toTimestamp } from '@/utils/date/toTimestamp';

const resolveLatestTimelineTimestamp = (interaction: Interaction): number | null => {
  const timelineTimestamps = interaction.timeline
    .map((event) => toTimestamp(event.date))
    .filter((timestamp) => Number.isFinite(timestamp));

  if (timelineTimestamps.length === 0) {
    return null;
  }

  return Math.max(...timelineTimestamps);
};

export const resolveActivityTimestamp = (interaction: Interaction): number => {
  const timelineTimestamp = resolveLatestTimelineTimestamp(interaction);
  if (timelineTimestamp !== null) {
    return timelineTimestamp;
  }

  return toTimestamp(interaction.last_action_at ?? interaction.updated_at ?? interaction.created_at);
};

export const sortInteractionsByLatestActivity = (interactions: Interaction[]): Interaction[] =>
  [...interactions].sort(
    (first, second) => resolveActivityTimestamp(second) - resolveActivityTimestamp(first)
  );
