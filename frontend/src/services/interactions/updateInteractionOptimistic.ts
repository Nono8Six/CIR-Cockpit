import { Interaction, InteractionUpdate, TimelineEvent } from '@/types';
import { safeInvoke } from '@/services/api/client';
import { createAppError } from '@/services/errors/AppError';
import { isRecord } from '@/utils/recordNarrowing';
import { hydrateTimeline } from './hydrateTimeline';

const parseInteractionResponse = (payload: unknown): Interaction => {
  if (!isRecord(payload) || !isRecord(payload.interaction)) {
    throw createAppError({ code: 'REQUEST_FAILED', message: 'Reponse serveur invalide.', source: 'edge' });
  }
  return hydrateTimeline(payload.interaction as Interaction);
};

export const updateInteractionOptimistic = async (
  interactionId: string,
  expectedUpdatedAt: string,
  event: TimelineEvent,
  updates?: InteractionUpdate
): Promise<Interaction> => {
  return safeInvoke('/data/interactions', {
    action: 'add_timeline_event',
    interaction_id: interactionId,
    expected_updated_at: expectedUpdatedAt,
    event: {
      type: event.type,
      content: event.content,
      author: event.author,
      date: event.date
    },
    updates
  }, parseInteractionResponse);
};
