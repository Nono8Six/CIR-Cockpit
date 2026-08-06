import { ResultAsync } from 'neverthrow';

import { dataEntityContactsResponseSchema } from 'shared/schemas/system/api-responses';
import { createTrpcResponseParser } from '@/services/api/invokeTrpc';
import { type AppError } from '@/services/errors/AppError';
import { safeTrpc } from '@/services/api/safeTrpc';

const parseDeleteContactResponse = createTrpcResponseParser(
  dataEntityContactsResponseSchema,
  (): void => undefined
);

export const deleteEntityContact = (contactId: string): ResultAsync<void, AppError> =>
  safeTrpc(
    (api, options) => api.data['entity-contacts'].mutate({
        action: 'delete',
        contact_id: contactId
      }, options),
    parseDeleteContactResponse,
    'Impossible de supprimer le contact.'
  );
