import { useCallback, type RefObject } from 'react';
import type { FieldErrors, UseFormSetFocus } from 'react-hook-form';

import type { InteractionFormValues } from '@/schemas/interactionSchema';

type InteractionInvalidHandlerInput = {
  setFocus: UseFormSetFocus<InteractionFormValues>;
  searchInputRef: RefObject<HTMLInputElement | null>;
  contactSelectRef: RefObject<HTMLButtonElement | null>;
  statusTriggerRef: RefObject<HTMLButtonElement | null>;
};

export const useInteractionInvalidHandler = ({
  setFocus,
  searchInputRef,
  contactSelectRef,
  statusTriggerRef
}: InteractionInvalidHandlerInput) =>
  useCallback(
    (formErrors: FieldErrors<InteractionFormValues>) => {
      if (formErrors.entity_id) {
        searchInputRef.current?.focus();
        return;
      }
      if (formErrors.contact_id) {
        contactSelectRef.current?.focus();
        return;
      }
      if (formErrors.company_name) {
        setFocus('company_name');
        return;
      }
      if (formErrors.company_city) {
        setFocus('company_city');
        return;
      }
      if (formErrors.contact_first_name) {
        setFocus('contact_first_name');
        return;
      }
      if (formErrors.contact_last_name) {
        setFocus('contact_last_name');
        return;
      }
      if (formErrors.contact_position) {
        setFocus('contact_position');
        return;
      }
      if (formErrors.contact_phone || formErrors.contact_email) {
        setFocus('contact_phone');
        return;
      }
      if (formErrors.subject) {
        setFocus('subject');
        return;
      }
      if (formErrors.entity_type) {
        setFocus('entity_type');
        return;
      }
      if (formErrors.interaction_type) {
        setFocus('interaction_type');
        return;
      }
      if (formErrors.contact_service) {
        setFocus('contact_service');
        return;
      }
      if (formErrors.status_id) {
        statusTriggerRef.current?.focus();
      }
    },
    [contactSelectRef, searchInputRef, setFocus, statusTriggerRef]
  );
