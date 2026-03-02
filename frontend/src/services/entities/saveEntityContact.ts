import { ResultAsync } from 'neverthrow';

import { dataEntityContactsResponseSchema } from 'shared/schemas/api-responses';
import { EntityContact } from '@/types';
import { createAppError, type AppError } from '@/services/errors/AppError';
import { safeRpc } from '@/services/api/safeRpc';

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

const normalizeOptionalField = (value: string | null | undefined): string =>
  value?.trim() ?? '';

const parseContactResponse = (payload: unknown): EntityContact => {
  const parsed = dataEntityContactsResponseSchema.safeParse(payload);
  if (!parsed.success || !('contact' in parsed.data)) {
    throw createAppError({
      code: 'REQUEST_FAILED',
      message: 'Reponse serveur invalide.',
      source: 'edge',
      details: parsed.success ? undefined : parsed.error.message
    });
  }
  return parsed.data.contact;
};

export const saveEntityContact = (payload: EntityContactPayload): ResultAsync<EntityContact, AppError> =>
  safeRpc(
    (api, init) => api.data['entity-contacts'].$post({
      json: {
        action: 'save',
        entity_id: payload.entity_id,
        id: payload.id,
        contact: {
          first_name: payload.first_name.trim(),
          last_name: payload.last_name.trim(),
          email: normalizeOptionalField(payload.email),
          phone: normalizeOptionalField(payload.phone),
          position: normalizeOptionalField(payload.position),
          notes: normalizeOptionalField(payload.notes)
        }
      }
    }, init),
    parseContactResponse,
    "Impossible d'enregistrer le contact."
  );
