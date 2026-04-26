import { dataEntitiesListResponseSchema } from 'shared/schemas/api-responses';
import { Client } from '@/types';
import { createAppError } from '@/services/errors/AppError';
import { safeTrpc } from '@/services/api/safeTrpc';

export type GetClientsOptions = {
  agencyId?: string | null;
  includeArchived?: boolean;
  orphansOnly?: boolean;
};

const parseClientsResponse = (payload: unknown): Client[] => {
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
