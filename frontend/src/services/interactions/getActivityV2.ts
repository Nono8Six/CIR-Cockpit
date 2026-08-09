import { createTrpcResponseParser, invokeTrpc } from '@/services/api/invokeTrpc';
import {
  activityV2ByLegacyInteractionResponseSchema,
  type ActivityV2,
} from '../../../../shared/schemas/interaction/activity-v2.schema';

const parseResponse = createTrpcResponseParser(
  activityV2ByLegacyInteractionResponseSchema,
  (response): ActivityV2 => response.activity,
  { code: 'REQUEST_FAILED', message: "Réponse d'activité invalide." },
);

export const getActivityV2 = (legacyInteractionId: string): Promise<ActivityV2> =>
  invokeTrpc(
    (api, options) => api.data['activity-v2']['by-legacy-interaction'].query({
      legacy_interaction_id: legacyInteractionId,
    }, options),
    parseResponse,
    "Impossible de charger l'activité.",
  );
