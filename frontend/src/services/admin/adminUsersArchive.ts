import {
  adminUsersArchiveResponseSchema,
  type AdminUsersArchiveResponse
} from 'shared/schemas/api-responses';
import { safeTrpc } from '@/services/api/safeTrpc';
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
  safeTrpc(
    (api, options) => api.admin.users.mutate({
      action: 'archive',
      user_id: userId
      }, options),
    parseArchiveUserResponse,
    "Impossible d'archiver l'utilisateur."
  );
