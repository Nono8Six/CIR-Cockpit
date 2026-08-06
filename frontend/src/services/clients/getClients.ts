import { createTrpcResponseParser } from '@/services/api/invokeTrpc';
import { dataEntitiesListResponseSchema } from '../../../../shared/schemas/system/api-responses';
import { Client } from '@/types';
import { safeTrpc } from '@/services/api/safeTrpc';

export type GetClientsOptions = {
  agencyId?: string | null;
  includeArchived?: boolean;
  orphansOnly?: boolean;
};

const parseClientsResponse = createTrpcResponseParser(
  dataEntitiesListResponseSchema,
  (response): Client[] => {
  return response.entities;
},
  { code: 'REQUEST_FAILED', message: 'Réponse serveur invalide.' }
);

export const getClients = async (options: GetClientsOptions = {}): Promise<Client[]> => {
  const { agencyId, includeArchived = false, orphansOnly = false } = options;

  return safeTrpc(
    (api, options) => api.data.entities.mutate({
        action: 'list',
        entity_type: 'Client',
        agency_id: agencyId ?? null,
        include_archived: includeArchived,
        orphans_only: orphansOnly
      }, options),
    parseClientsResponse,
    'Impossible de charger les clients.'
  ).match(
    (clients) => clients,
    (error) => {
      throw error;
    }
  );
};
