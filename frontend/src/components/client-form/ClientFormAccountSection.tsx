import type { ChangeEvent } from 'react';
import type { FieldErrors, UseFormRegisterReturn } from 'react-hook-form';

import type { ClientFormValues } from '../../../../shared/schemas/client.schema';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { formatClientNumber } from '@/utils/clients/formatClientNumber';

type ClientFormAccountSectionProps = {
  clientNumberField: UseFormRegisterReturn;
  clientNumber: string;
  onClientNumberChange: (event: ChangeEvent<HTMLInputElement>) => void;
  accountTypeField: UseFormRegisterReturn;
  accountType: string;
  errors: FieldErrors<ClientFormValues>;
};

const buildFieldChangeEvent = (name: string, value: string) => ({
  target: { name, value }
});

const ClientFormAccountSection = ({
  clientNumberField,
  clientNumber,
  onClientNumberChange,
  accountTypeField,
  accountType,
  errors
}: ClientFormAccountSectionProps) => (
  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
    <div>
      <label className="text-xs font-medium text-muted-foreground" htmlFor="client-number">Numero de compte</label>
      <Input
        {...clientNumberField}
        id="client-number"
        value={formatClientNumber(clientNumber)}
        onChange={onClientNumberChange}
        placeholder="Ex: 000123"
        inputMode="numeric"
      />
      {errors.client_number && (
        <p className="text-xs text-destructive mt-1">{errors.client_number.message}</p>
      )}
    </div>
    <div>
      <label className="text-xs font-medium text-muted-foreground" htmlFor="client-account-type">Type de compte</label>
      <input
        type="hidden"
        name={accountTypeField.name}
        ref={accountTypeField.ref}
        value={accountType}
        onChange={accountTypeField.onChange}
        onBlur={accountTypeField.onBlur}
      />
      <Select
        value={accountType}
        onValueChange={(value) => accountTypeField.onChange(buildFieldChangeEvent(accountTypeField.name, value))}
        name={accountTypeField.name}
      >
        <SelectTrigger
          id="client-account-type"
          onBlur={accountTypeField.onBlur}
          aria-invalid={Boolean(errors.account_type)}
        >
          <SelectValue placeholder="Selectionner un type de compte" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="term">Compte a terme</SelectItem>
          <SelectItem value="cash">Comptant</SelectItem>
        </SelectContent>
      </Select>
      {errors.account_type && (
        <p className="text-xs text-destructive mt-1">{errors.account_type.message}</p>
      )}
    </div>
  </div>
);

export default ClientFormAccountSection;
