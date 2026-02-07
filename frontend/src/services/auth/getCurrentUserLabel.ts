import { requireSupabaseClient } from '@/services/supabase/requireSupabaseClient';
import { mapPostgrestError } from '@/services/errors/mapPostgrestError';
import { reportError } from '@/services/errors/reportError';
import { getCurrentUserId } from './getCurrentUserId';

let cachedLabel: string | null | undefined;
let cachedUserId: string | null = null;

export const getCurrentUserLabel = async (): Promise<string | null> => {
  const supabase = requireSupabaseClient();
  const userId = await getCurrentUserId();
  if (cachedLabel !== undefined && cachedUserId === userId) {
    return cachedLabel;
  }

  const { data, error, status } = await supabase
    .from('profiles')
    .select('display_name, email')
    .eq('id', userId)
    .single();

  if (error) {
    const appError = mapPostgrestError(error, { operation: 'read', resource: 'le profil', status });
    reportError(appError, { source: 'getCurrentUserLabel' });
    cachedLabel = null;
    cachedUserId = userId;
    return null;
  }

  const label = (data?.display_name || data?.email || '').trim();
  cachedLabel = label ? label : null;
  cachedUserId = userId;
  return cachedLabel;
};
