import { mapPostgrestError } from '@/services/errors/mapPostgrestError';
import { requireSupabaseClient } from '@/services/supabase/requireSupabaseClient';
import { isRecord, readBoolean, readObject, readString } from '@/utils/recordNarrowing';

export type AuditLogEntry = { id: string; action: string; entity_table: string; entity_id: string; metadata: unknown; created_at: string; actor_id: string | null; actor_is_super_admin: boolean; agency_id: string | null; actor?: { id: string; display_name: string | null; email: string } | null; agency?: { id: string; name: string } | null };
export type AuditLogFilters = { agencyId?: string | null; actorId?: string | null; from?: string | null; to?: string | null; entityTable?: string | null; limit?: number };

const toActor = (value: unknown): AuditLogEntry['actor'] => {
  if (!isRecord(value)) return null;
  const id = readString(value, 'id');
  const email = readString(value, 'email');
  if (!id || !email) return null;
  const display_name = readString(value, 'display_name');
  return { id, email, display_name };
};

const toAgency = (value: unknown): AuditLogEntry['agency'] => {
  if (!isRecord(value)) return null;
  const id = readString(value, 'id');
  const name = readString(value, 'name');
  if (!id || !name) return null;
  return { id, name };
};

const toAuditEntry = (value: unknown): AuditLogEntry | null => {
  if (!isRecord(value)) return null;
  const id = readString(value, 'id');
  const action = readString(value, 'action');
  const entity_table = readString(value, 'entity_table');
  const entity_id = readString(value, 'entity_id');
  const created_at = readString(value, 'created_at');
  if (!id || !action || !entity_table || !entity_id || !created_at) return null;

  return {
    id,
    action,
    entity_table,
    entity_id,
    metadata: value.metadata,
    created_at,
    actor_id: readString(value, 'actor_id'),
    actor_is_super_admin: readBoolean(value, 'actor_is_super_admin') ?? false,
    agency_id: readString(value, 'agency_id'),
    actor: toActor(readObject(value, 'actor')),
    agency: toAgency(readObject(value, 'agency'))
  };
};

export const getAuditLogs = async (filters: AuditLogFilters = {}): Promise<AuditLogEntry[]> => {
  const supabase = requireSupabaseClient();
  let query = supabase.from('audit_logs').select('id, action, entity_table, entity_id, metadata, created_at, actor_id, actor_is_super_admin, agency_id, actor:profiles ( id, display_name, email ), agency:agencies ( id, name )').order('created_at', { ascending: false }).limit(filters.limit ?? 200);
  if (filters.agencyId) query = query.eq('agency_id', filters.agencyId);
  if (filters.actorId) query = query.eq('actor_id', filters.actorId);
  if (filters.entityTable) query = query.eq('entity_table', filters.entityTable);
  if (filters.from) query = query.gte('created_at', filters.from);
  if (filters.to) query = query.lte('created_at', filters.to);

  const { data, error, status } = await query;
  if (error) throw mapPostgrestError(error, { operation: 'read', resource: 'les audits', status });
  return (data ?? []).map(toAuditEntry).filter((entry): entry is AuditLogEntry => Boolean(entry));
};
