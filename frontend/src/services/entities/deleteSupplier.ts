import { createTrpcResponseParser } from '@/services/api/invokeTrpc';
import { ResultAsync } from 'neverthrow';
import { safeTrpc } from '@/services/api/safeTrpc';
import { type AppError } from '@/services/errors/AppError';
import { dataEntitiesResponseSchema } from '../../../../shared/schemas/system/api-responses';
import { Entity } from '@/types';

const parseEntityResponse = createTrpcResponseParser(
  dataEntitiesResponseSchema,
  (response): Entity => {
  return response.entity;
},
  { code: 'REQUEST_FAILED', message: 'Réponse serveur invalide.' }
);

/**
 * Destructively deletes a supplier.
 *
 * @param supplierId - The unique identifier of the supplier entity.
 * @param deleteRelatedInteractions - Whether interactions linked to the supplier should also be deleted.
 * @returns A ResultAsync containing the deleted Entity or an AppError.
 */
export const deleteSupplier = (
  supplierId: string,
  deleteRelatedInteractions = false
): ResultAsync<Entity, AppError> =>
  safeTrpc(
    (api, options) => api.data.entities.mutate({
        action: 'delete',
        entity_id: supplierId,
        delete_related_interactions: deleteRelatedInteractions
      }, options),
    parseEntityResponse,
    'Impossible de supprimer le fournisseur.'
  );
