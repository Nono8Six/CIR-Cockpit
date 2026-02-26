import {
  adminUsersSetMembershipsResponseSchema,
  type AdminUsersSetMembershipsResponse
} from '../../../../shared/schemas/api-responses';
import { safeRpc } from '@/services/api/safeRpc';
import { createAppError } from '@/services/errors/AppError';

export type MembershipMode = 'replace' | 'add' | 'remove';

export type SetUserMembershipsResponse = AdminUsersSetMembershipsResponse;

const parseSetUserMembershipsResponse = (payload: unknown): SetUserMembershipsResponse => {
  const parsed = adminUsersSetMembershipsResponseSchema.safeParse(payload);
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
