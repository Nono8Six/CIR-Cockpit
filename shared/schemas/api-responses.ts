import type { AdminUsersPayload } from './user.schema.ts';
import type { Database } from '../supabase.types.ts';

type ApiSuccess = {
  request_id?: string;
  ok: true;
};

type EntityRow = Database['public']['Tables']['entities']['Row'];
type EntityContactRow = Database['public']['Tables']['entity_contacts']['Row'];
type InteractionRow = Database['public']['Tables']['interactions']['Row'];
type AgencyRow = Database['public']['Tables']['agencies']['Row'];
type ProfileRow = Database['public']['Tables']['profiles']['Row'];
type AgencyMemberRow = Database['public']['Tables']['agency_members']['Row'];

type MembershipMode = NonNullable<Extract<AdminUsersPayload, { action: 'set_memberships' }>['mode']>;

export type DataEntitiesResponse = ApiSuccess & {
  entity: EntityRow;
  propagated_interactions_count?: number;
};

export type DataEntityContactsResponse =
  | (ApiSuccess & { contact: EntityContactRow })
  | (ApiSuccess & { contact_id: EntityContactRow['id'] });

export type DataInteractionsResponse = ApiSuccess & {
  interaction: InteractionRow;
};

export type DataConfigResponse = ApiSuccess;

export type DataProfileResponse = ApiSuccess;

export type AdminAgencySummary = Pick<AgencyRow, 'id' | 'name' | 'archived_at'>;

export type AdminAgenciesResponse =
  | (ApiSuccess & { agency: AdminAgencySummary })
  | (ApiSuccess & { agency_id: AgencyRow['id'] });

export type AdminUsersCreateResponse = ApiSuccess & {
  user_id: ProfileRow['id'];
  account_state: 'created' | 'existing';
  role: ProfileRow['role'];
  agency_ids: AgencyMemberRow['agency_id'][];
  temporary_password?: string;
};

export type AdminUsersSetRoleResponse = ApiSuccess & {
  user_id: ProfileRow['id'];
  role: ProfileRow['role'];
};

export type AdminUsersUpdateIdentityResponse = ApiSuccess & {
  user_id: ProfileRow['id'];
  email: ProfileRow['email'];
  first_name: NonNullable<ProfileRow['first_name']>;
  last_name: NonNullable<ProfileRow['last_name']>;
  display_name: NonNullable<ProfileRow['display_name']>;
};

export type AdminUsersSetMembershipsResponse = ApiSuccess & {
  user_id: ProfileRow['id'];
  agency_ids: AgencyMemberRow['agency_id'][];
  membership_mode: MembershipMode;
};

export type AdminUsersResetPasswordResponse = ApiSuccess & {
  user_id: ProfileRow['id'];
  temporary_password: string;
};

export type AdminUsersArchiveResponse = ApiSuccess & {
  user_id: ProfileRow['id'];
  archived: boolean;
};

export type AdminUsersDeleteResponse = ApiSuccess & {
  user_id: ProfileRow['id'];
  deleted: true;
  anonymized_interactions: number;
  anonymized_agency_ids: AgencyMemberRow['agency_id'][];
  anonymized_orphan_interactions: number;
};

export type AdminUsersResponse =
  | AdminUsersCreateResponse
  | AdminUsersSetRoleResponse
  | AdminUsersUpdateIdentityResponse
  | AdminUsersSetMembershipsResponse
  | AdminUsersResetPasswordResponse
  | AdminUsersArchiveResponse
  | AdminUsersDeleteResponse;
