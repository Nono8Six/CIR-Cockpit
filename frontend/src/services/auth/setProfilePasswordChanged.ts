import { dataProfileResponseSchema } from 'shared/schemas/system/api-responses';

import {
  createTrpcResponseParser,
  invokeTrpc
} from '@/services/api/invokeTrpc';

const parseProfileResponse = createTrpcResponseParser(
  dataProfileResponseSchema,
  (): void => undefined
);

export async function setProfilePasswordChanged(): Promise<void> {
  await invokeTrpc(
    (api, options) => api.data.profile.mutate({
        action: 'password_changed'
      }, options),
    parseProfileResponse,
    'Impossible de mettre à jour le profil.'
  );
}
