import { ResultAsync } from 'neverthrow';

import { safeAsync } from '@/lib/result';
import { getCurrentUserId } from '@/services/auth/getCurrentUserId';
import { mapPostgrestError } from '@/services/errors/mapPostgrestError';
import { normalizeError } from '@/services/errors/normalizeError';
import { requireSupabaseClient } from '@/services/supabase/requireSupabaseClient';
import type { AppError } from '@/services/errors/AppError';

export const setProfileActiveAgencyId = (agencyId: string | null): ResultAsync<void, AppError> =>
  safeAsync(
    (async () => {
      const supabase = requireSupabaseClient();
      const userId = await getCurrentUserId();

      const { error, status } = await supabase
        .from('profiles')
        .update({ active_agency_id: agencyId })
        .eq('id', userId);

      if (error) {
        throw mapPostgrestError(error, { operation: 'write', resource: "l'agence active", status });
      }
    })(),
    (error) => normalizeError(error, "Impossible de changer d'agence.")
  );
