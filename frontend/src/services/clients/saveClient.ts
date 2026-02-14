import { ResultAsync } from 'neverthrow';

import { AccountType, Client } from '@/types';
import { safeApiCall } from '@/lib/result';
import { createAppError, type AppError } from '@/services/errors/AppError';
import { safeInvoke } from '@/services/api/client';
import { isRecord } from '@/utils/recordNarrowing';

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
  if (!isRecord(payload) || !isRecord(payload.entity)) {
    throw createAppError({ code: 'REQUEST_FAILED', message: 'Reponse serveur invalide.', source: 'edge' });
  }
  return payload.entity as Client;
};

export const saveClient = (payload: ClientPayload): ResultAsync<Client, AppError> =>
  safeApiCall(
    safeInvoke('/data/entities', {
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
    }, parseEntityResponse),
    "Impossible de sauvegarder le client."
  );
