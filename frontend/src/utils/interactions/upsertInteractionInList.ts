import { Interaction } from '@/types';

export const upsertInteractionInList = (
  list: Interaction[] | undefined,
  interaction: Interaction
): Interaction[] => {
  if (!list || list.length === 0) {
    return [interaction];
  }

  const index = list.findIndex(item => item.id === interaction.id);
  if (index === -1) {
    return [interaction, ...list];
  }

  const next = [...list];
  next[index] = interaction;
  return next;
};
