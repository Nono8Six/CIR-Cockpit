import type { ChangeEvent } from 'react';
import type { FieldErrors, UseFormRegisterReturn } from 'react-hook-form';

import type { ClientFormValues } from '../../../../shared/schemas/client.schema';
import { Input } from '@/components/ui/input';

type ClientFormCodesSectionProps = {
  postalCodeField: UseFormRegisterReturn;
  postalCode: string;
  onPostalCodeChange: (event: ChangeEvent<HTMLInputElement>) => void;
  siretField: UseFormRegisterReturn;
  errors: FieldErrors<ClientFormValues>;
};

const ClientFormCodesSection = ({
  postalCodeField,
  postalCode,
  onPostalCodeChange,
  siretField,
  errors
}: ClientFormCodesSectionProps) => (
  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
    <div>
      <label className="text-xs font-medium text-muted-foreground" htmlFor="client-postal-code">Code postal</label>
      <Input
        {...postalCodeField}
        id="client-postal-code"
        value={postalCode}
        onChange={onPostalCodeChange}
        placeholder="33300"
        autoComplete="postal-code"
        inputMode="numeric"
      />
      {errors.postal_code && (
        <p className="text-xs text-destructive mt-1">{errors.postal_code.message}</p>
      )}
    </div>
    <div>
      <label className="text-xs font-medium text-muted-foreground" htmlFor="client-siret">SIRET (optionnel)</label>
      <Input {...siretField} id="client-siret" placeholder="SIRET" inputMode="numeric" />
    </div>
  </div>
);

export default ClientFormCodesSection;
