import { ResultAsync } from 'neverthrow';

import { AccountType, Entity } from '@/types';
import { safeApiCall } from '@/lib/result';
import { createAppError, type AppError } from '@/services/errors/AppError';
import { safeInvoke } from '@/services/api/client';
import { isRecord } from '@/utils/recordNarrowing';

export type ConvertClientPayload = {
  id: string;
  client_number: string;
  account_type: AccountType;
};

const parseEntityResponse = (payload: unknown): Entity => {
  if (!isRecord(payload) || !isRecord(payload.entity)) {
    throw createAppError({ code: 'REQUEST_FAILED', message: 'Reponse serveur invalide.', source: 'edge' });
  }
  return payload.entity as Entity;
};

export const convertEntityToClient = (payload: ConvertClientPayload): ResultAsync<Entity, AppError> =>
  safeApiCall(
    safeInvoke('/data/entities', {
      action: 'convert_to_client',
      entity_id: payload.id,
      convert: {
        client_number: payload.client_number,
        account_type: payload.account_type
      }
    }, parseEntityResponse),
    'Impossible de convertir en client.'
  );
