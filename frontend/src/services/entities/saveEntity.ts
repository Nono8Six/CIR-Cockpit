import { ResultAsync } from 'neverthrow';

import { AccountType, Entity } from '@/types';
import { safeAsync } from '@/lib/result';
import { createAppError, type AppError } from '@/services/errors/AppError';
import { mapPostgrestError } from '@/services/errors/mapPostgrestError';
import { normalizeError } from '@/services/errors/normalizeError';
import { requireSupabaseClient } from '@/services/supabase/requireSupabaseClient';

export type EntityPayload = {
  id?: string;
  entity_type: string;
  name: string;
  agency_id: string | null;
  city?: string | null;
  client_number?: string | null;
  account_type?: AccountType | null;
  address?: string | null;
  postal_code?: string | null;
  department?: string | null;
  siret?: string | null;
  notes?: string | null;
};

const normalizePayload = (payload: EntityPayload): EntityPayload => ({
  ...payload,
  entity_type: payload.entity_type.trim(),
  name: payload.name.trim(),
  city: payload.city?.trim() || null,
  client_number: payload.client_number?.trim() || null,
  address: payload.address?.trim() || null,
  postal_code: payload.postal_code?.trim() || null,
  department: payload.department?.trim() || null,
  siret: payload.siret?.trim() || null,
  notes: payload.notes?.trim() || null
});

export const saveEntity = (payload: EntityPayload): ResultAsync<Entity, AppError> =>
  safeAsync(
    (async () => {
      const supabase = requireSupabaseClient();
      const normalized = normalizePayload(payload);

      if (normalized.id) {
        const { data, error, status } = await supabase
          .from('entities')
          .update({
            entity_type: normalized.entity_type,
            name: normalized.name,
            agency_id: normalized.agency_id,
            city: normalized.city,
            client_number: normalized.client_number,
            account_type: normalized.account_type ?? null,
            address: normalized.address,
            postal_code: normalized.postal_code,
            department: normalized.department,
            siret: normalized.siret,
            notes: normalized.notes
          })
          .eq('id', normalized.id)
          .select('*')
          .single();

        if (error) {
          throw mapPostgrestError(error, {
            operation: 'write',
            resource: "l'entite",
            status
          });
        }

        if (!data) {
          throw createAppError({
            code: 'DB_WRITE_FAILED',
            message: "Impossible de mettre a jour l'entite.",
            source: 'db'
          });
        }

        return data;
      }

      const { data, error, status } = await supabase
        .from('entities')
        .insert({
          entity_type: normalized.entity_type,
          name: normalized.name,
          agency_id: normalized.agency_id,
          city: normalized.city,
          client_number: normalized.client_number,
          account_type: normalized.account_type ?? null,
          address: normalized.address,
          postal_code: normalized.postal_code,
          department: normalized.department,
          siret: normalized.siret,
          notes: normalized.notes
        })
        .select('*')
        .single();

      if (error) {
        throw mapPostgrestError(error, {
          operation: 'write',
          resource: "l'entite",
          status
        });
      }

      if (!data) {
        throw createAppError({
          code: 'DB_WRITE_FAILED',
          message: "Impossible de creer l'entite.",
          source: 'db'
        });
      }

      return data;
    })(),
    (error) => normalizeError(error, "Impossible d'enregistrer l'entite.")
  );
