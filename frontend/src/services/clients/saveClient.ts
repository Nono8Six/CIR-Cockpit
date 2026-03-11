import { ResultAsync } from 'neverthrow';

import { dataEntitiesResponseSchema } from 'shared/schemas/api-responses';
import type { ClientPrimaryContactFormValues } from 'shared/schemas/client.schema';
import { AccountType, Client } from '@/types';
import { createAppError, type AppError } from '@/services/errors/AppError';
import { safeRpc } from '@/services/api/safeRpc';

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
          client_kind: payload.client_kind,
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
          primary_contact: payload.primary_contact ?? undefined,
          agency_id: payload.agency_id
        }
      }
    }, init),
    parseEntityResponse,
    "Impossible de sauvegarder le client."
  );
