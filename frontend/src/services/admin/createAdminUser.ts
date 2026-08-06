import { withInvalidTrpcResponse } from '@/services/api/invokeTrpc';
import {
  adminUsersCreateResponseSchema,
  type AdminUsersCreateResponse
} from '../../../../shared/schemas/system/api-responses';
import { safeTrpc } from '@/services/api/safeTrpc';
import { UserRole } from '@/types';

export type CreateAdminUserPayload = {
  email: string;
  first_name: string;
  last_name: string;
  role?: UserRole;
  agency_ids?: string[];
  password?: string;
};

export type CreateAdminUserResponse = AdminUsersCreateResponse;;

export const createAdminUser = (payload: CreateAdminUserPayload) =>
  safeTrpc(
    (api, options) => api.admin.users.mutate({
      action: 'create',
      ...payload
      }, options),
    withInvalidTrpcResponse(adminUsersCreateResponseSchema, { code: 'EDGE_INVALID_RESPONSE' }),
    "Impossible de créer l'utilisateur."
  );
