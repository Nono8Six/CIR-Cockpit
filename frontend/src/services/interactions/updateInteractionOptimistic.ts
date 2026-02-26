import { dataInteractionsResponseSchema } from '../../../../shared/schemas/api-responses';
import { Interaction, InteractionUpdate, TimelineEvent } from '@/types';
import { invokeRpc } from '@/services/api/safeRpc';
import { createAppError } from '@/services/errors/AppError';
import { hydrateTimeline } from './hydrateTimeline';

const parseInteractionResponse = (payload: unknown): Interaction => {
  const parsed = dataInteractionsResponseSchema.safeParse(payload);
  if (!parsed.success) {
    throw createAppError({
      code: 'REQUEST_FAILED',
      message: 'Reponse serveur invalide.',
      source: 'edge',
      details: parsed.error.message
    });
  }
  return hydrateTimeline(parsed.data.interaction);
};

export const updateInteractionOptimistic = async (
  interactionId: string,
  expectedUpdatedAt: string,
  event: TimelineEvent,
  updates?: InteractionUpdate
): Promise<Interaction> => {
  return invokeRpc(
    (api, init) => api.data.interactions.$post({
      json: {
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
      }
    }, init),
    parseInteractionResponse
  );
};
