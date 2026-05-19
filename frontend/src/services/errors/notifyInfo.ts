import { toast } from 'sonner';

/**
 * @description Displays an info toast notification with the given message.
 * @param {string} message - The message to display.
 * @returns {void}
 */
export const notifyInfo = (message: string): void => {
  toast.info(message);
};
