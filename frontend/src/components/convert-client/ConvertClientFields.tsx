import type { ChangeEvent } from 'react';
import type { FieldErrors, UseFormRegisterReturn } from 'react-hook-form';

import type { ConvertClientValues } from '../../../../shared/schemas/convert-client.schema';
import { Input } from '@/components/ui/input';

type ConvertClientFieldsProps = {
  clientNumber: string;
  accountType: ConvertClientValues['account_type'];
  clientNumberField: UseFormRegisterReturn<'client_number'>;
  accountTypeField: UseFormRegisterReturn<'account_type'>;
  errors: FieldErrors<ConvertClientValues>;
  onClientNumberChange: (event: ChangeEvent<HTMLInputElement>) => void;
};

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
        <label className="text-xs font-medium text-slate-500" htmlFor="convert-client-number">
          Numero de compte
        </label>
        <Input
          {...clientNumberField}
          id="convert-client-number"
          value={clientNumber}
          onChange={onClientNumberChange}
          placeholder="Ex: 000123"
          inputMode="numeric"
          autoFocus
        />
        {errors.client_number && (
          <p className="text-[11px] text-red-600 mt-1">{errors.client_number.message}</p>
        )}
      </div>
      <div>
        <label className="text-xs font-medium text-slate-500" htmlFor="convert-account-type">
          Type de compte
        </label>
        <select
          id="convert-account-type"
          {...accountTypeField}
          value={accountType}
          className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
        >
          <option value="term">Compte a terme</option>
          <option value="cash">Comptant</option>
        </select>
        {errors.account_type && (
          <p className="text-[11px] text-red-600 mt-1">{errors.account_type.message}</p>
        )}
      </div>
    </div>
  );
};

export default ConvertClientFields;
