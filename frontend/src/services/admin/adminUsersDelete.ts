import {
  adminUsersDeleteResponseSchema,
  type AdminUsersDeleteResponse
} from '../../../../shared/schemas/api-responses';
import { safeRpc } from '@/services/api/safeRpc';
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
  safeRpc(
    (api, init) => api.admin.users.$post({
      json: {
      action: 'delete',
      user_id: userId
      }
    }, init),
    parseDeleteUserResponse,
    "Impossible de supprimer l'utilisateur."
  );
