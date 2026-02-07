import { UserRole } from '@/types';
import { mapPostgrestError } from '@/services/errors/mapPostgrestError';
import { requireSupabaseClient } from '@/services/supabase/requireSupabaseClient';
import { isRecord, readObject, readString } from '@/utils/recordNarrowing';

export type AdminUserMembership = { agency_id: string; agency_name: string };
export type AdminUserSummary = { id: string; email: string; display_name: string | null; role: UserRole; archived_at: string | null; created_at: string; memberships: AdminUserMembership[] };

type MembershipRow = { user_id: string; agency_id: string; agencies: { id: string; name: string } | null };

const toMembershipRow = (value: unknown): MembershipRow | null => {
  if (!isRecord(value)) return null;
  const user_id = readString(value, 'user_id');
  const agency_id = readString(value, 'agency_id');
  if (!user_id || !agency_id) return null;
  const agencyObject = readObject(value, 'agencies');
  const agencyName = agencyObject ? readString(agencyObject, 'name') : null;
  const agencyId = agencyObject ? readString(agencyObject, 'id') : null;
  return { user_id, agency_id, agencies: agencyId && agencyName ? { id: agencyId, name: agencyName } : null };
};

export const getAdminUsers = async (): Promise<AdminUserSummary[]> => {
  const supabase = requireSupabaseClient();
  const [profilesResult, membershipsResult] = await Promise.all([
    supabase.from('profiles').select('id, email, display_name, role, archived_at, created_at').order('created_at', { ascending: true }),
    supabase.from('agency_members').select('user_id, agency_id, agencies ( id, name )')
  ]);

  if (profilesResult.error) throw mapPostgrestError(profilesResult.error, { operation: 'read', resource: 'les utilisateurs', status: profilesResult.status });
  if (membershipsResult.error) throw mapPostgrestError(membershipsResult.error, { operation: 'read', resource: 'les agences', status: membershipsResult.status });

  const membershipsByUser = new Map<string, AdminUserMembership[]>();
  (membershipsResult.data ?? []).map(toMembershipRow).filter((row): row is MembershipRow => Boolean(row)).forEach((item) => {
    if (!item.agencies?.name) return;
    const list = membershipsByUser.get(item.user_id) ?? [];
    list.push({ agency_id: item.agency_id, agency_name: item.agencies.name });
    membershipsByUser.set(item.user_id, list);
  });

  return (profilesResult.data ?? []).map((profile) => ({
    id: profile.id,
    email: profile.email,
    display_name: profile.display_name,
    role: profile.role,
    archived_at: profile.archived_at,
    created_at: profile.created_at,
    memberships: membershipsByUser.get(profile.id) ?? []
  }));
};
