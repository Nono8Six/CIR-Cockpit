import type { FieldErrors, UseFormRegisterReturn } from 'react-hook-form';

import type { ClientFormValues } from '../../../../shared/schemas/client.schema';
import { Input } from '@/components/ui/input';

type ClientFormAddressSectionProps = {
  addressField: UseFormRegisterReturn;
  cityField: UseFormRegisterReturn;
  errors: FieldErrors<ClientFormValues>;
};

const ClientFormAddressSection = ({
  addressField,
  cityField,
  errors
}: ClientFormAddressSectionProps) => (
  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
    <div>
      <label className="text-xs font-medium text-muted-foreground" htmlFor="client-address">Adresse</label>
      <Input {...addressField} id="client-address" placeholder="Adresse" autoComplete="street-address" />
      {errors.address && (
        <p className="text-xs text-destructive mt-1">{errors.address.message}</p>
      )}
    </div>
    <div>
      <label className="text-xs font-medium text-muted-foreground" htmlFor="client-city">Ville</label>
      <Input {...cityField} id="client-city" placeholder="Ville" autoComplete="address-level2" />
      {errors.city && (
        <p className="text-xs text-destructive mt-1">{errors.city.message}</p>
      )}
    </div>
  </div>
);

export default ClientFormAddressSection;
