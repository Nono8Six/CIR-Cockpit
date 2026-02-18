import { safeRpc } from '@/services/api/safeRpc';
import { createAppError } from '@/services/errors/AppError';
import { UserRole } from '@/types';
import { isRecord } from '@/utils/recordNarrowing';

export type SetUserRoleResponse = {
  ok: true;
  user_id: string;
  role: UserRole;
};

const parseSetUserRoleResponse = (payload: unknown): SetUserRoleResponse => {
  if (!isRecord(payload)) {
    throw createAppError({ code: 'EDGE_INVALID_RESPONSE', message: 'Reponse serveur invalide.', source: 'edge' });
  }
  return payload as SetUserRoleResponse;
};

export const adminUsersSetRole = (userId: string, role: UserRole) =>
  safeRpc(
    (api, init) => api.admin.users.$post({
      json: {
      action: 'set_role',
      user_id: userId,
      role
      }
    }, init),
    parseSetUserRoleResponse,
    'Impossible de mettre a jour le role.'
  );
