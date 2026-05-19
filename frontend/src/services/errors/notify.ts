import { toast } from 'sonner';

export const displayErrorToast = (message: string): void => {
  toast.error(message);
};
