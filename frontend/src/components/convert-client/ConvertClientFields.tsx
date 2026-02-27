import type { ChangeEvent } from 'react';
import type { FieldErrors, UseFormRegisterReturn } from 'react-hook-form';

import type { ConvertClientValues } from '../../../../shared/schemas/convert-client.schema';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';

type ConvertClientFieldsProps = {
  clientNumber: string;
  accountType: ConvertClientValues['account_type'];
  clientNumberField: UseFormRegisterReturn<'client_number'>;
  accountTypeField: UseFormRegisterReturn<'account_type'>;
  errors: FieldErrors<ConvertClientValues>;
  onClientNumberChange: (event: ChangeEvent<HTMLInputElement>) => void;
};

const buildFieldChangeEvent = (name: string, value: string) => ({
  target: { name, value }
});

const ConvertClientFields = ({
  clientNumber,
  accountType,
  clientNumberField,
  accountTypeField,
  errors,
  onClientNumberChange
}: ConvertClientFieldsProps) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div>
        <label className="text-xs font-medium text-muted-foreground" htmlFor="convert-client-number">
          Numero de compte
        </label>
        <Input
          {...clientNumberField}
          id="convert-client-number"
          value={clientNumber}
          onChange={onClientNumberChange}
          placeholder="Ex: 000123"
          inputMode="numeric"
        />
        {errors.client_number && (
          <p className="text-xs text-destructive mt-1">{errors.client_number.message}</p>
        )}
      </div>
      <div>
        <label className="text-xs font-medium text-muted-foreground" htmlFor="convert-account-type">
          Type de compte
        </label>
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
            id="convert-account-type"
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
};

export default ConvertClientFields;
