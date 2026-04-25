import { and, eq, ne } from 'drizzle-orm';

import { entities } from '../../../drizzle/schema.ts';
import type { DbClient } from '../types.ts';
import { httpError } from '../middleware/errorHandler.ts';
import {
  type AccountType,
  type EntityRow
} from './dataEntitiesShared.ts';

export const convertToClient = async (
  db: DbClient,
  entityId: string,
  clientNumber: string,
  accountType: AccountType
): Promise<EntityRow> => {
  const trimmedNumber = clientNumber.trim().replace(/\s+/g, '');
  if (!trimmedNumber) throw httpError(400, 'VALIDATION_ERROR', 'Numero client requis.');

  try {
    const rows = await db
      .update(entities)
      .set({
        entity_type: 'Client',
        client_kind: 'company',
        client_number: trimmedNumber,
        account_type: accountType
      })
      .where(and(
        eq(entities.id, entityId),
        ne(entities.entity_type, 'Client')
      ))
      .returning();
    const data = rows[0];
    if (!data) throw httpError(500, 'DB_WRITE_FAILED', 'Impossible de convertir en client.');
    return data;
  } catch (error) {
    if (
      typeof error === 'object'
      && error !== null
      && Reflect.get(error, 'code') === 'DB_WRITE_FAILED'
    ) {
      throw error;
    }
    throw httpError(500, 'DB_WRITE_FAILED', 'Impossible de convertir en client.');
  }
};

export const archiveEntity = async (
  db: DbClient,
  entityId: string,
  archived: boolean
): Promise<EntityRow> => {
  try {
    const rows = await db
      .update(entities)
      .set({ archived_at: archived ? new Date().toISOString() : null })
      .where(eq(entities.id, entityId))
      .returning();
    const data = rows[0];
    if (!data) throw httpError(500, 'DB_WRITE_FAILED', 'Impossible de mettre a jour l\'entite.');
    return data;
  } catch (error) {
    if (
      typeof error === 'object'
      && error !== null
      && Reflect.get(error, 'code') === 'DB_WRITE_FAILED'
    ) {
      throw error;
    }
    throw httpError(500, 'DB_WRITE_FAILED', 'Impossible de mettre a jour l\'entite.');
  }
};
