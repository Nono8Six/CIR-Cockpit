import type { ChangeEvent } from 'react';
import type { UseFormRegisterReturn } from 'react-hook-form';

import { Input } from '@/components/ui/input';
import CockpitFieldError from './CockpitFieldError';

type CockpitContactPhoneFieldProps = {
  phoneField: UseFormRegisterReturn;
  phone: string;
  onPhoneChange: (event: ChangeEvent<HTMLInputElement>) => void;
  phoneError?: string;
};

const CockpitContactPhoneField = ({
  phoneField,
  phone,
  onPhoneChange,
  phoneError
}: CockpitContactPhoneFieldProps) => (
  <>
    <Input
      type="tel"
      {...phoneField}
      value={phone}
      onChange={onPhoneChange}
      className="font-mono text-slate-600"
      placeholder="Numero de telephone\u2026"
      aria-label="Telephone"
      autoComplete="tel"
    />
    <CockpitFieldError message={phoneError} />
  </>
);

export default CockpitContactPhoneField;
