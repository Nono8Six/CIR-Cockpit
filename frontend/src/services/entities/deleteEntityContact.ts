import { ResultAsync } from 'neverthrow';

import { type AppError } from '@/services/errors/AppError';
import { safeRpc } from '@/services/api/safeRpc';

const parseVoidResponse = (): void => undefined;

export const deleteEntityContact = (contactId: string): ResultAsync<void, AppError> =>
  safeRpc(
    (api, init) => api.data['entity-contacts'].$post({
      json: {
        action: 'delete',
        contact_id: contactId
      }
    }, init),
    parseVoidResponse,
    'Impossible de supprimer le contact.'
  );
