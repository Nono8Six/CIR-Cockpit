import { invokeAdminFunction } from './invokeAdminFunction';

export type MembershipMode = 'replace' | 'add' | 'remove';

export type SetUserMembershipsResponse = {
  ok: true;
  user_id: string;
  agency_ids: string[];
  membership_mode: MembershipMode;
};

export const adminUsersSetMemberships = (
  userId: string,
  agencyIds: string[],
  mode: MembershipMode = 'replace'
) =>
  invokeAdminFunction<SetUserMembershipsResponse>(
    'admin-users',
    {
      action: 'set_memberships',
      user_id: userId,
      agency_ids: agencyIds,
      mode
    },
    "Impossible de mettre a jour les agences."
  );
