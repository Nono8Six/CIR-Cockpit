import { createTrpcResponseParser } from '@/services/api/invokeTrpc';
import {
  adminUsersListResponseSchema,
  type AdminUserMembership,
  type AdminUserSummary
} from '../../../../shared/schemas/system/api-responses';

import { invokeTrpc } from '@/services/api/invokeTrpc';

export type { AdminUserMembership, AdminUserSummary };

const parseAdminUsersResponse = createTrpcResponseParser(
  adminUsersListResponseSchema,
  (response): AdminUserSummary[] => {
  return response.users;
},
  { code: 'EDGE_INVALID_RESPONSE', message: 'Réponse serveur invalide.' }
);

export const getAdminUsers = (): Promise<AdminUserSummary[]> =>
  invokeTrpc(
    (api, options) => api.admin['users-list'].query({}, options),
    parseAdminUsersResponse,
    'Impossible de charger les utilisateurs.'
  );
