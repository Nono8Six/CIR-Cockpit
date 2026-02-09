import type { ChangeEvent } from 'react';
import type { UseFormRegisterReturn } from 'react-hook-form';

import { Input } from '@/components/ui/input';
import CockpitFieldError from './CockpitFieldError';

type CockpitCompanyCityFieldProps = {
  field: UseFormRegisterReturn;
  value: string;
  error?: string;
};

const CockpitCompanyCityField = ({
  field,
  value,
  error
}: CockpitCompanyCityFieldProps) => (
  <div>
    <Input
      type="text"
      {...field}
      value={value}
      onChange={(event: ChangeEvent<HTMLInputElement>) => field.onChange(event)}
      placeholder="Ville…"
      aria-label="Ville"
      autoComplete="address-level2"
    />
    <CockpitFieldError message={error} />
  </div>
);

export default CockpitCompanyCityField;
