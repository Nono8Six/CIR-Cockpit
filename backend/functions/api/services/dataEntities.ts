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
    const { data, error } = await db
      .from('entities')
      .update(row)
      .eq('id', entityId)
      .select('*')
      .single();
    if (error || !data) throw httpError(500, 'DB_WRITE_FAILED', 'Impossible de mettre a jour l\'entite.');
    return data;
  }

  const { data, error } = await db
    .from('entities')
    .insert(row)
    .select('*')
    .single();
  if (error || !data) throw httpError(500, 'DB_WRITE_FAILED', 'Impossible de creer l\'entite.');
  return data;
};

const archiveEntity = async (
  db: DbClient,
  entityId: string,
  archived: boolean
): Promise<EntityRow> => {
  const { data, error } = await db
    .from('entities')
    .update({ archived_at: archived ? new Date().toISOString() : null })
    .eq('id', entityId)
    .select('*')
    .single();
  if (error || !data) throw httpError(500, 'DB_WRITE_FAILED', 'Impossible de mettre a jour l\'entite.');
  return data;
};

const convertToClient = async (
  db: DbClient,
  entityId: string,
  clientNumber: string,
  accountType: AccountType
): Promise<EntityRow> => {
  const trimmedNumber = clientNumber.trim().replace(/\s+/g, '');
  if (!trimmedNumber) throw httpError(400, 'VALIDATION_ERROR', 'Numero client requis.');

  const { data, error } = await db
    .from('entities')
    .update({
      entity_type: 'Client',
      client_number: trimmedNumber,
      account_type: accountType
    })
    .eq('id', entityId)
    .neq('entity_type', 'Client')
    .select('*')
    .single();
  if (error || !data) throw httpError(500, 'DB_WRITE_FAILED', 'Impossible de convertir en client.');
  return data;
};

export const ensureReassignSuperAdmin = (authContext: AuthContext): void => {
  if (!authContext.isSuperAdmin) {
    throw httpError(403, 'AUTH_FORBIDDEN', 'Acces interdit.');
  }
};

const ensureTargetAgencyIsActive = async (db: DbClient, targetAgencyId: string): Promise<void> => {
  const { data, error } = await db
    .from('agencies')
    .select('id, archived_at')
    .eq('id', targetAgencyId)
    .maybeSingle<AgencyLookupRow>();

  if (error) {
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
  const { data, error } = await db
    .from('entities')
    .select('id')
    .eq('id', entityId)
    .maybeSingle<{ id: string }>();

  if (error) {
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

  const { data: entity, error: entityError } = await db
    .from('entities')
    .update({ agency_id: payload.target_agency_id })
    .eq('id', payload.entity_id)
    .is('agency_id', null)
    .select('*')
    .maybeSingle<EntityRow>();

  if (entityError) {
    throw httpError(500, 'DB_WRITE_FAILED', "Impossible de reassigner l'entite.");
  }
  if (!entity) {
    await ensureEntityExists(db, payload.entity_id);
    throw httpError(400, 'VALIDATION_ERROR', "Seules les entites orphelines peuvent etre reattribuees.");
  }

  const { data: propagatedRows, error: propagationError } = await db
    .from('interactions')
    .update({ agency_id: payload.target_agency_id })
    .eq('entity_id', payload.entity_id)
    .is('agency_id', null)
    .select('id');

  if (propagationError) {
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
