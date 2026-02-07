import { ResultAsync } from 'neverthrow';

import { Client } from '@/types';
import { safeAsync } from '@/lib/result';
import { createAppError, type AppError } from '@/services/errors/AppError';
import { mapPostgrestError } from '@/services/errors/mapPostgrestError';
import { normalizeError } from '@/services/errors/normalizeError';
import { requireSupabaseClient } from '@/services/supabase/requireSupabaseClient';

export const setClientArchived = (clientId: string, archived: boolean): ResultAsync<Client, AppError> =>
  safeAsync(
    (async () => {
      const supabase = requireSupabaseClient();
      const { data, error, status } = await supabase
        .from('entities')
        .update({ archived_at: archived ? new Date().toISOString() : null })
        .eq('id', clientId)
        .eq('entity_type', 'Client')
        .select('*')
        .single();

      if (error) {
        throw mapPostgrestError(error, {
          operation: 'write',
          resource: 'le client',
          status
        });
      }

      if (!data) {
        throw createAppError({
          code: 'DB_WRITE_FAILED',
          message: 'Impossible de mettre a jour le client.',
          source: 'db'
        });
      }

      return data;
    })(),
    (error) => normalizeError(error, "Impossible de mettre a jour le client.")
  );
