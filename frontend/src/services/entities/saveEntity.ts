import { ResultAsync } from 'neverthrow';

import { AccountType, Entity } from '@/types';
import { safeApiCall } from '@/lib/result';
import { createAppError, type AppError } from '@/services/errors/AppError';
import { safeInvoke } from '@/services/api/client';
import { isRecord } from '@/utils/recordNarrowing';

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
  if (!isRecord(payload) || !isRecord(payload.entity)) {
    throw createAppError({ code: 'REQUEST_FAILED', message: 'Reponse serveur invalide.', source: 'edge' });
  }
  return payload.entity as Entity;
};

export const saveEntity = (payload: EntityPayload): ResultAsync<Entity, AppError> =>
  safeApiCall(
    safeInvoke('/data/entities', {
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
    }, parseEntityResponse),
    "Impossible d'enregistrer l'entite."
  );
