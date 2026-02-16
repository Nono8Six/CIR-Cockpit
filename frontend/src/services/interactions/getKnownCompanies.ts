import { getActiveAgencyId } from '@/services/agency/getActiveAgencyId';
import { mapPostgrestError } from '@/services/errors/mapPostgrestError';
import { requireSupabaseClient } from '@/services/supabase/requireSupabaseClient';

export const getKnownCompanies = async (): Promise<string[]> => {
  const supabase = requireSupabaseClient();
  const agencyId = await getActiveAgencyId();
  if (!agencyId) {
    return [];
  }

  const { data, error, status } = await supabase
    .from('interactions')
    .select('company_name')
    .eq('agency_id', agencyId)
    .not('company_name', 'is', null)
    .neq('company_name', '')
    .order('company_name', { ascending: true })
    .limit(2000);

  if (error) {
    throw mapPostgrestError(error, {
      operation: 'read',
      resource: 'les entreprises connues',
      status
    });
  }

  const deduped = new Map<string, string>();
  for (const row of data ?? []) {
    const name = row.company_name?.trim();
    if (!name) continue;
    const key = name.toLowerCase();
    if (!deduped.has(key)) {
      deduped.set(key, name);
    }
  }

  return [...deduped.values()].sort((left, right) => left.localeCompare(right, 'fr'));
};
