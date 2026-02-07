import { createAppError } from '@/services/errors/AppError';
import { mapPostgrestError } from '@/services/errors/mapPostgrestError';
import { requireSupabaseClient } from '@/services/supabase/requireSupabaseClient';

export const deleteClientContact = async (contactId: string): Promise<void> => {
  const supabase = requireSupabaseClient();
  const { error, status } = await supabase
    .from('entity_contacts')
    .delete()
    .eq('id', contactId);

  if (error) {
    throw mapPostgrestError(error, {
      operation: 'delete',
      resource: 'le contact',
      status
    });
  }

  if (status !== 204) {
    throw createAppError({
      code: 'DB_WRITE_FAILED',
      message: 'Impossible de supprimer le contact.',
      source: 'db'
    });
  }
};
