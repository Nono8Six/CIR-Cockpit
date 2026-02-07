import type { AgencyMembershipSummary } from '@/types';
import { getCurrentUserId } from '@/services/auth/getCurrentUserId';
import { createAppError } from '@/services/errors/AppError';
import { mapPostgrestError } from '@/services/errors/mapPostgrestError';
import { requireSupabaseClient } from '@/services/supabase/requireSupabaseClient';
import { isRecord, readObject, readString } from '@/utils/recordNarrowing';

type AgencyMembershipRow = { agency_id: string; agencies: { id: string; name: string } | null };

let cachedMemberships: AgencyMembershipSummary[] | null = null;
let cachedUserId: string | null = null;

const toMembershipRow = (value: unknown): AgencyMembershipRow | null => {
  if (!isRecord(value)) return null;
  const agencyId = readString(value, 'agency_id');
  if (!agencyId) return null;
  const agency = readObject(value, 'agencies');
  if (!agency) return { agency_id: agencyId, agencies: null };
  const agencyEntityId = readString(agency, 'id');
  const agencyName = readString(agency, 'name');
  if (!agencyEntityId || !agencyName) return { agency_id: agencyId, agencies: null };
  return { agency_id: agencyId, agencies: { id: agencyEntityId, name: agencyName } };
};

export const getAgencyMemberships = async (allowEmpty = false): Promise<AgencyMembershipSummary[]> => {
  const supabase = requireSupabaseClient();
  const userId = await getCurrentUserId();
  if (cachedMemberships && cachedUserId === userId) return cachedMemberships;

  const { data, error, status } = await supabase.from('agency_members').select('agency_id, agencies ( id, name )').eq('user_id', userId).order('created_at', { ascending: true });
  if (error) throw mapPostgrestError(error, { operation: 'read', resource: 'les agences', status });

  const rows = (data ?? []).map(toMembershipRow).filter((row): row is AgencyMembershipRow => Boolean(row));
  if (rows.length === 0 && !allowEmpty) throw createAppError({ code: 'MEMBERSHIP_NOT_FOUND', message: 'Aucune agence associee a cet utilisateur.', source: 'db' });

  const memberships = rows.filter(row => row.agencies?.name).map(row => ({ agency_id: row.agency_id, agency_name: row.agencies?.name ?? '' })).filter(row => row.agency_name);
  if (memberships.length === 0 && !allowEmpty) throw createAppError({ code: 'MEMBERSHIP_NOT_FOUND', message: 'Aucune agence associee a cet utilisateur.', source: 'db' });

  cachedMemberships = memberships;
  cachedUserId = userId;
  return memberships;
};
