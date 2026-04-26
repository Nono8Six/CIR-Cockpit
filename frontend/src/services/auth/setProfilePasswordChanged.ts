import { invokeTrpc } from '@/services/api/safeTrpc';

const parseVoidResponse = (): void => undefined;

export async function setProfilePasswordChanged(): Promise<void> {
  await invokeTrpc(
    (api, options) => api.data.profile.mutate({
        action: 'password_changed'
      }, options),
    parseVoidResponse,
    'Impossible de mettre a jour le profil.'
  );
}
