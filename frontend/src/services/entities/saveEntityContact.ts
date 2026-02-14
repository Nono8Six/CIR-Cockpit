import { ResultAsync } from 'neverthrow';

import { EntityContact } from '@/types';
import { safeApiCall } from '@/lib/result';
import { createAppError, type AppError } from '@/services/errors/AppError';
import { safeInvoke } from '@/services/api/client';
import { isRecord } from '@/utils/recordNarrowing';

export type EntityContactPayload = {
  id?: string;
  entity_id: string;
  first_name: string;
  last_name: string;
  email?: string | null;
  phone?: string | null;
  position?: string | null;
  notes?: string | null;
};

const parseContactResponse = (payload: unknown): EntityContact => {
  if (!isRecord(payload) || !isRecord(payload.contact)) {
    throw createAppError({ code: 'REQUEST_FAILED', message: 'Reponse serveur invalide.', source: 'edge' });
  }
  return payload.contact as EntityContact;
};

export const saveEntityContact = (payload: EntityContactPayload): ResultAsync<EntityContact, AppError> =>
  safeApiCall(
    safeInvoke('/data/entity-contacts', {
      action: 'save',
      entity_id: payload.entity_id,
      id: payload.id,
      contact: {
        first_name: payload.first_name,
        last_name: payload.last_name,
        email: payload.email,
        phone: payload.phone,
        position: payload.position,
        notes: payload.notes
      }
    }, parseContactResponse),
    "Impossible d'enregistrer le contact."
  );
