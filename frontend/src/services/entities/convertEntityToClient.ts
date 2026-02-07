import { ResultAsync } from 'neverthrow';

import { AccountType, Entity } from '@/types';
import { safeAsync } from '@/lib/result';
import { createAppError, type AppError } from '@/services/errors/AppError';
import { mapPostgrestError } from '@/services/errors/mapPostgrestError';
import { normalizeError } from '@/services/errors/normalizeError';
import { requireSupabaseClient } from '@/services/supabase/requireSupabaseClient';

export type ConvertClientPayload = {
  id: string;
  client_number: string;
  account_type: AccountType;
};

export const convertEntityToClient = (payload: ConvertClientPayload): ResultAsync<Entity, AppError> =>
  safeAsync(
    (async () => {
      const supabase = requireSupabaseClient();
      const clientNumber = payload.client_number.trim().replace(/\s+/g, '');

      if (!clientNumber) {
        throw createAppError({
          code: 'VALIDATION_ERROR',
          message: 'Numero client requis.',
          source: 'client'
        });
      }

      const { data, error, status } = await supabase
        .from('entities')
        .update({
          entity_type: 'Client',
          client_number: clientNumber,
          account_type: payload.account_type
        })
        .eq('id', payload.id)
        .neq('entity_type', 'Client')
        .select('*')
        .single();

      if (error) {
        throw mapPostgrestError(error, {
          operation: 'write',
          resource: "la conversion du client",
          status
        });
      }

      if (!data) {
        throw createAppError({
          code: 'DB_WRITE_FAILED',
          message: 'Impossible de convertir en client.',
          source: 'db'
        });
      }

      return data;
    })(),
    (error) => normalizeError(error, 'Impossible de convertir en client.')
  );
