import { ResultAsync } from 'neverthrow';

import { Client } from '@/types';
import { safeApiCall } from '@/lib/result';
import { createAppError, type AppError } from '@/services/errors/AppError';
import { safeInvoke } from '@/services/api/client';
import { isRecord } from '@/utils/recordNarrowing';

const parseEntityResponse = (payload: unknown): Client => {
  if (!isRecord(payload) || !isRecord(payload.entity)) {
    throw createAppError({ code: 'REQUEST_FAILED', message: 'Reponse serveur invalide.', source: 'edge' });
  }
  return payload.entity as Client;
};

export const setClientArchived = (clientId: string, archived: boolean): ResultAsync<Client, AppError> =>
  safeApiCall(
    safeInvoke('/data/entities', {
      action: 'archive',
      entity_id: clientId,
      archived
    }, parseEntityResponse),
    "Impossible de mettre a jour le client."
  );
