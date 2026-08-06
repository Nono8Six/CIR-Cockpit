import { withInvalidTrpcResponse } from '@/services/api/invokeTrpc';
import {
  adminUsersBulkDeleteResponseSchema,
  type AdminUsersBulkDeleteResponse
} from '../../../../shared/schemas/system/api-responses';
import { safeTrpc } from '@/services/api/safeTrpc';

export type BulkDeleteUsersResponse = AdminUsersBulkDeleteResponse;;

export const bulkDeleteAdminUsers = (userIds: string[]) =>
  safeTrpc(
    (api, options) => api.admin.users.mutate({
      action: 'bulk_delete',
      user_ids: userIds
    }, options),
    withInvalidTrpcResponse(adminUsersBulkDeleteResponseSchema, { code: 'EDGE_INVALID_RESPONSE' }),
    'Impossible de supprimer les utilisateurs sélectionnés.'
  );
