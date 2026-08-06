import { createTrpcResponseParser } from '@/services/api/invokeTrpc';
import { ResultAsync } from 'neverthrow';

import { dataEntityContactsResponseSchema } from '../../../../shared/schemas/system/api-responses';
import { EntityContact } from '@/types';
import { createAppError, type AppError } from '@/services/errors/AppError';
import { safeTrpc } from '@/services/api/safeTrpc';

export type EntityContactPayload = {
  id?: string;
  entity_id: string;
  first_name: string;
  last_name: string;
  email?: string | null;
  phone?: string | null;
  position?: string | null;
  service_label?: string | null;
  notes?: string | null;
};

const normalizeOptionalField = (value: string | null | undefined): string =>
  value?.trim() ?? '';

const parseContactResponse = createTrpcResponseParser(
  dataEntityContactsResponseSchema,
  (response): EntityContact => {
    if (!('contact' in response)) {
      throw createAppError({
        code: 'REQUEST_FAILED',
        message: 'Réponse serveur invalide.',
        source: 'edge'
      });
    }
    return response.contact;
  },
  { code: 'REQUEST_FAILED', message: 'Réponse serveur invalide.' }
);

export const saveEntityContact = (payload: EntityContactPayload): ResultAsync<EntityContact, AppError> =>
  safeTrpc(
    (api, options) => api.data['entity-contacts'].mutate({
        action: 'save',
        entity_id: payload.entity_id,
        id: payload.id,
        contact: {
          first_name: payload.first_name.trim(),
          last_name: payload.last_name.trim(),
          email: normalizeOptionalField(payload.email),
          phone: normalizeOptionalField(payload.phone),
          position: normalizeOptionalField(payload.position),
          service_label: normalizeOptionalField(payload.service_label),
          notes: normalizeOptionalField(payload.notes)
        }
      }, options),
    parseContactResponse,
    "Impossible d'enregistrer le contact."
  );
