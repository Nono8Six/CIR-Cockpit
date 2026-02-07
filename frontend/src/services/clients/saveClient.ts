import { ResultAsync } from 'neverthrow';

import { AccountType, Client } from '@/types';
import { safeAsync } from '@/lib/result';
import { createAppError, type AppError } from '@/services/errors/AppError';
import { mapPostgrestError } from '@/services/errors/mapPostgrestError';
import { normalizeError } from '@/services/errors/normalizeError';
import { requireSupabaseClient } from '@/services/supabase/requireSupabaseClient';

export type ClientPayload = {
  id?: string;
  client_number?: string | null;
  account_type: AccountType;
  name: string;
  agency_id: string | null;
  address: string;
  postal_code: string;
  department: string;
  city: string;
  siret?: string | null;
  notes?: string | null;
};

const normalizePayload = (payload: ClientPayload): ClientPayload => {
  const normalizedClientNumber = payload.client_number?.trim() ?? '';

  return {
    ...payload,
    client_number: normalizedClientNumber ? normalizedClientNumber : null,
    account_type: payload.account_type,
    name: payload.name.trim(),
    address: payload.address.trim(),
    postal_code: payload.postal_code.trim(),
    department: payload.department.trim(),
    city: payload.city.trim(),
    siret: payload.siret?.trim() || null,
    notes: payload.notes?.trim() || null
  };
};

export const saveClient = (payload: ClientPayload): ResultAsync<Client, AppError> =>
  safeAsync(
    (async () => {
      const supabase = requireSupabaseClient();
      const normalized = normalizePayload(payload);

      if (normalized.id) {
        const { data, error, status } = await supabase
          .from('entities')
          .update({
            entity_type: 'Client',
            client_number: normalized.client_number,
            account_type: normalized.account_type,
            name: normalized.name,
            agency_id: normalized.agency_id,
            address: normalized.address,
            postal_code: normalized.postal_code,
            department: normalized.department,
            city: normalized.city,
            siret: normalized.siret,
            notes: normalized.notes
          })
          .eq('id', normalized.id)
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
      }

      const { data, error, status } = await supabase
        .from('entities')
        .insert({
          entity_type: 'Client',
          client_number: normalized.client_number,
          account_type: normalized.account_type,
          name: normalized.name,
          agency_id: normalized.agency_id,
          address: normalized.address,
          postal_code: normalized.postal_code,
          department: normalized.department,
          city: normalized.city,
          siret: normalized.siret,
          notes: normalized.notes
        })
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
          message: 'Impossible de creer le client.',
          source: 'db'
        });
      }

      return data;
    })(),
    (error) => normalizeError(error, 'Impossible de sauvegarder le client.')
  );
