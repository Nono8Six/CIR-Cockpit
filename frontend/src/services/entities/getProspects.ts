import { createTrpcResponseParser } from '@/services/api/invokeTrpc';
import { dataEntitiesListResponseSchema } from '../../../../shared/schemas/system/api-responses';

import { Entity } from '@/types';
import { safeTrpc } from '@/services/api/safeTrpc';

export type GetProspectsOptions = {
  agencyId?: string | null;
  includeArchived?: boolean;
  orphansOnly?: boolean;
};

const parseProspectsResponse = createTrpcResponseParser(
  dataEntitiesListResponseSchema,
  (response): Entity[] => {
  return response.entities;
},
  { code: 'REQUEST_FAILED', message: 'Réponse serveur invalide.' }
);

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
