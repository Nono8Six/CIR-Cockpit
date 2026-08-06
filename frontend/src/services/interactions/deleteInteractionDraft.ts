import { createTrpcResponseParser } from '@/services/api/invokeTrpc';
import { dataInteractionDraftResponseSchema } from '../../../../shared/schemas/system/api-responses';

import { invokeTrpc } from '@/services/api/invokeTrpc';

type DeleteInteractionDraftInput = {
  userId: string;
  agencyId: string;
  formType?: string;
};

const parseDeleteDraftResponse = createTrpcResponseParser(
  dataInteractionDraftResponseSchema,
  (): void => undefined,
  { code: 'REQUEST_FAILED', message: 'Réponse serveur invalide.' }
);

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
