import { withInvalidTrpcResponse } from '@/services/api/invokeTrpc';
import {
  adminUsersResetPasswordResponseSchema,
  type AdminUsersResetPasswordResponse
} from '../../../../shared/schemas/system/api-responses';
import { safeTrpc } from '@/services/api/safeTrpc';

export type ResetPasswordResponse = AdminUsersResetPasswordResponse;;

export const resetAdminUserPassword = (userId: string, password?: string) =>
  safeTrpc(
    (api, options) => api.admin.users.mutate({
      action: 'reset_password',
      user_id: userId,
      password
      }, options),
    withInvalidTrpcResponse(adminUsersResetPasswordResponseSchema, { code: 'EDGE_INVALID_RESPONSE' }),
    'Impossible de réinitialiser le mot de passe.'
  );
