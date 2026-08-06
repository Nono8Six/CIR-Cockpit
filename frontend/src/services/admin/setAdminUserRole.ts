import { withInvalidTrpcResponse } from '@/services/api/invokeTrpc';
import {
  adminUsersSetRoleResponseSchema,
  type AdminUsersSetRoleResponse
} from '../../../../shared/schemas/system/api-responses';
import { safeTrpc } from '@/services/api/safeTrpc';
import { UserRole } from '@/types';

export type SetUserRoleResponse = AdminUsersSetRoleResponse;;

export const setAdminUserRole = (userId: string, role: UserRole) =>
  safeTrpc(
    (api, options) => api.admin.users.mutate({
      action: 'set_role',
      user_id: userId,
      role
      }, options),
    withInvalidTrpcResponse(adminUsersSetRoleResponseSchema, { code: 'EDGE_INVALID_RESPONSE' }),
    'Impossible de mettre à jour le rôle.'
  );
