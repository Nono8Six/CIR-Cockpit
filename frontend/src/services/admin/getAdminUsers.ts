import { UserRole } from '@/types';
import { mapPostgrestError } from '@/services/errors/mapPostgrestError';
import { requireSupabaseClient } from '@/services/supabase/requireSupabaseClient';
import { isRecord, readObject, readString } from '@/utils/recordNarrowing';

export type AdminUserMembership = { agency_id: string; agency_name: string };
export type AdminUserSummary = {
  id: string;
  email: string;
  display_name: string | null;
  first_name: string | null;
  last_name: string | null;
  role: UserRole;
  archived_at: string | null;
  created_at: string;
  memberships: AdminUserMembership[];
};

type MembershipRow = { user_id: string; agency_id: string; agencies: { id: string; name: string } | null };
type ProfileRow = Omit<AdminUserSummary, 'memberships'> & { is_system: boolean };

const PROFILES_SELECT_WITH_NAMES = 'id, email, display_name, first_name, last_name, role, archived_at, created_at, is_system';
const PROFILES_SELECT_LEGACY = 'id, email, display_name, role, archived_at, created_at';

const normalizeDisplayName = (displayName: string | null): string | null => {
  if (!displayName) return null;
  const normalized = displayName.trim().replace(/\s+/g, ' ');
  return normalized.length > 0 ? normalized : null;
};

const splitLegacyDisplayName = (displayName: string | null): { first_name: string | null; last_name: string | null } => {
  const normalized = normalizeDisplayName(displayName);
  if (!normalized) return { first_name: null, last_name: null };
  const [lastName, ...firstNameParts] = normalized.split(' ');
  return {
    last_name: lastName || null,
    first_name: firstNameParts.length > 0 ? firstNameParts.join(' ') : null
  };
};

const shouldFallbackToLegacyProfilesSelect = (errorMessage: string, errorDetails: string | null): boolean => {
  const normalized = `${errorMessage} ${errorDetails ?? ''}`.toLowerCase();
  return normalized.includes('first_name') || normalized.includes('last_name') || normalized.includes('is_system');
};

const loadProfiles = async (): Promise<ProfileRow[]> => {
  const supabase = requireSupabaseClient();
  const withNamesResult = await supabase
    .from('profiles')
    .select(PROFILES_SELECT_WITH_NAMES)
    .order('created_at', { ascending: true });

  if (!withNamesResult.error) {
    return withNamesResult.data ?? [];
  }

  const canFallback =
    (withNamesResult.error.code === 'PGRST204' || withNamesResult.error.code === '42703') &&
    shouldFallbackToLegacyProfilesSelect(withNamesResult.error.message, withNamesResult.error.details);
  if (!canFallback) {
    throw mapPostgrestError(withNamesResult.error, {
      operation: 'read',
      resource: 'les utilisateurs',
      status: withNamesResult.status
    });
  }

  const legacyResult = await supabase
    .from('profiles')
    .select(PROFILES_SELECT_LEGACY)
    .order('created_at', { ascending: true });
  if (legacyResult.error) {
    throw mapPostgrestError(legacyResult.error, {
      operation: 'read',
      resource: 'les utilisateurs',
      status: legacyResult.status
    });
  }

  return (legacyResult.data ?? []).map((profile) => {
    const normalizedDisplayName = normalizeDisplayName(profile.display_name);
    const nameParts = splitLegacyDisplayName(normalizedDisplayName);
    return {
      ...profile,
      display_name: normalizedDisplayName,
      first_name: nameParts.first_name,
      last_name: nameParts.last_name,
      is_system: false
    };
  });
};

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
    loadProfiles(),
    supabase.from('agency_members').select('user_id, agency_id, agencies ( id, name )')
  ]);

  if (membershipsResult.error) throw mapPostgrestError(membershipsResult.error, { operation: 'read', resource: 'les agences', status: membershipsResult.status });

  const membershipsByUser = new Map<string, AdminUserMembership[]>();
  (membershipsResult.data ?? []).map(toMembershipRow).filter((row): row is MembershipRow => Boolean(row)).forEach((item) => {
    if (!item.agencies?.name) return;
    const list = membershipsByUser.get(item.user_id) ?? [];
    list.push({ agency_id: item.agency_id, agency_name: item.agencies.name });
    membershipsByUser.set(item.user_id, list);
  });

  return profilesResult.filter((profile) => !profile.is_system).map((profile) => ({
    id: profile.id,
    email: profile.email,
    display_name: profile.display_name,
    first_name: profile.first_name,
    last_name: profile.last_name,
    role: profile.role,
    archived_at: profile.archived_at,
    created_at: profile.created_at,
    memberships: membershipsByUser.get(profile.id) ?? []
  }));
};
