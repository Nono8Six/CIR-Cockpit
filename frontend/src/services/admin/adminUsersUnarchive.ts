import {
  adminUsersArchiveResponseSchema,
  type AdminUsersArchiveResponse
} from 'shared/schemas/api-responses';
import { safeTrpc } from '@/services/api/safeTrpc';
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
  safeTrpc(
    (api, options) => api.admin.users.mutate({
      action: 'unarchive',
      user_id: userId
      }, options),
    parseUnarchiveUserResponse,
    "Impossible de reactiver l'utilisateur."
  );
