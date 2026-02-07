import { ResultAsync } from 'neverthrow';

import { EntityContact } from '@/types';
import { safeAsync } from '@/lib/result';
import { createAppError, type AppError } from '@/services/errors/AppError';
import { mapPostgrestError } from '@/services/errors/mapPostgrestError';
import { normalizeError } from '@/services/errors/normalizeError';
import { requireSupabaseClient } from '@/services/supabase/requireSupabaseClient';

export type EntityContactPayload = {
  id?: string;
  entity_id: string;
  first_name: string;
  last_name: string;
  email?: string | null;
  phone?: string | null;
  position?: string | null;
  notes?: string | null;
};

const normalizePayload = (payload: EntityContactPayload): EntityContactPayload => ({
  ...payload,
  first_name: payload.first_name.trim(),
  last_name: payload.last_name.trim(),
  email: payload.email?.trim() || null,
  phone: payload.phone?.trim() || null,
  position: payload.position?.trim() || null,
  notes: payload.notes?.trim() || null
});

export const saveEntityContact = (payload: EntityContactPayload): ResultAsync<EntityContact, AppError> =>
  safeAsync(
    (async () => {
      const supabase = requireSupabaseClient();
      const normalized = normalizePayload(payload);

      if (normalized.id) {
        const { data, error, status } = await supabase
          .from('entity_contacts')
          .update({
            first_name: normalized.first_name,
            last_name: normalized.last_name,
            email: normalized.email,
            phone: normalized.phone,
            position: normalized.position,
            notes: normalized.notes
          })
          .eq('id', normalized.id)
          .select('*')
          .single();

        if (error) {
          throw mapPostgrestError(error, {
            operation: 'write',
            resource: 'le contact',
            status
          });
        }

        if (!data) {
          throw createAppError({
            code: 'DB_WRITE_FAILED',
            message: 'Impossible de mettre a jour le contact.',
            source: 'db'
          });
        }

        return data;
      }

      const { data, error, status } = await supabase
        .from('entity_contacts')
        .insert({
          entity_id: normalized.entity_id,
          first_name: normalized.first_name,
          last_name: normalized.last_name,
          email: normalized.email,
          phone: normalized.phone,
          position: normalized.position,
          notes: normalized.notes
        })
        .select('*')
        .single();

      if (error) {
        throw mapPostgrestError(error, {
          operation: 'write',
          resource: 'le contact',
          status
        });
      }

      if (!data) {
        throw createAppError({
          code: 'DB_WRITE_FAILED',
          message: 'Impossible de creer le contact.',
          source: 'db'
        });
      }

      return data;
    })(),
    (error) => normalizeError(error, "Impossible d'enregistrer le contact.")
  );
