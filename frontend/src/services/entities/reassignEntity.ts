import { ResultAsync } from 'neverthrow';

import {
  dataEntitiesReassignResponseSchema,
  type DataEntitiesReassignResponse
} from '../../../../shared/schemas/api-responses';
import { Entity } from '@/types';
import { createAppError, type AppError } from '@/services/errors/AppError';
import { safeRpc } from '@/services/api/safeRpc';

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
  safeRpc(
    (api, init) => api.data.entities.$post({
      json: {
        action: 'reassign',
        entity_id: payload.entity_id,
        target_agency_id: payload.target_agency_id
      },
    }, init),
    parseReassignEntityResponse,
    "Impossible de reassigner l'entite."
  );
