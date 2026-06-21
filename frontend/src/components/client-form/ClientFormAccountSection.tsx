import type { ChangeEvent } from 'react';
import type { FieldErrors, UseFormRegisterReturn } from 'react-hook-form';

import type { ClientCompanyFormUiValues } from '../../hooks/entities/clients/useClientFormDialog';
import { Input } from '../ui/inputs/basic/Input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '../ui/inputs/selects/Select';
import { formatClientNumber } from '@/utils/clients/formatClientNumber';

type ClientFormAccountSectionProps = {
  clientNumberField: UseFormRegisterReturn;
  clientNumber: string;
  onClientNumberChange: (event: ChangeEvent<HTMLInputElement>) => void;
  accountTypeField: UseFormRegisterReturn;
  accountType: string;
  errors: FieldErrors<ClientCompanyFormUiValues>;
};

const buildFieldChangeEvent = (name: string, value: string) => ({
  target: { name, value }
});

/**
 * Account settings section for the client form.
 * Contains client number and account type selection.
 */
const ClientFormAccountSection = ({
  clientNumberField,
  clientNumber,
  onClientNumberChange,
  accountTypeField,
  accountType,
  errors
}: ClientFormAccountSectionProps) => (
  <div className="space-y-4">
    <div className="text-[11px] font-mono font-bold uppercase tracking-widest text-neutral-400 border-b border-neutral-100 pb-1.5">
      04. Compte & Facturation
    </div>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
      <div>
        <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-neutral-400 mb-1.5 block" htmlFor="client-number">
          N° de compte
        </label>
        <Input
          {...clientNumberField}
          id="client-number"
          value={formatClientNumber(clientNumber)}
          onChange={onClientNumberChange}
          placeholder="000000"
          inputMode="numeric"
          className="!h-8 !text-xs !px-2.5 !bg-neutral-50/50 !border-neutral-200 hover:!bg-neutral-50 hover:!border-neutral-300 focus:!bg-white focus:!border-neutral-400 focus:!ring-0 !rounded-md !shadow-none transition-all text-neutral-800 placeholder:text-neutral-300 w-full !font-mono"
        />
        {errors.client_number && (
          <p className="text-destructive text-[10px] font-medium mt-1">{errors.client_number.message}</p>
        )}
      </div>
      <div>
        <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-neutral-400 mb-1.5 block" htmlFor="client-account-type">
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
            id="client-account-type"
            onBlur={accountTypeField.onBlur}
            aria-invalid={Boolean(errors.account_type)}
            className="!h-8 !text-xs !px-2.5 !bg-neutral-50/50 !border-neutral-200 hover:!bg-neutral-50 hover:!border-neutral-300 focus:!bg-white focus:!border-neutral-400 focus:!ring-0 !rounded-md !shadow-none transition-all text-neutral-800 w-full"
          >
            <SelectValue placeholder="Sélectionner..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="term">Compte à terme</SelectItem>
            <SelectItem value="cash">Comptant</SelectItem>
          </SelectContent>
        </Select>
        {errors.account_type && (
          <p className="text-destructive text-[10px] font-medium mt-1">{errors.account_type.message}</p>
        )}
      </div>
    </div>
  </div>
);

export default ClientFormAccountSection;
