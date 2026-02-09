import type { ChangeEvent } from 'react';
import type { UseFormRegisterReturn } from 'react-hook-form';

import { Input } from '@/components/ui/input';
import CockpitFieldError from './CockpitFieldError';

type CockpitContactPhoneEmailFieldsProps = {
  phoneField: UseFormRegisterReturn;
  emailField: UseFormRegisterReturn;
  phone: string;
  email: string;
  onPhoneChange: (event: ChangeEvent<HTMLInputElement>) => void;
  phoneError?: string;
  emailError?: string;
};

const CockpitContactPhoneEmailFields = ({
  phoneField,
  emailField,
  phone,
  email,
  onPhoneChange,
  phoneError,
  emailError
}: CockpitContactPhoneEmailFieldsProps) => (
  <>
    <div className="grid grid-cols-2 gap-2">
      <Input
        type="tel"
        {...phoneField}
        value={phone}
        onChange={onPhoneChange}
        className="font-mono text-slate-600"
        placeholder="06…"
        aria-label="Telephone"
        autoComplete="tel"
      />
      <Input
        type="email"
        {...emailField}
        value={email}
        onChange={(event) => emailField.onChange(event)}
        placeholder="Email…"
        aria-label="Email"
        autoComplete="email"
        spellCheck={false}
      />
    </div>
    <CockpitFieldError message={phoneError ?? emailError} />
  </>
);

export default CockpitContactPhoneEmailFields;
