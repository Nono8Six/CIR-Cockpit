import type { ChangeEvent } from 'react';
import type { UseFormRegisterReturn } from 'react-hook-form';

import { Input } from '../../ui/inputs/basic/Input';
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
  <div className="px-5 py-4 bg-card focus-within:bg-surface-1/30 transition-all duration-150 relative">
    <label className="text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground select-none block mb-1.5" htmlFor="company-city-input">
      Ville *
    </label>
    <Input
      id="company-city-input"
      type="text"
      {...field}
      value={value}
      onChange={(event: ChangeEvent<HTMLInputElement>) => field.onChange(event)}
      placeholder="Ville…"
      className="h-9 w-full min-w-0 text-[13px] font-semibold border-none bg-transparent p-0 shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-none mt-1 placeholder:text-muted-foreground/75 text-foreground"
      aria-label="Ville"
      autoComplete="address-level2"
    />
    <CockpitFieldError message={error} />
  </div>
);

export default CockpitCompanyCityField;
