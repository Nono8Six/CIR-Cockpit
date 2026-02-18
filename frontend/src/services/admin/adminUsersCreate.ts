import { safeRpc } from '@/services/api/safeRpc';
import { createAppError } from '@/services/errors/AppError';
import { UserRole } from '@/types';
import { isRecord } from '@/utils/recordNarrowing';

export type CreateAdminUserPayload = {
  email: string;
  first_name: string;
  last_name: string;
  role?: UserRole;
  agency_ids?: string[];
  password?: string;
};

export type CreateAdminUserResponse = {
  ok: true;
  user_id: string;
  account_state: 'created' | 'existing';
  role: UserRole;
  agency_ids: string[];
  temporary_password?: string;
};

const parseCreateAdminUserResponse = (payload: unknown): CreateAdminUserResponse => {
  if (!isRecord(payload)) {
    throw createAppError({ code: 'EDGE_INVALID_RESPONSE', message: 'Reponse serveur invalide.', source: 'edge' });
  }
  return payload as CreateAdminUserResponse;
};

export const adminUsersCreate = (payload: CreateAdminUserPayload) =>
  safeRpc(
    (api, init) => api.admin.users.$post({
      json: {
      action: 'create',
      ...payload
      }
    }, init),
    parseCreateAdminUserResponse,
    "Impossible de creer l'utilisateur."
  );
