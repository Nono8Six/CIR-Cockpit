import type { ChangeEvent, RefObject } from 'react';
import type { FieldErrors, UseFormRegisterReturn } from 'react-hook-form';

import type { RelationMode } from '@/constants/relations';
import type { InteractionFormValues } from '@/schemas/interactionSchema';
import type { Entity, EntityContact } from '@/types';

export type CockpitContactCommonProps = {
  labelStyle: string;
  selectedContact: EntityContact | null;
  selectedContactMeta: string;
  onClearSelectedContact: () => void;
};

export type CockpitClientContactProps = CockpitContactCommonProps & {
  errors: FieldErrors<InteractionFormValues>;
  selectedEntity: Entity | null;
  contactSelectValue: string;
  contacts: EntityContact[];
  contactsLoading: boolean;
  onContactSelect: (value: string) => void;
  contactSelectRef: RefObject<HTMLButtonElement | null>;
  onOpenContactDialog: () => void;
};

export type CockpitManualContactProps = CockpitContactCommonProps & {
  errors: FieldErrors<InteractionFormValues>;
  relationMode: RelationMode;
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

export type CockpitContactSectionProps = CockpitClientContactProps &
  CockpitManualContactProps;
