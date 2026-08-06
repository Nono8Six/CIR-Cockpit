import { withInvalidTrpcResponse } from '@/services/api/invokeTrpc';
import {
  adminUsersSetMembershipsResponseSchema,
  type AdminUsersSetMembershipsResponse
} from '../../../../shared/schemas/system/api-responses';
import { safeTrpc } from '@/services/api/safeTrpc';

export type MembershipMode = 'replace' | 'add' | 'remove';

export type SetUserMembershipsResponse = AdminUsersSetMembershipsResponse;;

export const setAdminUserMemberships = (
  userId: string,
  agencyIds: string[],
  mode: MembershipMode = 'replace'
) =>
  safeTrpc(
    (api, options) => api.admin.users.mutate({
      action: 'set_memberships',
      user_id: userId,
      agency_ids: agencyIds,
      mode
      }, options),
    withInvalidTrpcResponse(adminUsersSetMembershipsResponseSchema, { code: 'EDGE_INVALID_RESPONSE' }),
    "Impossible de mettre à jour les agences."
  );
