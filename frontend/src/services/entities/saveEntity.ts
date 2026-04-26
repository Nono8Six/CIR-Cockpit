import { ResultAsync } from 'neverthrow';

import { dataEntitiesResponseSchema } from 'shared/schemas/api-responses';
import { AccountType, Entity } from '@/types';
import { createAppError, type AppError } from '@/services/errors/AppError';
import { safeTrpc } from '@/services/api/safeTrpc';

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
  const entityType = resolvePayloadEntityType(payload.entity_type);
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

  if (entityType === 'Client') {
    const entity = {
      ...commonEntity,
      client_number: requireEntityText(payload.client_number, 'Numero client requis.'),
      client_kind: 'company' as const,
      account_type: payload.account_type ?? 'term',
      address: requireEntityText(payload.address, 'Adresse requise.'),
      postal_code: requireEntityText(payload.postal_code, 'Code postal requis.'),
      department: requireEntityText(payload.department, 'Departement requis.'),
      cir_commercial_id: payload.cir_commercial_id
    };

    return safeTrpc(
      (api, options) => api.data.entities.mutate({
          action: 'save',
          agency_id: agencyId,
          entity_type: 'Client',
          id: payload.id,
          entity
        }, options),
      parseEntityResponse,
      "Impossible d'enregistrer l'entite."
    );
  }

  if (entityType === 'Prospect') {
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
