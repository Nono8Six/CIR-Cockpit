import { ResultAsync } from 'neverthrow';

import { dataEntitiesResponseSchema } from '../../../../shared/schemas/api-responses';
import { AccountType, Entity } from '@/types';
import { createAppError, type AppError } from '@/services/errors/AppError';
import { safeRpc } from '@/services/api/safeRpc';

export type EntityPayload = {
  id?: string;
  entity_type: string;
  name: string;
  agency_id: string | null;
  city?: string | null;
  client_number?: string | null;
  account_type?: AccountType | null;
  address?: string | null;
  postal_code?: string | null;
  department?: string | null;
  siret?: string | null;
  notes?: string | null;
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

export const saveEntity = (payload: EntityPayload): ResultAsync<Entity, AppError> =>
  safeRpc(
    (api, init) => api.data.entities.$post({
      json: {
        action: 'save',
        agency_id: payload.agency_id,
        entity_type: payload.entity_type === 'Client' ? 'Client' : 'Prospect',
        id: payload.id,
        entity: {
          name: payload.name,
          city: payload.city ?? '',
          address: payload.address,
          postal_code: payload.postal_code,
          department: payload.department,
          siret: payload.siret,
          notes: payload.notes,
          agency_id: payload.agency_id,
          ...(payload.entity_type === 'Client' ? {
            client_number: payload.client_number,
            account_type: payload.account_type
          } : {})
        }
      }
    }, init),
    parseEntityResponse,
    "Impossible d'enregistrer l'entite."
  );
