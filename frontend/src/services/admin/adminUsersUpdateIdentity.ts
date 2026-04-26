import {
  adminUsersUpdateIdentityResponseSchema,
  type AdminUsersUpdateIdentityResponse
} from 'shared/schemas/api-responses';
import { safeTrpc } from '@/services/api/safeTrpc';
import { createAppError } from '@/services/errors/AppError';

export type UpdateUserIdentityPayload = {
  user_id: string;
  email: string;
  first_name: string;
  last_name: string;
};

export type UpdateUserIdentityResponse = AdminUsersUpdateIdentityResponse;

const parseUpdateUserIdentityResponse = (payload: unknown): UpdateUserIdentityResponse => {
  const parsed = adminUsersUpdateIdentityResponseSchema.safeParse(payload);
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

export const adminUsersUpdateIdentity = (payload: UpdateUserIdentityPayload) =>
  safeTrpc(
    (api, options) => api.admin.users.mutate({
      action: 'update_identity',
      ...payload
      }, options),
    parseUpdateUserIdentityResponse,
    "Impossible de mettre a jour l'identite de l'utilisateur."
  );
