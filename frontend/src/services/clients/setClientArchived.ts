import { ResultAsync } from 'neverthrow';

import { Client } from '@/types';
import { createAppError, type AppError } from '@/services/errors/AppError';
import { safeRpc } from '@/services/api/safeRpc';
import { isRecord } from '@/utils/recordNarrowing';

const parseEntityResponse = (payload: unknown): Client => {
  if (!isRecord(payload) || !isRecord(payload.entity)) {
    throw createAppError({ code: 'REQUEST_FAILED', message: 'Reponse serveur invalide.', source: 'edge' });
  }
  return payload.entity as Client;
};

export const setClientArchived = (clientId: string, archived: boolean): ResultAsync<Client, AppError> =>
  safeRpc(
    (api, init) => api.data.entities.$post({
      json: {
        action: 'archive',
        entity_id: clientId,
        archived
      }
    }, init),
    parseEntityResponse,
    "Impossible de mettre a jour le client."
  );
