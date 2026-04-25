import { eq } from 'drizzle-orm';

import { entities, interactions } from '../../../drizzle/schema.ts';
import type { AuthContext, DbClient } from '../types.ts';
import { httpError } from '../middleware/errorHandler.ts';
import {
  extractDbErrorDetails,
  type DeleteEntityPayload,
  type EntityRow
} from './dataEntitiesShared.ts';

export const ensureDeleteSuperAdmin = (authContext: AuthContext): void => {
  if (!authContext.isSuperAdmin) {
    throw httpError(403, 'AUTH_FORBIDDEN', 'Acces interdit.');
  }
};

export const deleteEntity = async (
  db: DbClient,
  payload: DeleteEntityPayload
): Promise<{ entity: EntityRow; deletedInteractionsCount: number }> => {
  let deletedInteractionsCount = 0;

  if (payload.delete_related_interactions === true) {
    try {
      const deletedRows = await db
        .delete(interactions)
        .where(eq(interactions.entity_id, payload.entity_id))
        .returning({ id: interactions.id });
      deletedInteractionsCount = deletedRows.length;
    } catch {
      throw httpError(
        500,
        'DB_WRITE_FAILED',
        "Impossible de supprimer les interactions de l'entite."
      );
    }
  }

  try {
    const rows = await db
      .delete(entities)
      .where(eq(entities.id, payload.entity_id))
      .returning();
    const data = rows[0];
    if (!data) {
      throw httpError(404, 'NOT_FOUND', 'Entite introuvable.');
    }
    return {
      entity: data,
      deletedInteractionsCount
    };
  } catch (error) {
    if (
      typeof error === 'object'
      && error !== null
      && Reflect.get(error, 'code') === 'NOT_FOUND'
    ) {
      throw error;
    }
    throw httpError(
      500,
      'DB_WRITE_FAILED',
      "Impossible de supprimer l'entite.",
      extractDbErrorDetails(error)
    );
  }
};
