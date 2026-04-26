import {
  adminUsersDeleteResponseSchema,
  type AdminUsersDeleteResponse
} from 'shared/schemas/api-responses';
import { safeTrpc } from '@/services/api/safeTrpc';
import { createAppError } from '@/services/errors/AppError';

export type DeleteUserResponse = AdminUsersDeleteResponse;

const parseDeleteUserResponse = (payload: unknown): DeleteUserResponse => {
  const parsed = adminUsersDeleteResponseSchema.safeParse(payload);
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

export const adminUsersDelete = (userId: string) =>
  safeTrpc(
    (api, options) => api.admin.users.mutate({
      action: 'delete',
      user_id: userId
      }, options),
    parseDeleteUserResponse,
    "Impossible de supprimer l'utilisateur."
  );
