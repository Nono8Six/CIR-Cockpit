import {
  adminUsersArchiveResponseSchema,
  type AdminUsersArchiveResponse
} from '../../../../shared/schemas/api-responses';
import { safeRpc } from '@/services/api/safeRpc';
import { createAppError } from '@/services/errors/AppError';

export type UnarchiveUserResponse = AdminUsersArchiveResponse;

const parseUnarchiveUserResponse = (payload: unknown): UnarchiveUserResponse => {
  const parsed = adminUsersArchiveResponseSchema.safeParse(payload);
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

export const adminUsersUnarchive = (userId: string) =>
  safeRpc(
    (api, init) => api.admin.users.$post({
      json: {
      action: 'unarchive',
      user_id: userId
      }
    }, init),
    parseUnarchiveUserResponse,
    "Impossible de reactiver l'utilisateur."
  );
