import { requireSupabaseClient } from '@/services/supabase/requireSupabaseClient';
import { getCurrentUserId } from '@/services/auth/getCurrentUserId';
import { mapPostgrestError } from '@/services/errors/mapPostgrestError';

export const getProfileActiveAgencyId = async (): Promise<string | null> => {
  const supabase = requireSupabaseClient();
  const userId = await getCurrentUserId();

  const { data, error, status } = await supabase
    .from('profiles')
    .select('active_agency_id')
    .eq('id', userId)
    .maybeSingle();

  if (error) {
    throw mapPostgrestError(error, { operation: 'read', resource: "l'agence active", status });
  }

  return data?.active_agency_id ?? null;
};
