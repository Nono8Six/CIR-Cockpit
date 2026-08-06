import { createTrpcResponseParser } from '@/services/api/invokeTrpc';
import { ResultAsync } from 'neverthrow';

import { dataEntitiesResponseSchema } from '../../../../shared/schemas/system/api-responses';
import { Client } from '@/types';
import { type AppError } from '@/services/errors/AppError';
import { safeTrpc } from '@/services/api/safeTrpc';

const parseEntityResponse = createTrpcResponseParser(
  dataEntitiesResponseSchema,
  (response): Client => {
  return response.entity;
},
  { code: 'REQUEST_FAILED', message: 'Réponse serveur invalide.' }
);

/**
 * Supprime un client et éventuellement ses interactions associées.
 *
 * @param {string} clientId - L'identifiant unique du client à supprimer.
 * @param {boolean} deleteRelatedInteractions - Indique s'il faut supprimer les interactions liées.
 * @returns {ResultAsync<Client, AppError>} Le client supprimé sous forme de promesse asynchrone sécurisée.
 */
export const deleteClient = (
  clientId: string,
  deleteRelatedInteractions: boolean
): ResultAsync<Client, AppError> =>
  safeTrpc(
    (api, options) => api.data.entities.mutate({
        action: 'delete',
        entity_id: clientId,
        delete_related_interactions: deleteRelatedInteractions
      }, options),
    parseEntityResponse,
    'Impossible de supprimer le client.'
  );
