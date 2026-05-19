import { ResultAsync } from 'neverthrow';

import { dataEntitiesResponseSchema } from '../../../../shared/schemas/system/api-responses';
import { Entity } from '@/types';
import { createAppError, type AppError } from '@/services/errors/AppError';
import { safeTrpc } from '@/services/api/safeTrpc';

type EntityPayloadBase = {
  id?: string;
  name: string;
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

export type ProspectEntityPayload = EntityPayloadBase & {
  entity_type: 'Prospect';
  agency_id: string | null;
};

export type SupplierEntityPayload = EntityPayloadBase & {
  entity_type: 'Fournisseur';
  supplier_code?: string | null;
  supplier_number?: string | null;
  primary_phone?: string | null;
  primary_email?: string | null;
};

export type EntityPayload = ProspectEntityPayload | SupplierEntityPayload;

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

/**
 * Saves a prospect or supplier entity.
 *
 * @param payload - The entity payload containing entity data.
 * @returns A ResultAsync containing the saved Entity or an AppError.
 */
export const saveEntity = (payload: EntityPayload): ResultAsync<Entity, AppError> => {
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
    notes: optionalEntityText(payload.notes)
  };

  if (payload.entity_type === 'Prospect') {
    const agencyId = requireEntityText(payload.agency_id, 'Agence requise.');

    return safeTrpc(
      (api, options) => api.data.entities.mutate({
          action: 'save',
          agency_id: agencyId,
          entity_type: 'Prospect',
          id: payload.id,
          entity: {
            ...commonEntity,
            agency_id: agencyId
          }
        }, options),
      parseEntityResponse,
      "Impossible d'enregistrer l'entite."
    );
  }

  return safeTrpc(
    (api, options) => api.data.entities.mutate({
        action: 'save',
        entity_type: 'Fournisseur',
        id: payload.id,
        entity: {
          ...commonEntity,
          supplier_code: optionalEntityText(payload.supplier_code),
          supplier_number: optionalEntityText(payload.supplier_number),
          primary_phone: optionalEntityText(payload.primary_phone),
          primary_email: optionalEntityText(payload.primary_email)
        }
      }, options),
    parseEntityResponse,
    "Impossible d'enregistrer l'entite."
  );
};
