import { safeRpc } from '@/services/api/safeRpc';
import { createAppError } from '@/services/errors/AppError';
import { isRecord } from '@/utils/recordNarrowing';

export type ResetPasswordResponse = {
  ok: true;
  user_id: string;
  temporary_password: string;
};

const parseResetPasswordResponse = (payload: unknown): ResetPasswordResponse => {
  if (!isRecord(payload)) {
    throw createAppError({ code: 'EDGE_INVALID_RESPONSE', message: 'Reponse serveur invalide.', source: 'edge' });
  }
  return payload as ResetPasswordResponse;
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
