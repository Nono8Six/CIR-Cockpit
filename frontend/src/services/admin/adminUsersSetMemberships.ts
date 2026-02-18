import { safeRpc } from '@/services/api/safeRpc';
import { createAppError } from '@/services/errors/AppError';
import { isRecord } from '@/utils/recordNarrowing';

export type MembershipMode = 'replace' | 'add' | 'remove';

export type SetUserMembershipsResponse = {
  ok: true;
  user_id: string;
  agency_ids: string[];
  membership_mode: MembershipMode;
};

const parseSetUserMembershipsResponse = (payload: unknown): SetUserMembershipsResponse => {
  if (!isRecord(payload)) {
    throw createAppError({ code: 'EDGE_INVALID_RESPONSE', message: 'Reponse serveur invalide.', source: 'edge' });
  }
  return payload as SetUserMembershipsResponse;
};

export const adminUsersSetMemberships = (
  userId: string,
  agencyIds: string[],
  mode: MembershipMode = 'replace'
) =>
  safeRpc(
    (api, init) => api.admin.users.$post({
      json: {
      action: 'set_memberships',
      user_id: userId,
      agency_ids: agencyIds,
      mode
      }
    }, init),
    parseSetUserMembershipsResponse,
    "Impossible de mettre a jour les agences."
  );
