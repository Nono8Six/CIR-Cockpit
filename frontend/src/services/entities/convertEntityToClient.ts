import { ResultAsync } from 'neverthrow';

import { dataEntitiesResponseSchema } from 'shared/schemas/api-responses';
import { AccountType, Entity } from '@/types';
import { createAppError, type AppError } from '@/services/errors/AppError';
import { safeTrpc } from '@/services/api/safeTrpc';

export type ConvertClientPayload = {
  id: string;
  client_number: string;
  account_type: AccountType;
};

const parseEntityResponse = (payload: unknown): Entity => {
  const parsed = dataEntitiesResponseSchema.safeParse(payload);
  if (!parsed.success) {
    throw createAppError({
      code: 'REQUEST_FAILED',
      message: 'Reponse serveur invalide.',
      source: 'edge',
      details: parsed.error.message
    });
  }
  return parsed.data.entity;
};

export const convertEntityToClient = (payload: ConvertClientPayload): ResultAsync<Entity, AppError> =>
  safeTrpc(
    (api, options) => api.data.entities.mutate({
        action: 'convert_to_client',
        entity_id: payload.id,
        convert: {
          client_number: payload.client_number,
          account_type: payload.account_type
        }
      }, options),
    parseEntityResponse,
    'Impossible de convertir en client.'
  );
