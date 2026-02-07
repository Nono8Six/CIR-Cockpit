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
    throw httpError(500, 'AGENCY_LOOKUP_FAILED', 'Failed to lookup agency');
  }

  return data ?? null;
};

const ensureAgencyExists = async (db: DbClient, agencyId: string): Promise<AgencySummary> => {
  const agency = await getAgencyById(db, agencyId);
  if (!agency) {
    throw httpError(404, 'AGENCY_NOT_FOUND', 'Agency not found');
  }
  return agency;
};

const handleAgencyNameConflict = (error: { code?: string; message: string }) => {
  if (error.code === '23505' || error.message.includes('agencies_name_unique_idx')) {
    throw httpError(409, 'AGENCY_NAME_EXISTS', 'Agency name already exists');
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
    throw httpError(400, 'AGENCY_CREATE_FAILED', 'Failed to create agency');
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
    throw httpError(400, 'AGENCY_UPDATE_FAILED', 'Failed to update agency');
  }

  return data;
};

const deleteAgency = async (db: DbClient, agencyId: string): Promise<void> => {
  const { error } = await db
    .from('agencies')
    .delete()
    .eq('id', agencyId);

  if (error) {
    throw httpError(400, 'AGENCY_DELETE_FAILED', error.message);
  }
};

const clearAgencyReferences = async (db: DbClient, agencyId: string): Promise<void> => {
  const { error: profileError } = await db
    .from('profiles')
    .update({ active_agency_id: null })
    .eq('active_agency_id', agencyId);

  if (profileError) {
    throw httpError(500, 'PROFILE_UPDATE_FAILED', profileError.message);
  }

  const { error: entityError } = await db
    .from('entities')
    .update({ agency_id: null })
    .eq('agency_id', agencyId);

  if (entityError) {
    throw httpError(500, 'ENTITY_DETACH_FAILED', entityError.message);
  }
};

const deleteAgencyDependencies = async (db: DbClient, agencyId: string): Promise<void> => {
  const { error: membersError } = await db
    .from('agency_members')
    .delete()
    .eq('agency_id', agencyId);

  if (membersError) {
    throw httpError(500, 'MEMBERSHIP_DELETE_FAILED', membersError.message);
  }

  const deleteFromTable = async (
    table: 'agency_statuses' | 'agency_services' | 'agency_entities' | 'agency_families'
  ) => {
    const { error } = await db
      .from(table)
      .delete()
      .eq('agency_id', agencyId);

    if (error) {
      throw httpError(500, 'AGENCY_DELETE_FAILED', error.message);
    }
  };

  await deleteFromTable('agency_statuses');
  await deleteFromTable('agency_services');
  await deleteFromTable('agency_entities');
  await deleteFromTable('agency_families');
};

export const handleAdminAgenciesAction = async (
  db: DbClient,
  callerId: string,
  requestId: string | undefined,
  data: AdminAgenciesPayload
): Promise<Record<string, unknown>> => {
  const allowed = await checkRateLimit('admin-agencies', callerId);
  if (!allowed) {
    throw httpError(429, 'RATE_LIMITED', 'Too many requests');
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
      await clearAgencyReferences(db, data.agency_id);
      await deleteAgencyDependencies(db, data.agency_id);
      await deleteAgency(db, data.agency_id);
      return { request_id: requestId, ok: true, agency_id: data.agency_id };
    }
    default:
      throw httpError(400, 'ACTION_REQUIRED', 'action is required');
  }
};
