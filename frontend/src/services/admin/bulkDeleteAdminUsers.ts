import {
  adminUsersBulkDeleteResponseSchema,
  type AdminUsersBulkDeleteResponse
} from '../../../../shared/schemas/system/api-responses';
import { safeTrpc } from '@/services/api/safeTrpc';
import { createAppError } from '@/services/errors/AppError';

export type BulkDeleteUsersResponse = AdminUsersBulkDeleteResponse;

const parseBulkDeleteUsersResponse = (payload: unknown): BulkDeleteUsersResponse => {
  const parsed = adminUsersBulkDeleteResponseSchema.safeParse(payload);
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

export const bulkDeleteAdminUsers = (userIds: string[]) =>
  safeTrpc(
    (api, options) => api.admin.users.mutate({
      action: 'bulk_delete',
      user_ids: userIds
    }, options),
    parseBulkDeleteUsersResponse,
    'Impossible de supprimer les utilisateurs selectionnes.'
  );
