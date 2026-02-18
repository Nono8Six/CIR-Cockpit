import { ResultAsync } from 'neverthrow';

import { AccountType, Entity } from '@/types';
import { createAppError, type AppError } from '@/services/errors/AppError';
import { safeRpc } from '@/services/api/safeRpc';
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
  safeRpc(
    (api, init) => api.data.entities.$post({
      json: {
        action: 'convert_to_client',
        entity_id: payload.id,
        convert: {
          client_number: payload.client_number,
          account_type: payload.account_type
        }
      }
    }, init),
    parseEntityResponse,
    'Impossible de convertir en client.'
  );
