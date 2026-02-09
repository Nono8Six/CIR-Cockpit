import type { ChangeEvent, RefObject } from 'react';
import type { UseFormRegisterReturn } from 'react-hook-form';

import { Input } from '@/components/ui/input';
import CockpitFieldError from './CockpitFieldError';

type CockpitContactNameFieldsProps = {
  firstNameField: UseFormRegisterReturn;
  lastNameField: UseFormRegisterReturn;
  firstNameInputRef: RefObject<HTMLInputElement | null>;
  firstName: string;
  lastName: string;
  onFirstNameChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onLastNameChange: (event: ChangeEvent<HTMLInputElement>) => void;
  firstNameError?: string;
  lastNameError?: string;
};

const CockpitContactNameFields = ({
  firstNameField,
  lastNameField,
  firstNameInputRef,
  firstName,
  lastName,
  onFirstNameChange,
  onLastNameChange,
  firstNameError,
  lastNameError
}: CockpitContactNameFieldsProps) => (
  <div className="grid grid-cols-2 gap-2">
    <div>
      <Input
        type="text"
        {...firstNameField}
        ref={(node) => {
          firstNameField.ref(node);
          firstNameInputRef.current = node;
        }}
        value={firstName}
        onChange={onFirstNameChange}
        placeholder="Prenom…"
        aria-label="Prenom"
        autoComplete="given-name"
      />
      <CockpitFieldError message={firstNameError} />
    </div>
    <div>
      <Input
        type="text"
        {...lastNameField}
        value={lastName}
        onChange={onLastNameChange}
        placeholder="Nom…"
        aria-label="Nom"
        autoComplete="family-name"
      />
      <CockpitFieldError message={lastNameError} />
    </div>
  </div>
);

export default CockpitContactNameFields;
