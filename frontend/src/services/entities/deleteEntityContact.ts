import { ResultAsync } from 'neverthrow';

import { safeApiCall } from '@/lib/result';
import { type AppError } from '@/services/errors/AppError';
import { safeInvoke } from '@/services/api/client';

const parseVoidResponse = (): void => undefined;

export const deleteEntityContact = (contactId: string): ResultAsync<void, AppError> =>
  safeApiCall(
    safeInvoke('/data/entity-contacts', {
      action: 'delete',
      contact_id: contactId
    }, parseVoidResponse),
    'Impossible de supprimer le contact.'
  );
