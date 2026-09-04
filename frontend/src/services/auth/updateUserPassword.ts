import { dataProfileResponseSchema } from 'shared/schemas/system/api-responses';

import { createTrpcResponseParser, invokeTrpc } from '@/services/api/invokeTrpc';

const parseProfileResponse = createTrpcResponseParser(
  dataProfileResponseSchema,
  (): void => undefined
);

export async function updateUserPassword(newPassword: string): Promise<void> {
  await invokeTrpc(
    (api, options) => api.data.changePassword.mutate({ password: newPassword }, options),
    parseProfileResponse,
    'Impossible de changer le mot de passe.'
  );
}
