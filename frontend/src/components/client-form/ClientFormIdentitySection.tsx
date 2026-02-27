import type { FieldErrors, UseFormRegisterReturn } from 'react-hook-form';

import type { ClientFormValues } from '../../../../shared/schemas/client.schema';
import { Input } from '@/components/ui/input';

type ClientFormIdentitySectionProps = {
  nameField: UseFormRegisterReturn;
  errors: FieldErrors<ClientFormValues>;
};

const ClientFormIdentitySection = ({
  nameField,
  errors
}: ClientFormIdentitySectionProps) => (
  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
    <div>
      <label className="text-xs font-medium text-muted-foreground" htmlFor="client-name">Nom de la societe</label>
      <Input {...nameField} id="client-name" placeholder="Nom du client" autoComplete="organization" />
      {errors.name && (
        <p className="text-xs text-destructive mt-1">{errors.name.message}</p>
      )}
    </div>
  </div>
);

export default ClientFormIdentitySection;
