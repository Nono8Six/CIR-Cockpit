import { ResultAsync } from 'neverthrow';

import { dataEntitiesResponseSchema } from 'shared/schemas/api-responses';
import { Entity } from '@/types';
import { createAppError, type AppError } from '@/services/errors/AppError';
import { safeTrpc } from '@/services/api/safeTrpc';

export type EntityPayloadType = 'Prospect' | 'Fournisseur';

export type EntityPayload = {
  id?: string;
  entity_type: EntityPayloadType;
  name: string;
  agency_id: string | null;
  city?: string | null;
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

const requireEntityText = (value: string | null | undefined, message: string): string => {
  const trimmed = value?.trim() ?? '';
  if (!trimmed) {
    throw createAppError({
      code: 'VALIDATION_ERROR',
      message,
      source: 'validation'
    });
  }
  return trimmed;
};

const optionalEntityText = (value: string | null | undefined): string | undefined =>
  value ?? undefined;

export const saveEntity = (payload: EntityPayload): ResultAsync<Entity, AppError> => {
  const agencyId = requireEntityText(payload.agency_id, 'Agence requise.');
  const commonEntity = {
    name: payload.name,
    city: payload.city ?? '',
    address: optionalEntityText(payload.address),
    postal_code: optionalEntityText(payload.postal_code),
    department: optionalEntityText(payload.department),
    siret: payload.siret,
    siren: payload.siren,
    naf_code: payload.naf_code,
    official_name: payload.official_name,
    official_data_source: payload.official_data_source,
    official_data_synced_at: payload.official_data_synced_at,
    notes: optionalEntityText(payload.notes),
    agency_id: agencyId
  };

  if (payload.entity_type === 'Prospect') {
    return safeTrpc(
      (api, options) => api.data.entities.mutate({
          action: 'save',
          agency_id: agencyId,
          entity_type: 'Prospect',
          id: payload.id,
          entity: commonEntity
        }, options),
      parseEntityResponse,
      "Impossible d'enregistrer l'entite."
    );
  }

  return safeTrpc(
    (api, options) => api.data.entities.mutate({
        action: 'save',
        agency_id: agencyId,
        entity_type: 'Fournisseur',
        id: payload.id,
        entity: commonEntity
      }, options),
    parseEntityResponse,
    "Impossible d'enregistrer l'entite."
  );
};
