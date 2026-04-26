import { ResultAsync } from 'neverthrow';

import { type AppError } from '@/services/errors/AppError';
import { safeTrpc } from '@/services/api/safeTrpc';

const parseVoidResponse = (): void => undefined;

export const deleteEntityContact = (contactId: string): ResultAsync<void, AppError> =>
  safeTrpc(
    (api, options) => api.data['entity-contacts'].mutate({
        action: 'delete',
        contact_id: contactId
      }, options),
    parseVoidResponse,
    'Impossible de supprimer le contact.'
  );
