import type { Database } from '../../../../shared/supabase.types.ts';
import type { AdminAgenciesPayload } from '../../../../shared/schemas/agency.schema.ts';
import type { DbClient } from '../types.ts';
import { httpError } from '../middleware/errorHandler.ts';
import { checkRateLimit } from './rateLimit.ts';

type AgencyRow = Database['public']['Tables']['agencies']['Row'];
type AgencySummary = Pick<AgencyRow, 'id' | 'name' | 'archived_at'>;

const getAgencyById = async (db: DbClient, agencyId: string): Promise<AgencySummary | null> => {
  const { data, error } = await db
    .from('agencies')
    .select('id, name, archived_at')
    .eq('id', agencyId)
    .maybeSingle();

  if (error) {
    throw httpError(500, 'AGENCY_LOOKUP_FAILED', 'Impossible de charger l\'agence.');
  }

  return data ?? null;
};

const ensureAgencyExists = async (db: DbClient, agencyId: string): Promise<AgencySummary> => {
  const agency = await getAgencyById(db, agencyId);
  if (!agency) {
    throw httpError(404, 'AGENCY_NOT_FOUND', 'Agence introuvable.');
  }
  return agency;
};

export const isAgencyNameConflictError = (error: { code?: string; message: string }): boolean =>
  error.code === '23505' || error.message.includes('agencies_name_unique_idx');

export const handleAgencyNameConflict = (error: { code?: string; message: string }) => {
  if (isAgencyNameConflictError(error)) {
    throw httpError(409, 'AGENCY_NAME_EXISTS', 'Nom d\'agence deja utilise.');
  }
  throw httpError(400, 'AGENCY_UPDATE_FAILED', error.message);
};

const createAgency = async (db: DbClient, name: string): Promise<AgencySummary> => {
  const { data, error } = await db
    .from('agencies')
    .insert({ name })
    .select('id, name, archived_at')
    .single();

  if (error || !data) {
    if (error) handleAgencyNameConflict(error);
    throw httpError(400, 'AGENCY_CREATE_FAILED', 'Impossible de creer l\'agence.');
  }

  return data;
};

const updateAgency = async (
  db: DbClient,
  agencyId: string,
  updates: Partial<Database['public']['Tables']['agencies']['Update']>
): Promise<AgencySummary> => {
  const { data, error } = await db
    .from('agencies')
    .update(updates)
    .eq('id', agencyId)
    .select('id, name, archived_at')
    .single();

  if (error || !data) {
    if (error) handleAgencyNameConflict(error);
    throw httpError(400, 'AGENCY_UPDATE_FAILED', 'Impossible de modifier l\'agence.');
  }

  return data;
};

const hardDeleteAgency = async (db: DbClient, agencyId: string): Promise<void> => {
  const { error } = await db.rpc('hard_delete_agency', { p_agency_id: agencyId });
  if (error) {
    throw httpError(500, 'AGENCY_DELETE_FAILED', 'Impossible de supprimer l\'agence.');
  }
};

export const handleAdminAgenciesAction = async (
  db: DbClient,
  callerId: string,
  requestId: string | undefined,
  data: AdminAgenciesPayload
): Promise<Record<string, unknown>> => {
  const allowed = await checkRateLimit('admin-agencies', callerId);
  if (!allowed) {
    throw httpError(429, 'RATE_LIMITED', 'Trop de requetes.');
  }

  switch (data.action) {
    case 'create': {
      const agency = await createAgency(db, data.name);
      return { request_id: requestId, ok: true, agency };
    }
    case 'rename': {
      const agency = await updateAgency(db, data.agency_id, { name: data.name });
      return { request_id: requestId, ok: true, agency };
    }
    case 'archive': {
      const agency = await updateAgency(db, data.agency_id, { archived_at: new Date().toISOString() });
      return { request_id: requestId, ok: true, agency };
    }
    case 'unarchive': {
      const agency = await updateAgency(db, data.agency_id, { archived_at: null });
      return { request_id: requestId, ok: true, agency };
    }
    case 'hard_delete': {
      await ensureAgencyExists(db, data.agency_id);
      await hardDeleteAgency(db, data.agency_id);
      return { request_id: requestId, ok: true, agency_id: data.agency_id };
    }
    default:
      throw httpError(400, 'ACTION_REQUIRED', 'Action requise.');
  }
};
