import { Interaction, InteractionUpdate, TimelineEvent } from '@/types';
import { getCurrentUserLabel } from '@/services/auth/getCurrentUserLabel';
import { updateInteractionOptimistic } from './updateInteractionOptimistic';

export const addTimelineEvent = async (
  interaction: Interaction,
  event: TimelineEvent,
  updates?: InteractionUpdate
): Promise<Interaction> => {
  const userLabel = await getCurrentUserLabel();
  const enrichedEvent = {
    ...event,
    author: event.author?.trim() || userLabel || undefined
  };
  const updatedInteraction: InteractionUpdate = {
    ...updates,
    timeline: [...interaction.timeline, enrichedEvent]
  };

  return updateInteractionOptimistic(interaction.id, interaction.updated_at, updatedInteraction);
};
