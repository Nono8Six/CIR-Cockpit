import { dataInteractionDraftResponseSchema } from 'shared/schemas/api-responses';

import { invokeTrpc } from '@/services/api/safeTrpc';
import { createAppError } from '@/services/errors/AppError';
import { readObject, readString } from '@/utils/recordNarrowing';
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

const parseDraftResponse = (payload: unknown): InteractionDraftRecord | null => {
  const parsed = dataInteractionDraftResponseSchema.safeParse(payload);
  if (!parsed.success) {
    throw createAppError({
      code: 'REQUEST_FAILED',
      message: 'Reponse serveur invalide.',
      source: 'edge',
      details: parsed.error.message
    });
  }

  if (!parsed.data.draft) return null;
  const draft = toDraftRecord(parsed.data.draft);
  if (!draft) {
    throw createAppError({
      code: 'DRAFT_NOT_FOUND',
      message: 'Brouillon introuvable.',
      source: 'edge'
    });
  }
  return draft;
};

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
