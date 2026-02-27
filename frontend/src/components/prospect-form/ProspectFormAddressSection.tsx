import type { ChangeEvent } from 'react';
import type { FieldErrors, UseFormRegisterReturn } from 'react-hook-form';

import type { ProspectFormValues } from '../../../../shared/schemas/prospect.schema';
import { Input } from '@/components/ui/input';

type ProspectFormAddressSectionProps = {
  addressField: UseFormRegisterReturn;
  postalCodeField: UseFormRegisterReturn;
  postalCode: string;
  onPostalCodeChange: (event: ChangeEvent<HTMLInputElement>) => void;
  errors: FieldErrors<ProspectFormValues>;
};

const ProspectFormAddressSection = ({
  addressField,
  postalCodeField,
  postalCode,
  onPostalCodeChange,
  errors
}: ProspectFormAddressSectionProps) => (
  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
    <div>
      <label className="text-xs font-medium text-muted-foreground" htmlFor="prospect-address">Adresse</label>
      <Input {...addressField} id="prospect-address" placeholder="Adresse" autoComplete="street-address" />
    </div>
    <div>
      <label className="text-xs font-medium text-muted-foreground" htmlFor="prospect-postal-code">Code postal</label>
      <Input
        {...postalCodeField}
        id="prospect-postal-code"
        value={postalCode}
        onChange={onPostalCodeChange}
        placeholder="33000"
        autoComplete="postal-code"
        inputMode="numeric"
      />
      {errors.postal_code && (
        <p className="text-xs text-destructive mt-1">{errors.postal_code.message}</p>
      )}
    </div>
  </div>
);

export default ProspectFormAddressSection;
