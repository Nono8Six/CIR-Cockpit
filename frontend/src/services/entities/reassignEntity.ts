import { ResultAsync } from 'neverthrow';

import {
  dataEntitiesReassignResponseSchema,
  type DataEntitiesReassignResponse
} from 'shared/schemas/api-responses';
import { Entity } from '@/types';
import { createAppError, type AppError } from '@/services/errors/AppError';
import { safeTrpc } from '@/services/api/safeTrpc';

export type ReassignEntityPayload = {
  entity_id: string;
  target_agency_id: string;
};

export type ReassignEntityResponse = {
  entity: Entity;
  propagated_interactions_count: number;
};

const parseReassignEntityResponse = (payload: unknown): ReassignEntityResponse => {
  const parsed = dataEntitiesReassignResponseSchema.safeParse(payload);
  if (!parsed.success) {
    throw createAppError({
      code: 'REQUEST_FAILED',
      message: 'Reponse serveur invalide.',
      source: 'edge',
      details: parsed.error.message
    });
  }
  const response: DataEntitiesReassignResponse = parsed.data;
  return { entity: response.entity, propagated_interactions_count: response.propagated_interactions_count };
};

export const reassignEntity = (
  payload: ReassignEntityPayload
): ResultAsync<ReassignEntityResponse, AppError> =>
  safeTrpc(
    (api, options) => api.data.entities.mutate({
        action: 'reassign',
        entity_id: payload.entity_id,
        target_agency_id: payload.target_agency_id
      }, options),
    parseReassignEntityResponse,
    "Impossible de reassigner l'entite."
  );
