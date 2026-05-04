import type { AuthContext, SupabaseDbClient } from '../../types.ts';
import { httpError } from '../errorHandler.ts';

type ProfileAuthState = {
  role: AuthContext['role'] | null;
  active_agency_id: string | null;
  archived_at: string | null;
  is_system: boolean;
};

type MembershipLookupRow = {
  agency_id: string | null;
};

type ProfileLookupRow = ProfileAuthState & {
  agency_members?: MembershipLookupRow[] | null;
};

export const toUniqueAgencyIds = (rows: Array<{ agency_id: string }>): string[] => {
  const unique = new Set<string>();
  for (const row of rows) {
    const agencyId = row.agency_id.trim();
    if (agencyId) {
      unique.add(agencyId);
    }
  }
  return [...unique];
};

export const isProfileAccessRevoked = (profile: ProfileAuthState): boolean =>
  Boolean(profile.archived_at) || profile.is_system;

export const resolveAuthContext = async (
  db: SupabaseDbClient,
  userId: string
): Promise<AuthContext> => {
  const { data: profile, error: profileError } = await db
    .from('profiles')
    .select('role, active_agency_id, archived_at, is_system, agency_members(agency_id)')
    .eq('id', userId)
    .single<ProfileLookupRow>();

  if (profileError) {
    throw httpError(500, 'PROFILE_LOOKUP_FAILED', 'Impossible de charger le profil.');
  }
  if (!profile?.role) {
    throw httpError(403, 'AUTH_FORBIDDEN', 'Acces interdit.');
  }
  if (isProfileAccessRevoked(profile)) {
    throw httpError(403, 'AUTH_FORBIDDEN', 'Acces interdit.');
  }

  if (profile.role === 'super_admin') {
    return {
      userId,
      role: profile.role,
      agencyIds: [],
      activeAgencyId: profile.active_agency_id,
      isSuperAdmin: true
    };
  }

  const memberships = Array.isArray(profile.agency_members)
    ? profile.agency_members
      .filter((membership): membership is { agency_id: string } => typeof membership.agency_id === 'string')
    : [];

  return {
    userId,
    role: profile.role,
    agencyIds: toUniqueAgencyIds(memberships),
    activeAgencyId: profile.active_agency_id,
    isSuperAdmin: false
  };
};
