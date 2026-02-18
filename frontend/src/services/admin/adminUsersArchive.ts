import { safeRpc } from '@/services/api/safeRpc';
import { createAppError } from '@/services/errors/AppError';
import { isRecord } from '@/utils/recordNarrowing';

export type ArchiveUserResponse = {
  ok: true;
  user_id: string;
  archived: boolean;
};

const parseArchiveUserResponse = (payload: unknown): ArchiveUserResponse => {
  if (!isRecord(payload)) {
    throw createAppError({ code: 'EDGE_INVALID_RESPONSE', message: 'Reponse serveur invalide.', source: 'edge' });
  }
  return payload as ArchiveUserResponse;
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
