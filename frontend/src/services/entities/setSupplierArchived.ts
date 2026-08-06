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
 * Sets the archived status of a supplier.
 *
 * @param supplierId - The unique identifier of the supplier entity.
 * @param archived - The target archival status (true to archive, false to restore).
 * @returns A ResultAsync containing the updated Entity or an AppError.
 */
export const setSupplierArchived = (supplierId: string, archived: boolean): ResultAsync<Entity, AppError> =>
  safeTrpc(
    (api, options) => api.data.entities.mutate({
        action: 'archive',
        entity_id: supplierId,
        archived
      }, options),
    parseEntityResponse,
    'Impossible de mettre à jour le fournisseur.'
  );
