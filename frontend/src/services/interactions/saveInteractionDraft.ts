import { dataInteractionDraftResponseSchema } from 'shared/schemas/api-responses';

import { invokeTrpc } from '@/services/api/safeTrpc';
import { createAppError } from '@/services/errors/AppError';
import { readObject, readString } from '@/utils/recordNarrowing';
import { toJsonValue } from '@/utils/toJsonValue';
import {
  parseInteractionDraftPayload,
  type InteractionDraftPayload,
  type InteractionDraftRecord
} from './interactionDraftPayload';

type SaveInteractionDraftInput = { userId: string; agencyId: string; payload: InteractionDraftPayload; formType?: string };

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

const parseDraftResponse = (payload: unknown): InteractionDraftRecord => {
  const parsed = dataInteractionDraftResponseSchema.safeParse(payload);
  if (!parsed.success) {
    throw createAppError({
      code: 'REQUEST_FAILED',
      message: 'Reponse serveur invalide.',
      source: 'edge',
      details: parsed.error.message
    });
  }

  const draft = parsed.data.draft ? toDraftRecord(parsed.data.draft) : null;
  if (!draft) {
    throw createAppError({
      code: 'DRAFT_SAVE_FAILED',
      message: 'Impossible de sauvegarder le brouillon.',
      source: 'edge'
    });
  }
  return draft;
};

export const saveInteractionDraft = async ({ userId, agencyId, payload, formType = 'interaction' }: SaveInteractionDraftInput): Promise<InteractionDraftRecord> =>
  invokeTrpc(
    (api, options) => api.data.interactions.mutate({
      action: 'draft_save',
      user_id: userId,
      agency_id: agencyId,
      form_type: formType,
      payload: toJsonValue(payload)
    }, options),
    parseDraftResponse,
    'Impossible de sauvegarder le brouillon.'
  );
