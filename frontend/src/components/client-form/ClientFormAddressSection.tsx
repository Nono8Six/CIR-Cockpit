import type { ChangeEvent } from 'react';
import type { FieldErrors, UseFormRegisterReturn } from 'react-hook-form';

import type { ClientCompanyFormUiValues } from '../../hooks/entities/clients/useClientFormDialog';
import { Input } from '../ui/inputs/basic/Input';

type ClientFormAddressSectionProps = {
  addressField: UseFormRegisterReturn;
  cityField: UseFormRegisterReturn;
  postalCodeField: UseFormRegisterReturn;
  postalCode: string;
  onPostalCodeChange: (event: ChangeEvent<HTMLInputElement>) => void;
  errors: FieldErrors<ClientCompanyFormUiValues>;
};

/**
 * Address details section for the client form.
 * Contains address block and code postal / city grid.
 */
const ClientFormAddressSection = ({
  addressField,
  cityField,
  postalCodeField,
  postalCode,
  onPostalCodeChange,
  errors
}: ClientFormAddressSectionProps) => (
  <div className="space-y-4">
    <div className="text-[11px] font-mono font-bold uppercase tracking-widest text-neutral-400 border-b border-neutral-100 pb-1.5">
      03. Adresse Postale
    </div>
    <div className="space-y-4">
      <div>
        <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-neutral-400 mb-1.5 block" htmlFor="client-address">
          Voie / Adresse
        </label>
        <Input
          {...addressField}
          id="client-address"
          placeholder="Numéro et nom de rue..."
          autoComplete="street-address"
          className="!h-8 !text-xs !px-2.5 !bg-neutral-50/50 !border-neutral-200 hover:!bg-neutral-50 hover:!border-neutral-300 focus:!bg-white focus:!border-neutral-400 focus:!ring-0 !rounded-md !shadow-none transition-all text-neutral-800 placeholder:text-neutral-300 w-full"
        />
        {errors.address && (
          <p className="text-destructive text-[10px] font-medium mt-1">{errors.address.message}</p>
        )}
      </div>
      <div className="grid grid-cols-3 gap-5">
        <div className="col-span-1">
          <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-neutral-400 mb-1.5 block" htmlFor="client-postal-code">
            Code Postal
          </label>
          <Input
            {...postalCodeField}
            id="client-postal-code"
            value={postalCode}
            onChange={onPostalCodeChange}
            placeholder="75000"
            autoComplete="postal-code"
            inputMode="numeric"
            className="!h-8 !text-xs !px-2.5 !bg-neutral-50/50 !border-neutral-200 hover:!bg-neutral-50 hover:!border-neutral-300 focus:!bg-white focus:!border-neutral-400 focus:!ring-0 !rounded-md !shadow-none transition-all text-neutral-800 placeholder:text-neutral-300 w-full !font-mono"
          />
          {errors.postal_code && (
            <p className="text-destructive text-[10px] font-medium mt-1">{errors.postal_code.message}</p>
          )}
        </div>
        <div className="col-span-2">
          <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-neutral-400 mb-1.5 block" htmlFor="client-city">
            Ville
          </label>
          <Input
            {...cityField}
            id="client-city"
            placeholder="Paris"
            autoComplete="address-level2"
            className="!h-8 !text-xs !px-2.5 !bg-neutral-50/50 !border-neutral-200 hover:!bg-neutral-50 hover:!border-neutral-300 focus:!bg-white focus:!border-neutral-400 focus:!ring-0 !rounded-md !shadow-none transition-all text-neutral-800 placeholder:text-neutral-300 w-full"
          />
          {errors.city && (
            <p className="text-destructive text-[10px] font-medium mt-1">{errors.city.message}</p>
          )}
        </div>
      </div>
    </div>
  </div>
);

export default ClientFormAddressSection;
