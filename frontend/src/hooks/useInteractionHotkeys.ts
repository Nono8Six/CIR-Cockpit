import { useEffect, type RefObject } from 'react';
import type { UseFormSetFocus } from 'react-hook-form';

import type { InteractionFormValues } from '@/schemas/interactionSchema';

type InteractionHotkeysInput = {
  formRef: RefObject<HTMLFormElement | null>;
  searchInputRef: RefObject<HTMLInputElement | null>;
  setFocus: UseFormSetFocus<InteractionFormValues>;
};

export const useInteractionHotkeys = ({ formRef, searchInputRef, setFocus }: InteractionHotkeysInput) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === 'Enter') {
        e.preventDefault();
        formRef.current?.requestSubmit();
      }
      if (e.key === 'F1') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
      if (e.key === 'F2') {
        e.preventDefault();
        setFocus('subject');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [formRef, searchInputRef, setFocus]);
};
