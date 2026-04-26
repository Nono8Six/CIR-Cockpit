import {
  adminUsersCreateResponseSchema,
  type AdminUsersCreateResponse
} from 'shared/schemas/api-responses';
import { safeTrpc } from '@/services/api/safeTrpc';
import { createAppError } from '@/services/errors/AppError';
import { UserRole } from '@/types';

export type CreateAdminUserPayload = {
  email: string;
  first_name: string;
  last_name: string;
  role?: UserRole;
  agency_ids?: string[];
  password?: string;
};

export type CreateAdminUserResponse = AdminUsersCreateResponse;

const parseCreateAdminUserResponse = (payload: unknown): CreateAdminUserResponse => {
  const parsed = adminUsersCreateResponseSchema.safeParse(payload);
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

export const adminUsersCreate = (payload: CreateAdminUserPayload) =>
  safeTrpc(
    (api, options) => api.admin.users.mutate({
      action: 'create',
      ...payload
      }, options),
    parseCreateAdminUserResponse,
    "Impossible de creer l'utilisateur."
  );
