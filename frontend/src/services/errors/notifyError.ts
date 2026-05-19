import { useErrorStore } from '@/stores/errorStore';
import { AppError } from './AppError';
import { displayErrorToast } from './notify';

const TOAST_DEDUP_WINDOW_MS = 1500;
const recentToastByKey = new Map<string, number>();

/**
 * @description Determines whether a toast should be displayed for a given key by checking recent notifications and applying deduplication.
 * @param {string} key - The deduplication key (e.g., fingerprint or code).
 * @returns {boolean} True if the toast should be displayed, false otherwise.
 */
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

/**
 * @description Adds an error to the global store and triggers a toast notification, with deduplication based on key.
 * @param {AppError} error - The error to notify.
 * @param {string} [fallbackMessage] - Optional fallback error message.
 * @returns {void}
 */
export const notifyError = (error: AppError, fallbackMessage?: string): void => {
  const message = fallbackMessage !== undefined ? fallbackMessage : error.message;
  const dedupKey = error.fingerprint ?? error.code;
  useErrorStore.getState().addError(error);
  if (shouldDisplayToast(dedupKey)) {
    displayErrorToast(message);
  }
};
