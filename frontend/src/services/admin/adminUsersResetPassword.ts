import {
  adminUsersResetPasswordResponseSchema,
  type AdminUsersResetPasswordResponse
} from 'shared/schemas/api-responses';
import { safeTrpc } from '@/services/api/safeTrpc';
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
  safeTrpc(
    (api, options) => api.admin.users.mutate({
      action: 'reset_password',
      user_id: userId,
      password
      }, options),
    parseResetPasswordResponse,
    'Impossible de reinitialiser le mot de passe.'
  );
