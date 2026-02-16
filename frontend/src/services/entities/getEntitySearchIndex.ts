import { Entity, EntityContact } from '@/types';
import { mapPostgrestError } from '@/services/errors/mapPostgrestError';
import { requireSupabaseClient } from '@/services/supabase/requireSupabaseClient';

export type EntitySearchIndex = {
  entities: Entity[];
  contacts: EntityContact[];
};

export const getEntitySearchIndex = async (
  agencyId: string | null,
  includeArchived = false
): Promise<EntitySearchIndex> => {
  if (!agencyId) {
    return { entities: [], contacts: [] };
  }

  const supabase = requireSupabaseClient();

  const entitiesQuery = supabase
    .from('entities')
    .select('*')
    .order('name', { ascending: true });

  const filteredEntitiesQuery = entitiesQuery.eq('agency_id', agencyId);

  const finalEntitiesQuery = includeArchived
    ? filteredEntitiesQuery
    : filteredEntitiesQuery.is('archived_at', null);

  const contactsQuery = supabase
    .from('entity_contacts')
    .select('*')
    .order('last_name', { ascending: true });

  const finalContactsQuery = includeArchived
    ? contactsQuery
    : contactsQuery.is('archived_at', null);

  const [
    { data: entities, error: entitiesError, status: entitiesStatus },
    { data: contacts, error: contactsError, status: contactsStatus }
  ] = await Promise.all([
    finalEntitiesQuery,
    finalContactsQuery
  ]);

  if (entitiesError) {
    throw mapPostgrestError(entitiesError, {
      operation: 'read',
      resource: 'les entites',
      status: entitiesStatus
    });
  }

  if (contactsError) {
    throw mapPostgrestError(contactsError, {
      operation: 'read',
      resource: 'les contacts',
      status: contactsStatus
    });
  }

  return { entities: entities ?? [], contacts: contacts ?? [] };
};
