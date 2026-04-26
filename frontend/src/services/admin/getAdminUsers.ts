import {
  adminUsersListResponseSchema,
  type AdminUserMembership,
  type AdminUserSummary
} from 'shared/schemas/api-responses';

import { invokeTrpc } from '@/services/api/safeTrpc';
import { createAppError } from '@/services/errors/AppError';

export type { AdminUserMembership, AdminUserSummary };

const parseAdminUsersResponse = (payload: unknown): AdminUserSummary[] => {
  const parsed = adminUsersListResponseSchema.safeParse(payload);
  if (!parsed.success) {
    throw createAppError({
      code: 'EDGE_INVALID_RESPONSE',
      message: 'Reponse serveur invalide.',
      source: 'edge',
      details: parsed.error.message
    });
  }

  return parsed.data.users;
};

export const getAdminUsers = (): Promise<AdminUserSummary[]> =>
  invokeTrpc(
    (api, options) => api.admin['users-list'].query({}, options),
    parseAdminUsersResponse,
    'Impossible de charger les utilisateurs.'
  );
