import { createTrpcResponseParser } from '@/services/api/invokeTrpc';
import { dataInteractionsMutationResponseSchema } from '../../../../shared/schemas/system/api-responses';
import { Interaction, InteractionUpdate, TimelineEvent } from '@/types';
import { invokeTrpc } from '@/services/api/invokeTrpc';
import { hydrateTimeline } from './hydrateTimeline';

const parseInteractionResponse = createTrpcResponseParser(
  dataInteractionsMutationResponseSchema,
  (response): Interaction => {
  return hydrateTimeline(response.interaction);
},
  { code: 'REQUEST_FAILED', message: 'Réponse serveur invalide.' }
);

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
    "Impossible de mettre à jour l'interaction."
  );
};
