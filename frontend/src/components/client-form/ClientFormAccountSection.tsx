import type { ChangeEvent } from 'react';
import type { FieldErrors, UseFormRegisterReturn } from 'react-hook-form';

import type { ClientFormValues } from '../../../../shared/schemas/client.schema';
import { Input } from '@/components/ui/input';
import { formatClientNumber } from '@/utils/clients/formatClientNumber';

type ClientFormAccountSectionProps = {
  clientNumberField: UseFormRegisterReturn;
  clientNumber: string;
  onClientNumberChange: (event: ChangeEvent<HTMLInputElement>) => void;
  accountTypeField: UseFormRegisterReturn;
  accountType: string;
  errors: FieldErrors<ClientFormValues>;
};

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
      <label className="text-xs font-medium text-slate-500" htmlFor="client-number">Numero de compte</label>
      <Input
        {...clientNumberField}
        id="client-number"
        value={formatClientNumber(clientNumber)}
        onChange={onClientNumberChange}
        placeholder="Ex: 000123"
        inputMode="numeric"
      />
      {errors.client_number && (
        <p className="text-xs text-red-600 mt-1">{errors.client_number.message}</p>
      )}
    </div>
    <div>
      <label className="text-xs font-medium text-slate-500" htmlFor="client-account-type">Type de compte</label>
      <select
        id="client-account-type"
        {...accountTypeField}
        value={accountType}
        className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
      >
        <option value="term">Compte a terme</option>
        <option value="cash">Comptant</option>
      </select>
      {errors.account_type && (
        <p className="text-xs text-red-600 mt-1">{errors.account_type.message}</p>
      )}
    </div>
  </div>
);

export default ClientFormAccountSection;
