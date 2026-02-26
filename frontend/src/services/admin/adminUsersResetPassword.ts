import {
  adminUsersResetPasswordResponseSchema,
  type AdminUsersResetPasswordResponse
} from '../../../../shared/schemas/api-responses';
import { safeRpc } from '@/services/api/safeRpc';
import { createAppError } from '@/services/errors/AppError';

export type ResetPasswordResponse = AdminUsersResetPasswordResponse;

const parseResetPasswordResponse = (payload: unknown): ResetPasswordResponse => {
  const parsed = adminUsersResetPasswordResponseSchema.safeParse(payload);
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

export const adminUsersResetPassword = (userId: string, password?: string) =>
  safeRpc(
    (api, init) => api.admin.users.$post({
      json: {
      action: 'reset_password',
      user_id: userId,
      password
      }
    }, init),
    parseResetPasswordResponse,
    'Impossible de reinitialiser le mot de passe.'
  );
