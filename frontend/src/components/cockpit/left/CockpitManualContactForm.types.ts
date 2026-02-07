import type { ChangeEvent, RefObject } from 'react';
import type { FieldErrors, UseFormRegisterReturn } from 'react-hook-form';

import type { InteractionFormValues } from '@/schemas/interactionSchema';

export type CockpitManualContactFormProps = {
  errors: FieldErrors<InteractionFormValues>;
  isSolicitationRelation: boolean;
  isSupplierRelation: boolean;
  isInternalRelation: boolean;
  contactFirstNameField: UseFormRegisterReturn;
  contactLastNameField: UseFormRegisterReturn;
  contactPositionField: UseFormRegisterReturn;
  contactPhoneField: UseFormRegisterReturn;
  contactEmailField: UseFormRegisterReturn;
  contactFirstNameInputRef: RefObject<HTMLInputElement | null>;
  contactFirstName: string;
  contactLastName: string;
  contactPhone: string;
  contactEmail: string;
  onContactFirstNameChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onContactLastNameChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onContactPhoneChange: (event: ChangeEvent<HTMLInputElement>) => void;
};
