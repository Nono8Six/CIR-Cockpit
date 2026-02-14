import type { Database } from '../../../../shared/supabase.types.ts';
import type { DataEntitiesPayload } from '../../../../shared/schemas/data.schema.ts';
import type { DbClient } from '../types.ts';
import { httpError } from '../middleware/errorHandler.ts';

type EntityRow = Database['public']['Tables']['entities']['Row'];

const saveEntity = async (
  db: DbClient,
  agencyId: string,
  entityType: 'Client' | 'Prospect',
  entityId: string | undefined,
  entity: Record<string, unknown>
): Promise<EntityRow> => {
  const row = {
    entity_type: entityType,
    name: (entity.name as string).trim(),
    agency_id: agencyId,
    address: (entity.address as string | undefined)?.trim() ?? '',
    postal_code: (entity.postal_code as string | undefined)?.trim() ?? '',
    department: (entity.department as string | undefined)?.trim() ?? '',
    city: (entity.city as string).trim(),
    siret: (entity.siret as string | undefined)?.trim() || null,
    notes: (entity.notes as string | undefined)?.trim() || null,
    ...(entityType === 'Client' ? {
      client_number: (entity.client_number as string | undefined)?.trim().replace(/\s+/g, '') || null,
      account_type: entity.account_type as string
    } : {})
  };

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
  accountType: string
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
  callerId: string,
  requestId: string | undefined,
  data: DataEntitiesPayload
): Promise<Record<string, unknown>> => {
  switch (data.action) {
    case 'save': {
      const entity = await saveEntity(
        db,
        data.agency_id,
        data.entity_type,
        data.id,
        data.entity as unknown as Record<string, unknown>
      );
      return { request_id: requestId, ok: true, entity };
    }
    case 'archive': {
      const entity = await archiveEntity(db, data.entity_id, data.archived);
      return { request_id: requestId, ok: true, entity };
    }
    case 'convert_to_client': {
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
