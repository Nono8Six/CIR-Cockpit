import { createTrpcResponseParser, invokeTrpc } from '@/services/api/invokeTrpc';
import {
  activityV2ByLegacyInteractionResponseSchema,
  type ActivityV2,
  type ActivityV2CorrectionInput,
} from '../../../../shared/schemas/interaction/activity-v2.schema';

const parseResponse = createTrpcResponseParser(
  activityV2ByLegacyInteractionResponseSchema,
  (response): ActivityV2 => response.activity,
  { code: 'REQUEST_FAILED', message: "Réponse de correction invalide." },
);

export const correctActivityV2 = (input: ActivityV2CorrectionInput): Promise<ActivityV2> =>
  invokeTrpc(
    (api, options) => api.data['activity-v2'].correct.mutate(input, options),
    parseResponse,
    "Impossible de corriger l'activité.",
  );
