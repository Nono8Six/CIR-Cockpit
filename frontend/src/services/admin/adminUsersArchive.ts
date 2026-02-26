import {
  adminUsersArchiveResponseSchema,
  type AdminUsersArchiveResponse
} from '../../../../shared/schemas/api-responses';
import { safeRpc } from '@/services/api/safeRpc';
import { createAppError } from '@/services/errors/AppError';

export type ArchiveUserResponse = AdminUsersArchiveResponse;

const parseArchiveUserResponse = (payload: unknown): ArchiveUserResponse => {
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

export const adminUsersArchive = (userId: string) =>
  safeRpc(
    (api, init) => api.admin.users.$post({
      json: {
      action: 'archive',
      user_id: userId
      }
    }, init),
    parseArchiveUserResponse,
    "Impossible d'archiver l'utilisateur."
  );
