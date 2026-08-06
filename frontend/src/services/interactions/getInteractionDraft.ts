import { createTrpcResponseParser } from '@/services/api/invokeTrpc';
import { dataInteractionDraftResponseSchema } from '../../../../shared/schemas/system/api-responses';

import { invokeTrpc } from '@/services/api/invokeTrpc';
import { createAppError } from '@/services/errors/AppError';
import { readObject } from '@/utils/recordNarrowing/readObject';
import { readString } from '@/utils/recordNarrowing/readString';
import {
  parseInteractionDraftPayload,
  type InteractionDraftRecord
} from './interactionDraftPayload';

type GetInteractionDraftInput = { userId: string; agencyId: string; formType?: string };

const toDraftRecord = (value: unknown): InteractionDraftRecord | null => {
  const row = readObject({ row: value }, 'row');
  if (!row) return null;
  const id = readString(row, 'id');
  const updatedAt = readString(row, 'updated_at');
  const payload = readObject(row, 'payload');
  if (!id || !updatedAt || !payload) return null;
  const parsedPayload = parseInteractionDraftPayload(payload);
  if (!parsedPayload) return null;
  return { id, updated_at: updatedAt, payload: parsedPayload };
};

const parseDraftResponse = createTrpcResponseParser(
  dataInteractionDraftResponseSchema,
  (response): InteractionDraftRecord | null => {
  if (!response.draft) return null;
  const draft = toDraftRecord(response.draft);
  if (!draft) {
      throw createAppError({
        code: 'DRAFT_NOT_FOUND',
        message: 'Brouillon introuvable.',
        source: 'edge'
      });
    }
  return draft;
},
  { code: 'REQUEST_FAILED', message: 'Réponse serveur invalide.' }
);

export const getInteractionDraft = async ({ userId, agencyId, formType = 'interaction' }: GetInteractionDraftInput): Promise<InteractionDraftRecord | null> =>
  invokeTrpc(
    (api, options) => api.data.interactions.mutate({
      action: 'draft_get',
      user_id: userId,
      agency_id: agencyId,
      form_type: formType
    }, options),
    parseDraftResponse,
    'Impossible de charger le brouillon.'
  );
