import { safeRpc } from '@/services/api/safeRpc';
import { createAppError } from '@/services/errors/AppError';
import { isRecord } from '@/utils/recordNarrowing';

export type UpdateUserIdentityPayload = {
  user_id: string;
  email: string;
  first_name: string;
  last_name: string;
};

export type UpdateUserIdentityResponse = {
  ok: true;
  user_id: string;
  email: string;
  first_name: string;
  last_name: string;
  display_name?: string;
};

const parseUpdateUserIdentityResponse = (payload: unknown): UpdateUserIdentityResponse => {
  if (!isRecord(payload)) {
    throw createAppError({ code: 'EDGE_INVALID_RESPONSE', message: 'Reponse serveur invalide.', source: 'edge' });
  }
  return payload as UpdateUserIdentityResponse;
};

export const adminUsersUpdateIdentity = (payload: UpdateUserIdentityPayload) =>
  safeRpc(
    (api, init) => api.admin.users.$post({
      json: {
      action: 'update_identity',
      ...payload
      }
    }, init),
    parseUpdateUserIdentityResponse,
    "Impossible de mettre a jour l'identite de l'utilisateur."
  );
