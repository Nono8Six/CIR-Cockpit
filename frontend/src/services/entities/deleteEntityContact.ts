import { ResultAsync } from 'neverthrow';

import { safeAsync } from '@/lib/result';
import { createAppError, type AppError } from '@/services/errors/AppError';
import { mapPostgrestError } from '@/services/errors/mapPostgrestError';
import { normalizeError } from '@/services/errors/normalizeError';
import { requireSupabaseClient } from '@/services/supabase/requireSupabaseClient';

export const deleteEntityContact = (contactId: string): ResultAsync<void, AppError> =>
  safeAsync(
    (async () => {
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
    })(),
    (error) => normalizeError(error, 'Impossible de supprimer le contact.')
  );
