import { Interaction } from '@/types';
import { getActiveAgencyId } from '@/services/agency/getActiveAgencyId';
import { mapPostgrestError } from '@/services/errors/mapPostgrestError';
import { requireSupabaseClient } from '@/services/supabase/requireSupabaseClient';
import { hydrateTimeline } from './hydrateTimeline';

export const getInteractions = async (agencyIdOverride?: string): Promise<Interaction[]> => {
  const supabase = requireSupabaseClient();
  const agencyId = agencyIdOverride ?? (await getActiveAgencyId());
  const { data, error, status } = await supabase
    .from('interactions')
    .select('*')
    .or(`agency_id.eq.${agencyId},agency_id.is.null`)
    .order('created_at', { ascending: false });

  if (error) {
    throw mapPostgrestError(error, {
      operation: 'read',
      resource: 'les interactions',
      status
    });
  }

  return (data ?? []).map(hydrateTimeline);
};
