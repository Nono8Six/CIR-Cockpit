import { withInvalidTrpcResponse } from '@/services/api/invokeTrpc';
import {
  adminUsersUpdateIdentityResponseSchema,
  type AdminUsersUpdateIdentityResponse
} from '../../../../shared/schemas/system/api-responses';
import { safeTrpc } from '@/services/api/safeTrpc';

export type UpdateUserIdentityPayload = {
  user_id: string;
  email: string;
  first_name: string;
  last_name: string;
};

export type UpdateUserIdentityResponse = AdminUsersUpdateIdentityResponse;;

export const updateAdminUserIdentity = (payload: UpdateUserIdentityPayload) =>
  safeTrpc(
    (api, options) => api.admin.users.mutate({
      action: 'update_identity',
      ...payload
      }, options),
    withInvalidTrpcResponse(adminUsersUpdateIdentityResponseSchema, { code: 'EDGE_INVALID_RESPONSE' }),
    "Impossible de mettre à jour l'identité de l'utilisateur."
  );
