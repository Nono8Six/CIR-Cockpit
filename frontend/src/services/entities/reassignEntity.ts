import { createTrpcResponseParser } from '@/services/api/invokeTrpc';
import { ResultAsync } from 'neverthrow';

import {
  dataEntitiesReassignResponseSchema,
  type DataEntitiesReassignResponse
} from '../../../../shared/schemas/system/api-responses';
import { Entity } from '@/types';
import { type AppError } from '@/services/errors/AppError';
import { safeTrpc } from '@/services/api/safeTrpc';

export type ReassignEntityPayload = {
  entity_id: string;
  target_agency_id: string;
};

export type ReassignEntityResponse = {
  entity: Entity;
  propagated_interactions_count: number;
};

const parseReassignEntityResponse = createTrpcResponseParser(
  dataEntitiesReassignResponseSchema,
  (response): ReassignEntityResponse => {
    const reassignResponse: DataEntitiesReassignResponse = response;
    return {
      entity: reassignResponse.entity,
      propagated_interactions_count: reassignResponse.propagated_interactions_count
    };
  },
  { code: 'REQUEST_FAILED', message: 'Réponse serveur invalide.' }
);

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
    "Impossible de réassigner l'entité."
  );
