import { ResultAsync } from 'neverthrow';

import { dataEntitiesResponseSchema } from '../../../../shared/schemas/api-responses';
import { AccountType, Client } from '@/types';
import { createAppError, type AppError } from '@/services/errors/AppError';
import { safeRpc } from '@/services/api/safeRpc';

export type ClientPayload = {
  id?: string;
  client_number?: string | null;
  account_type: AccountType;
  name: string;
  agency_id: string | null;
  address: string;
  postal_code: string;
  department: string;
  city: string;
  siret?: string | null;
  notes?: string | null;
};

const parseEntityResponse = (payload: unknown): Client => {
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

export const saveClient = (payload: ClientPayload): ResultAsync<Client, AppError> =>
  safeRpc(
    (api, init) => api.data.entities.$post({
      json: {
        action: 'save',
        agency_id: payload.agency_id,
        entity_type: 'Client',
        id: payload.id,
        entity: {
          client_number: payload.client_number,
          account_type: payload.account_type,
          name: payload.name,
          address: payload.address,
          postal_code: payload.postal_code,
          department: payload.department,
          city: payload.city,
          siret: payload.siret,
          notes: payload.notes,
          agency_id: payload.agency_id
        }
      }
    }, init),
    parseEntityResponse,
    "Impossible de sauvegarder le client."
  );
