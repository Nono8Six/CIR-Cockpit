import { dataEntitiesListResponseSchema } from 'shared/schemas/api-responses';

import { Entity } from '@/types';
import { safeTrpc } from '@/services/api/safeTrpc';
import { createAppError } from '@/services/errors/AppError';

export type GetProspectsOptions = {
  agencyId?: string | null;
  includeArchived?: boolean;
  orphansOnly?: boolean;
};

const parseProspectsResponse = (payload: unknown): Entity[] => {
  const parsed = dataEntitiesListResponseSchema.safeParse(payload);
  if (!parsed.success) {
    throw createAppError({
      code: 'REQUEST_FAILED',
      message: 'Reponse serveur invalide.',
      source: 'edge',
      details: parsed.error.message
    });
  }

  return parsed.data.entities;
};

export const getProspects = async (options: GetProspectsOptions = {}): Promise<Entity[]> => {
  const { agencyId, includeArchived = false, orphansOnly = false } = options;

  return safeTrpc(
    (api, options) => api.data.entities.mutate({
        action: 'list',
        entity_type: 'Prospect',
        agency_id: agencyId ?? null,
        include_archived: includeArchived,
        orphans_only: orphansOnly
      }, options),
    parseProspectsResponse,
    'Impossible de charger les prospects.'
  ).match(
    (prospects) => prospects,
    (error) => {
      throw error;
    }
  );
};
