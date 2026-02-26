import { and, eq, isNull, ne } from 'drizzle-orm';

import { agencies, entities, interactions } from '../../../drizzle/schema.ts';
import type { Database } from '../../../../shared/supabase.types.ts';
import type { DataEntitiesResponse } from '../../../../shared/schemas/api-responses.ts';
import type { DataEntitiesPayload } from '../../../../shared/schemas/data.schema.ts';
import type { AuthContext, DbClient } from '../types.ts';
import { httpError } from '../middleware/errorHandler.ts';
import {
  ensureAgencyAccess,
  ensureDataRateLimit,
  ensureOptionalAgencyAccess,
  getEntityAgencyId
} from './dataAccess.ts';

type EntityRow = Database['public']['Tables']['entities']['Row'];
type EntityInsert = Database['public']['Tables']['entities']['Insert'];
type AgencyLookupRow = Pick<Database['public']['Tables']['agencies']['Row'], 'id' | 'archived_at'>;
type SaveEntityPayload = Extract<DataEntitiesPayload, { action: 'save' }>;
type ReassignEntityPayload = Extract<DataEntitiesPayload, { action: 'reassign' }>;
type AccountType = Database['public']['Enums']['account_type'];

const saveEntity = async (
  db: DbClient,
  payload: SaveEntityPayload,
  agencyId: string
): Promise<EntityRow> => {
  const { entity_type: entityType, id: entityId, entity } = payload;
  const baseRow: EntityInsert = {
    entity_type: entityType,
    name: entity.name.trim(),
    agency_id: agencyId,
    address: entity.address?.trim() ?? '',
    postal_code: entity.postal_code?.trim() ?? '',
    department: entity.department?.trim() ?? '',
    city: entity.city.trim(),
    siret: entity.siret?.trim() || null,
    notes: entity.notes?.trim() || null
  };
  const row: EntityInsert = entityType === 'Client'
    ? {
      ...baseRow,
      client_number: entity.client_number.trim().replace(/\s+/g, ''),
      account_type: entity.account_type
    }
    : baseRow;

  if (entityId) {
    try {
      const rows = await db
        .update(entities)
        .set(row)
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
  }

  try {
    const rows = await db
      .insert(entities)
      .values(row)
      .returning();
    const data = rows[0];
    if (!data) throw httpError(500, 'DB_WRITE_FAILED', 'Impossible de creer l\'entite.');
    return data;
  } catch (error) {
    if (
      typeof error === 'object'
      && error !== null
      && Reflect.get(error, 'code') === 'DB_WRITE_FAILED'
    ) {
      throw error;
    }
    throw httpError(500, 'DB_WRITE_FAILED', 'Impossible de creer l\'entite.');
  }
};

const archiveEntity = async (
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

const convertToClient = async (
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

export const handleDataEntitiesAction = async (
  db: DbClient,
  authContext: AuthContext,
  requestId: string | undefined,
  data: DataEntitiesPayload
): Promise<DataEntitiesResponse> => {
  await ensureDataRateLimit(`data_entities:${data.action}`, authContext.userId);

  switch (data.action) {
    case 'save': {
      const agencyId = ensureAgencyAccess(authContext, data.agency_id);
      const entity = await saveEntity(db, data, agencyId);
      return { request_id: requestId, ok: true, entity };
    }
    case 'archive': {
      const agencyId = await getEntityAgencyId(db, data.entity_id);
      ensureOptionalAgencyAccess(authContext, agencyId);
      const entity = await archiveEntity(db, data.entity_id, data.archived);
      return { request_id: requestId, ok: true, entity };
    }
    case 'convert_to_client': {
      const agencyId = await getEntityAgencyId(db, data.entity_id);
      ensureOptionalAgencyAccess(authContext, agencyId);
      const entity = await convertToClient(
        db,
        data.entity_id,
        data.convert.client_number,
        data.convert.account_type
      );
      return { request_id: requestId, ok: true, entity };
    }
    case 'reassign': {
      ensureReassignSuperAdmin(authContext);
      const { entity, propagatedInteractionsCount } = await reassignEntity(db, data);
      return {
        request_id: requestId,
        ok: true,
        entity,
        propagated_interactions_count: propagatedInteractionsCount
      };
    }
    default:
      throw httpError(400, 'ACTION_REQUIRED', 'Action requise.');
  }
};
