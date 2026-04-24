import { ResultAsync } from 'neverthrow';

import { dataEntitiesResponseSchema } from 'shared/schemas/api-responses';
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
  siren?: string | null;
  naf_code?: string | null;
  official_name?: string | null;
  official_data_source?: 'api-recherche-entreprises' | null;
  official_data_synced_at?: string | null;
  notes?: string | null;
  cir_commercial_id?: string | null;
};

const resolvePayloadEntityType = (entityType: string): 'Client' | 'Prospect' | 'Fournisseur' => {
  if (entityType === 'Client') return 'Client';
  if (entityType === 'Fournisseur') return 'Fournisseur';
  return 'Prospect';
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
        entity_type: resolvePayloadEntityType(payload.entity_type),
        id: payload.id,
        entity: {
          name: payload.name,
          city: payload.city ?? '',
          address: payload.address,
          postal_code: payload.postal_code,
          department: payload.department,
          siret: payload.siret,
          siren: payload.siren,
          naf_code: payload.naf_code,
          official_name: payload.official_name,
          official_data_source: payload.official_data_source,
          official_data_synced_at: payload.official_data_synced_at,
          notes: payload.notes,
          agency_id: payload.agency_id,
          ...(payload.entity_type === 'Client' ? {
            client_number: payload.client_number,
            account_type: payload.account_type,
            cir_commercial_id: payload.cir_commercial_id
          } : {})
        }
      }
    }, init),
    parseEntityResponse,
    "Impossible d'enregistrer l'entite."
  );
