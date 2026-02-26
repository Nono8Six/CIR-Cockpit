import {
  adminUsersSetRoleResponseSchema,
  type AdminUsersSetRoleResponse
} from '../../../../shared/schemas/api-responses';
import { safeRpc } from '@/services/api/safeRpc';
import { createAppError } from '@/services/errors/AppError';
import { UserRole } from '@/types';

export type SetUserRoleResponse = AdminUsersSetRoleResponse;

const parseSetUserRoleResponse = (payload: unknown): SetUserRoleResponse => {
  const parsed = adminUsersSetRoleResponseSchema.safeParse(payload);
  if (!parsed.success) {
    throw createAppError({
      code: 'EDGE_INVALID_RESPONSE',
      message: 'Reponse serveur invalide.',
      source: 'edge',
      details: parsed.error.message
    });
  }
  return parsed.data;
};

export const adminUsersSetRole = (userId: string, role: UserRole) =>
  safeRpc(
    (api, init) => api.admin.users.$post({
      json: {
      action: 'set_role',
      user_id: userId,
      role
      }
    }, init),
    parseSetUserRoleResponse,
    'Impossible de mettre a jour le role.'
  );
