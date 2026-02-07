import { Client } from '@/types';
import { mapPostgrestError } from '@/services/errors/mapPostgrestError';
import { requireSupabaseClient } from '@/services/supabase/requireSupabaseClient';

export type GetClientsOptions = {
  agencyId?: string | null;
  includeArchived?: boolean;
  orphansOnly?: boolean;
};

export const getClients = async (options: GetClientsOptions = {}): Promise<Client[]> => {
  const supabase = requireSupabaseClient();
  const { agencyId, includeArchived = false, orphansOnly = false } = options;

  let query = supabase
    .from('entities')
    .select('*')
    .eq('entity_type', 'Client')
    .order('name', { ascending: true });

  if (!includeArchived) {
    query = query.is('archived_at', null);
  }

  if (orphansOnly) {
    query = query.is('agency_id', null);
  } else if (agencyId) {
    query = query.eq('agency_id', agencyId);
  }

  const { data, error, status } = await query;

  if (error) {
    throw mapPostgrestError(error, {
      operation: 'read',
      resource: 'les clients',
      status
    });
  }

  return data ?? [];
};
