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
 * Destructively deletes a supplier.
 *
 * @param supplierId - The unique identifier of the supplier entity.
 * @returns A ResultAsync containing the deleted Entity or an AppError.
 */
export const deleteSupplier = (supplierId: string): ResultAsync<Entity, AppError> =>
  safeTrpc(
    (api, options) => api.data.entities.mutate({
        action: 'delete',
        entity_id: supplierId,
        delete_related_interactions: false
      }, options),
    parseEntityResponse,
    'Impossible de supprimer le fournisseur.'
  );
