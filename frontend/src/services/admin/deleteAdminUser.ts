import { withInvalidTrpcResponse } from '@/services/api/invokeTrpc';
import {
  adminUsersDeleteResponseSchema,
  type AdminUsersDeleteResponse
} from '../../../../shared/schemas/system/api-responses';
import { safeTrpc } from '@/services/api/safeTrpc';

export type DeleteUserResponse = AdminUsersDeleteResponse;;

export const deleteAdminUser = (userId: string) =>
  safeTrpc(
    (api, options) => api.admin.users.mutate({
      action: 'delete',
      user_id: userId
      }, options),
    withInvalidTrpcResponse(adminUsersDeleteResponseSchema, { code: 'EDGE_INVALID_RESPONSE' }),
    "Impossible de supprimer l'utilisateur."
  );
