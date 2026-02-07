import { EntityContact } from '@/types';
import { mapPostgrestError } from '@/services/errors/mapPostgrestError';
import { requireSupabaseClient } from '@/services/supabase/requireSupabaseClient';

export const getEntityContacts = async (
  entityId: string,
  includeArchived = false
): Promise<EntityContact[]> => {
  const supabase = requireSupabaseClient();
  const query = supabase
    .from('entity_contacts')
    .select('*')
    .eq('entity_id', entityId)
    .order('last_name', { ascending: true });

  const finalQuery = includeArchived ? query : query.is('archived_at', null);

  const { data, error, status } = await finalQuery;

  if (error) {
    throw mapPostgrestError(error, {
      operation: 'read',
      resource: 'les contacts',
      status
    });
  }

  return data ?? [];
};
