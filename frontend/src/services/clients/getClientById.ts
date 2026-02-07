import { Client } from '@/types';
import { createAppError } from '@/services/errors/AppError';
import { mapPostgrestError } from '@/services/errors/mapPostgrestError';
import { requireSupabaseClient } from '@/services/supabase/requireSupabaseClient';

export const getClientById = async (clientId: string): Promise<Client> => {
  const supabase = requireSupabaseClient();
  const { data, error, status } = await supabase
    .from('entities')
    .select('*')
    .eq('id', clientId)
    .eq('entity_type', 'Client')
    .single();

  if (error) {
    throw mapPostgrestError(error, {
      operation: 'read',
      resource: 'le client',
      status
    });
  }

  if (!data) {
    throw createAppError({
      code: 'DB_READ_FAILED',
      message: 'Client introuvable.',
      source: 'db'
    });
  }

  return data;
};
