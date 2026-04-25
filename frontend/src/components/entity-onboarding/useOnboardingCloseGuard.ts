import { useCallback, useEffect, type Dispatch, type SetStateAction } from 'react';

export interface OnboardingCloseGuardInput {
  open: boolean;
  isSaving: boolean;
  hasUnsavedProgress: boolean;
  onOpenChange: (open: boolean) => void;
  setIsCloseConfirmOpen: Dispatch<SetStateAction<boolean>>;
}

export interface OnboardingCloseGuardState {
  confirmClose: () => void;
  requestClose: () => void;
  handleDialogOpenChange: (nextOpen: boolean) => void;
}

export const useOnboardingCloseGuard = ({
  open,
  isSaving,
  hasUnsavedProgress,
  onOpenChange,
  setIsCloseConfirmOpen,
}: OnboardingCloseGuardInput): OnboardingCloseGuardState => {
  useEffect(() => {
    if (!open || !hasUnsavedProgress) {
      return;
    }

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedProgress, open]);

  const confirmClose = useCallback(() => {
    setIsCloseConfirmOpen(false);
    onOpenChange(false);
  }, [onOpenChange, setIsCloseConfirmOpen]);

  const requestClose = useCallback(() => {
    if (isSaving) {
      return;
    }

    if (hasUnsavedProgress) {
      setIsCloseConfirmOpen(true);
      return;
    }

    onOpenChange(false);
  }, [hasUnsavedProgress, isSaving, onOpenChange, setIsCloseConfirmOpen]);

  const handleDialogOpenChange = useCallback(
    (nextOpen: boolean) => {
      if (nextOpen) {
        onOpenChange(nextOpen);
        return;
      }

      requestClose();
    },
    [onOpenChange, requestClose],
  );

  return {
    confirmClose,
    requestClose,
    handleDialogOpenChange,
  };
};
