import { Agency } from '@/types';
import { mapPostgrestError } from '@/services/errors/mapPostgrestError';
import { requireSupabaseClient } from '@/services/supabase/requireSupabaseClient';

export const getAgencies = async (includeArchived = false): Promise<Agency[]> => {
  const supabase = requireSupabaseClient();

  let query = supabase
    .from('agencies')
    .select('*')
    .order('name', { ascending: true });

  if (!includeArchived) {
    query = query.is('archived_at', null);
  }

  const { data, error, status } = await query;

  if (error) {
    throw mapPostgrestError(error, {
      operation: 'read',
      resource: 'les agences',
      status
    });
  }

  return data ?? [];
};
