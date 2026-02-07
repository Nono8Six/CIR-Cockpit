import { useCallback, type RefObject } from 'react';

import type { Entity } from '@/types';

type InteractionFocusInput = {
  currentStepIndex: number;
  isClientRelation: boolean;
  selectedEntity: Entity | null;
  channelButtonRef: RefObject<HTMLButtonElement | null>;
  relationButtonRef: RefObject<HTMLButtonElement | null>;
  interactionTypeRef: RefObject<HTMLButtonElement | null>;
  companyInputRef: RefObject<HTMLInputElement | null>;
  contactFirstNameInputRef: RefObject<HTMLInputElement | null>;
  contactSelectRef: RefObject<HTMLButtonElement | null>;
  searchInputRef: RefObject<HTMLInputElement | null>;
  formRef: RefObject<HTMLFormElement | null>;
};

export const useInteractionFocus = ({
  currentStepIndex,
  isClientRelation,
  selectedEntity,
  channelButtonRef,
  relationButtonRef,
  interactionTypeRef,
  companyInputRef,
  contactFirstNameInputRef,
  contactSelectRef,
  searchInputRef,
  formRef
}: InteractionFocusInput) =>
  useCallback(() => {
    switch (currentStepIndex) {
      case 0:
        channelButtonRef.current?.focus();
        break;
      case 1:
        relationButtonRef.current?.focus();
        break;
      case 2:
        if (searchInputRef.current) {
          searchInputRef.current.focus();
        } else {
          companyInputRef.current?.focus();
        }
        break;
      case 3:
        if (isClientRelation) {
          if (selectedEntity) {
            contactSelectRef.current?.focus();
          } else {
            searchInputRef.current?.focus();
          }
        } else {
          contactFirstNameInputRef.current?.focus();
        }
        break;
      case 4:
        interactionTypeRef.current?.focus();
        break;
      default:
        formRef.current?.requestSubmit();
        break;
    }
  }, [
    channelButtonRef,
    companyInputRef,
    contactFirstNameInputRef,
    contactSelectRef,
    currentStepIndex,
    formRef,
    interactionTypeRef,
    isClientRelation,
    relationButtonRef,
    searchInputRef,
    selectedEntity
  ]);
