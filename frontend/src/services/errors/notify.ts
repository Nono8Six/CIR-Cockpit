import { toast } from 'sonner';

import { useErrorStore } from '@/stores/errorStore';
import { AppError } from './AppError';

const TOAST_DEDUP_WINDOW_MS = 1500;
const recentToastByKey = new Map<string, number>();

const shouldDisplayToast = (key: string): boolean => {
  const now = Date.now();
  const lastSeen = recentToastByKey.get(key);
  recentToastByKey.set(key, now);

  for (const [storedKey, ts] of recentToastByKey.entries()) {
    if (now - ts > TOAST_DEDUP_WINDOW_MS) {
      recentToastByKey.delete(storedKey);
    }
  }

  return lastSeen === undefined || now - lastSeen > TOAST_DEDUP_WINDOW_MS;
};

export const notifySuccess = (message: string): void => {
  toast.success(message);
};

export const notifyInfo = (message: string): void => {
  toast.info(message);
};

export const notifyError = (error: AppError, fallbackMessage?: string): void => {
  const message = fallbackMessage !== undefined ? fallbackMessage : error.message;
  const dedupKey = error.fingerprint ?? error.code;
  useErrorStore.getState().addError(error);
  if (shouldDisplayToast(dedupKey)) {
    toast.error(message);
  }
};
