import { withInvalidTrpcResponse } from '@/services/api/invokeTrpc';
import {
  adminUsersArchiveResponseSchema,
  type AdminUsersArchiveResponse
} from '../../../../shared/schemas/system/api-responses';
import { safeTrpc } from '@/services/api/safeTrpc';

export type UnarchiveUserResponse = AdminUsersArchiveResponse;;

export const unarchiveAdminUser = (userId: string) =>
  safeTrpc(
    (api, options) => api.admin.users.mutate({
      action: 'unarchive',
      user_id: userId
      }, options),
    withInvalidTrpcResponse(adminUsersArchiveResponseSchema, { code: 'EDGE_INVALID_RESPONSE' }),
    "Impossible de réactiver l'utilisateur."
  );
