import type { FieldErrors, UseFormRegisterReturn } from 'react-hook-form';

import type { DirectoryCommercialOption } from 'shared/schemas/directory.schema';
import type { ClientCompanyFormValues } from 'shared/schemas/client.schema';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';

type ClientFormIdentitySectionProps = {
  nameField: UseFormRegisterReturn;
  commercials: DirectoryCommercialOption[];
  cirCommercialField: UseFormRegisterReturn;
  cirCommercialValue: ClientCompanyFormValues['cir_commercial_id'];
  errors: FieldErrors<ClientCompanyFormValues>;
};

const EMPTY_COMMERCIAL_VALUE = '__none__';
const buildFieldChangeEvent = (name: string, value: string) => ({
  target: { name, value }
});

const ClientFormIdentitySection = ({
  nameField,
  commercials,
  cirCommercialField,
  cirCommercialValue,
  errors
}: ClientFormIdentitySectionProps) => (
  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
    <div>
      <label className="text-sm font-medium text-foreground" htmlFor="client-name">Nom de la societe</label>
      <Input {...nameField} id="client-name" placeholder="Nom du client" autoComplete="organization" />
      {errors.name && (
        <p className="text-xs text-destructive mt-1">{errors.name.message}</p>
      )}
    </div>
    <div>
      <label className="text-sm font-medium text-foreground" htmlFor="client-commercial">Commercial CIR</label>
      <input
        type="hidden"
        name={cirCommercialField.name}
        ref={cirCommercialField.ref}
        value={cirCommercialValue ?? ''}
        onChange={cirCommercialField.onChange}
        onBlur={cirCommercialField.onBlur}
      />
      <Select
        value={cirCommercialValue ?? EMPTY_COMMERCIAL_VALUE}
        onValueChange={(value) => cirCommercialField.onChange(buildFieldChangeEvent(
          cirCommercialField.name,
          value === EMPTY_COMMERCIAL_VALUE ? '' : value
        ))}
        name={cirCommercialField.name}
      >
        <SelectTrigger
          id="client-commercial"
          onBlur={cirCommercialField.onBlur}
          aria-invalid={Boolean(errors.cir_commercial_id)}
        >
          <SelectValue placeholder="Aucun commercial affecté" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={EMPTY_COMMERCIAL_VALUE}>Aucun commercial affecté</SelectItem>
          {commercials.map((commercial) => (
            <SelectItem key={commercial.id} value={commercial.id}>
              {commercial.display_name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {errors.cir_commercial_id && (
        <p className="text-xs text-destructive mt-1">{errors.cir_commercial_id.message}</p>
      )}
    </div>
  </div>
);

export default ClientFormIdentitySection;
