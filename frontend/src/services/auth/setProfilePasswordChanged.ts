import { invokeRpc } from '@/services/api/safeRpc';

const parseVoidResponse = (): void => undefined;

export async function setProfilePasswordChanged(): Promise<void> {
  await invokeRpc(
    (api, init) => api.data.profile.$post({
      json: {
        action: 'password_changed'
      }
    }, init),
    parseVoidResponse
  );
}
