import type { Database } from '../../../../shared/supabase.types.ts';
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
type SaveEntityPayload = Extract<DataEntitiesPayload, { action: 'save' }>;
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

export const handleDataEntitiesAction = async (
  db: DbClient,
  authContext: AuthContext,
  requestId: string | undefined,
  data: DataEntitiesPayload
): Promise<Record<string, unknown>> => {
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
    default:
      throw httpError(400, 'ACTION_REQUIRED', 'Action requise.');
  }
};
