import { toast } from 'sonner';

/**
 * @description Displays a success toast notification with the given message.
 * @param {string} message - The message to display.
 * @returns {void}
 */
export const notifySuccess = (message: string): void => {
  toast.success(message);
};
