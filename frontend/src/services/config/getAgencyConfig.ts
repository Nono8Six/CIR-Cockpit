import { getActiveAgencyId } from '@/services/agency/getActiveAgencyId';
import { mapPostgrestError } from '@/services/errors/mapPostgrestError';
import { requireSupabaseClient } from '@/services/supabase/requireSupabaseClient';
import type { AgencyStatus } from '@/types';
import { isRecord, readString } from '@/utils/recordNarrowing';

export type AgencyConfig = { statuses: AgencyStatus[]; services: string[]; entities: string[]; families: string[]; interactionTypes: string[] };
type ConfigTable = 'agency_statuses' | 'agency_services' | 'agency_entities' | 'agency_families' | 'agency_interaction_types';

const TABLE_LABELS: Record<ConfigTable, string> = { agency_statuses: 'les statuts', agency_services: 'les services', agency_entities: 'les entites', agency_families: 'les familles', agency_interaction_types: "les types d'interaction" };

const fetchLabels = async (table: ConfigTable, agencyId: string): Promise<string[]> => {
  const supabase = requireSupabaseClient();
  const { data, error, status } = await supabase.from(table).select('label, sort_order').eq('agency_id', agencyId).order('sort_order', { ascending: true });
  if (error) throw mapPostgrestError(error, { operation: 'read', resource: TABLE_LABELS[table], status });
  return (data ?? []).map(item => item.label);
};

const toStatus = (value: unknown): AgencyStatus | null => {
  if (!isRecord(value)) return null;
  const id = readString(value, 'id');
  const label = readString(value, 'label');
  const category = readString(value, 'category');
  const sortOrder = value.sort_order;
  if (!id || !label || (category !== 'todo' && category !== 'in_progress' && category !== 'done') || typeof sortOrder !== 'number') return null;
  return { id, label, category, is_terminal: Boolean(value.is_terminal), is_default: Boolean(value.is_default), sort_order: sortOrder };
};

const fetchStatuses = async (agencyId: string): Promise<AgencyStatus[]> => {
  const supabase = requireSupabaseClient();
  const { data, error, status } = await supabase.from('agency_statuses').select('id, label, category, is_terminal, is_default, sort_order').eq('agency_id', agencyId).order('sort_order', { ascending: true });
  if (error) throw mapPostgrestError(error, { operation: 'read', resource: TABLE_LABELS.agency_statuses, status });
  return (data ?? []).map(toStatus).filter((status): status is AgencyStatus => Boolean(status));
};

export const getAgencyConfig = async (agencyIdOverride?: string): Promise<AgencyConfig> => {
  const agencyId = agencyIdOverride ?? (await getActiveAgencyId());
  const [statuses, services, entities, families, interactionTypes] = await Promise.all([fetchStatuses(agencyId), fetchLabels('agency_services', agencyId), fetchLabels('agency_entities', agencyId), fetchLabels('agency_families', agencyId), fetchLabels('agency_interaction_types', agencyId)]);
  return { statuses, services, entities, families, interactionTypes };
};
