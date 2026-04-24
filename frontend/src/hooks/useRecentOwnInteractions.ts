import { useMemo } from 'react';

import type { Interaction } from '@/types';

export const DEFAULT_RECENT_LIMIT = 5;

const compareByCreatedAtDesc = (a: Interaction, b: Interaction): number => {
  const aTime = Date.parse(a.created_at ?? '') || 0;
  const bTime = Date.parse(b.created_at ?? '') || 0;
  return bTime - aTime;
};

export const useRecentOwnInteractions = (
  interactions: Interaction[],
  userId: string | null,
  limit: number = DEFAULT_RECENT_LIMIT
): Interaction[] =>
  useMemo(() => {
    if (!userId) return [];
    return interactions
      .filter((interaction) => interaction.created_by === userId)
      .slice()
      .sort(compareByCreatedAtDesc)
      .slice(0, limit);
  }, [interactions, userId, limit]);
