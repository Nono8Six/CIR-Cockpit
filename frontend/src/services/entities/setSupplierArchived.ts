import { ResultAsync } from 'neverthrow';
import { safeTrpc } from '@/services/api/safeTrpc';
import { createAppError, type AppError } from '@/services/errors/AppError';
import { dataEntitiesResponseSchema } from '../../../../shared/schemas/system/api-responses';
import { Entity } from '@/types';

const parseEntityResponse = (payload: unknown): Entity => {
  const parsed = dataEntitiesResponseSchema.safeParse(payload);
  if (!parsed.success) {
    throw createAppError({
      code: 'REQUEST_FAILED',
      message: 'Reponse serveur invalide.',
      source: 'edge',
      details: parsed.error.message
    });
  }
  return parsed.data.entity;
};

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
    'Impossible de mettre a jour le fournisseur.'
  );
