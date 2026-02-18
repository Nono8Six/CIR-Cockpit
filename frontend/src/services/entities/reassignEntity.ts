import { ResultAsync } from 'neverthrow';

import { Entity } from '@/types';
import { createAppError, type AppError } from '@/services/errors/AppError';
import { safeRpc } from '@/services/api/safeRpc';
import { isRecord } from '@/utils/recordNarrowing';

export type ReassignEntityPayload = {
  entity_id: string;
  target_agency_id: string;
};

export type ReassignEntityResponse = {
  entity: Entity;
  propagated_interactions_count: number;
};

const parseReassignEntityResponse = (payload: unknown): ReassignEntityResponse => {
  if (!isRecord(payload) || !isRecord(payload.entity)) {
    throw createAppError({ code: 'REQUEST_FAILED', message: 'Reponse serveur invalide.', source: 'edge' });
  }

  const propagatedCount = Reflect.get(payload, 'propagated_interactions_count');
  if (typeof propagatedCount !== 'number' || !Number.isFinite(propagatedCount)) {
    throw createAppError({ code: 'REQUEST_FAILED', message: 'Reponse serveur invalide.', source: 'edge' });
  }

  return {
    entity: payload.entity as Entity,
    propagated_interactions_count: propagatedCount
  };
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
