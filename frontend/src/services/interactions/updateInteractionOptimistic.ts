import { dataInteractionsMutationResponseSchema } from 'shared/schemas/api-responses';
import { Interaction, InteractionUpdate, TimelineEvent } from '@/types';
import { invokeTrpc } from '@/services/api/safeTrpc';
import { createAppError } from '@/services/errors/AppError';
import { hydrateTimeline } from './hydrateTimeline';

const parseInteractionResponse = (payload: unknown): Interaction => {
  const parsed = dataInteractionsMutationResponseSchema.safeParse(payload);
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
  return invokeTrpc(
    (api, options) => api.data.interactions.mutate({
        action: 'add_timeline_event',
        interaction_id: interactionId,
        expected_updated_at: expectedUpdatedAt,
        event: {
          id: event.id,
          type: event.type,
          content: event.content,
          author: event.author,
          date: event.date
        },
        updates
      }, options),
    parseInteractionResponse,
    "Impossible de mettre a jour l'interaction."
  );
};
