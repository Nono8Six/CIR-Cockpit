import { ResultAsync } from 'neverthrow';

import { dataEntitiesResponseSchema } from 'shared/schemas/api-responses';
import type { ClientPrimaryContactFormValues } from 'shared/schemas/client.schema';
import { AccountType, Client } from '@/types';
import { createAppError, type AppError } from '@/services/errors/AppError';
import { safeTrpc } from '@/services/api/safeTrpc';

export type ClientPayload = {
  id?: string;
  client_number?: string | null;
  client_kind: 'company' | 'individual';
  account_type: AccountType;
  name: string;
  agency_id: string | null;
  address: string;
  postal_code: string;
  department: string;
  city: string;
  siret?: string | null;
  siren?: string | null;
  naf_code?: string | null;
  official_name?: string | null;
  official_data_source?: 'api-recherche-entreprises' | null;
  official_data_synced_at?: string | null;
  notes?: string | null;
  cir_commercial_id?: string | null;
  primary_contact?: ClientPrimaryContactFormValues | null;
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

const requireClientText = (value: string | null | undefined, message: string): string => {
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

export const saveClient = (payload: ClientPayload): ResultAsync<Client, AppError> => {
  const agencyId = requireClientText(payload.agency_id, 'Agence requise.');
  const clientNumber = requireClientText(payload.client_number, 'Numero client requis.');

  if (payload.client_kind === 'company') {
    const entity = {
      client_number: clientNumber,
      client_kind: 'company' as const,
      account_type: payload.account_type,
      name: payload.name,
      address: payload.address,
      postal_code: payload.postal_code,
      department: payload.department,
      city: payload.city,
      siret: payload.siret,
      siren: payload.siren,
      naf_code: payload.naf_code,
      official_name: payload.official_name,
      official_data_source: payload.official_data_source,
      official_data_synced_at: payload.official_data_synced_at,
      notes: payload.notes,
      cir_commercial_id: payload.cir_commercial_id,
      agency_id: agencyId
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
      "Impossible de sauvegarder le client."
    );
  }

  const primaryContact = payload.primary_contact;
  if (!primaryContact) {
    throw createAppError({
      code: 'VALIDATION_ERROR',
      message: 'Contact principal requis.',
      source: 'validation'
    });
  }

  const entity = {
    client_number: clientNumber,
    client_kind: 'individual' as const,
    account_type: 'cash' as const,
    name: payload.name,
    address: payload.address,
    postal_code: payload.postal_code,
    department: payload.department,
    city: payload.city,
    siret: payload.siret,
    siren: payload.siren,
    naf_code: payload.naf_code,
    official_name: payload.official_name,
    official_data_source: payload.official_data_source,
    official_data_synced_at: payload.official_data_synced_at,
    notes: payload.notes,
    cir_commercial_id: null,
    primary_contact: primaryContact,
    agency_id: agencyId
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
    "Impossible de sauvegarder le client."
  );
};
