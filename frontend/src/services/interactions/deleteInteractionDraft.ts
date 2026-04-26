import { dataInteractionDraftResponseSchema } from 'shared/schemas/api-responses';

import { invokeTrpc } from '@/services/api/safeTrpc';
import { createAppError } from '@/services/errors/AppError';

type DeleteInteractionDraftInput = {
  userId: string;
  agencyId: string;
  formType?: string;
};

const parseDeleteDraftResponse = (payload: unknown): void => {
  const parsed = dataInteractionDraftResponseSchema.safeParse(payload);
  if (!parsed.success) {
    throw createAppError({
      code: 'REQUEST_FAILED',
      message: 'Reponse serveur invalide.',
      source: 'edge',
      details: parsed.error.message
    });
  }
};

export const deleteInteractionDraft = async ({
  userId,
  agencyId,
  formType = 'interaction'
}: DeleteInteractionDraftInput): Promise<void> =>
  invokeTrpc(
    (api, options) => api.data.interactions.mutate({
      action: 'draft_delete',
      user_id: userId,
      agency_id: agencyId,
      form_type: formType
    }, options),
    parseDeleteDraftResponse,
    'Impossible de supprimer le brouillon.'
  );
