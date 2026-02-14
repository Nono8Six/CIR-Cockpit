import { safeInvoke } from '@/services/api/client';

const parseVoidResponse = (): void => undefined;

export async function setProfilePasswordChanged(): Promise<void> {
  await safeInvoke('/data/profile', {
    action: 'password_changed'
  }, parseVoidResponse);
}
