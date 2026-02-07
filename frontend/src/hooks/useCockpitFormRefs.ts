import { useRef } from 'react';

export const useCockpitFormRefs = () => {
  const formRef = useRef<HTMLFormElement | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const channelButtonRef = useRef<HTMLButtonElement | null>(null);
  const relationButtonRef = useRef<HTMLButtonElement | null>(null);
  const interactionTypeRef = useRef<HTMLButtonElement | null>(null);
  const companyInputRef = useRef<HTMLInputElement | null>(null);
  const contactFirstNameInputRef = useRef<HTMLInputElement | null>(null);
  const contactSelectRef = useRef<HTMLButtonElement | null>(null);

  return {
    formRef,
    searchInputRef,
    channelButtonRef,
    relationButtonRef,
    interactionTypeRef,
    companyInputRef,
    contactFirstNameInputRef,
    contactSelectRef
  };
};
