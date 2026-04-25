import { and, eq, isNull } from 'drizzle-orm';

import { agencies, entities, interactions } from '../../../drizzle/schema.ts';
import type { AuthContext, DbClient } from '../types.ts';
import { httpError } from '../middleware/errorHandler.ts';
import {
  type AgencyLookupRow,
  type EntityRow,
  type ReassignEntityPayload
} from './dataEntitiesShared.ts';

export const ensureReassignSuperAdmin = (authContext: AuthContext): void => {
  if (!authContext.isSuperAdmin) {
    throw httpError(403, 'AUTH_FORBIDDEN', 'Acces interdit.');
  }
};

const ensureTargetAgencyIsActive = async (db: DbClient, targetAgencyId: string): Promise<void> => {
  let data: AgencyLookupRow | undefined;
  try {
    const rows = await db
      .select({
        id: agencies.id,
        archived_at: agencies.archived_at
      })
      .from(agencies)
      .where(eq(agencies.id, targetAgencyId))
      .limit(1);
    data = rows[0];
  } catch {
    throw httpError(500, 'DB_READ_FAILED', "Impossible de verifier l'agence cible.");
  }
  if (!data) {
    throw httpError(404, 'NOT_FOUND', 'Agence cible introuvable.');
  }
  if (data.archived_at) {
    throw httpError(400, 'VALIDATION_ERROR', 'Agence cible archivee.');
  }
};

const ensureEntityExists = async (db: DbClient, entityId: string): Promise<void> => {
  let data: { id: string } | undefined;
  try {
    const rows = await db
      .select({ id: entities.id })
      .from(entities)
      .where(eq(entities.id, entityId))
      .limit(1);
    data = rows[0];
  } catch {
    throw httpError(500, 'DB_READ_FAILED', "Impossible de verifier l'entite.");
  }
  if (!data) {
    throw httpError(404, 'NOT_FOUND', 'Entite introuvable.');
  }
};

export const reassignEntity = async (
  db: DbClient,
  payload: ReassignEntityPayload
): Promise<{ entity: EntityRow; propagatedInteractionsCount: number }> => {
  await ensureTargetAgencyIsActive(db, payload.target_agency_id);

  let entity: EntityRow | undefined;
  try {
    const rows = await db
      .update(entities)
      .set({ agency_id: payload.target_agency_id })
      .where(and(
        eq(entities.id, payload.entity_id),
        isNull(entities.agency_id)
      ))
      .returning();
    entity = rows[0];
  } catch {
    throw httpError(500, 'DB_WRITE_FAILED', "Impossible de reassigner l'entite.");
  }
  if (!entity) {
    await ensureEntityExists(db, payload.entity_id);
    throw httpError(400, 'VALIDATION_ERROR', "Seules les entites orphelines peuvent etre reattribuees.");
  }

  let propagatedRows: Array<{ id: string }> = [];
  try {
    propagatedRows = await db
      .update(interactions)
      .set({ agency_id: payload.target_agency_id })
      .where(and(
        eq(interactions.entity_id, payload.entity_id),
        isNull(interactions.agency_id)
      ))
      .returning({ id: interactions.id });
  } catch {
    throw httpError(500, 'DB_WRITE_FAILED', "Impossible de propager l'agence aux interactions.");
  }

  return {
    entity,
    propagatedInteractionsCount: propagatedRows?.length ?? 0
  };
};
