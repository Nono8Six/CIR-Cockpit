import type { FieldErrors, UseFormRegisterReturn } from 'react-hook-form';

import type { ClientCompanyFormUiValues } from '../../hooks/entities/clients/useClientFormDialog';
import { Input } from '../ui/inputs/basic/Input';

type ClientFormIdentitySectionProps = {
  nameField: UseFormRegisterReturn;
  officialNameField: UseFormRegisterReturn;
  errors: FieldErrors<ClientCompanyFormUiValues>;
};

/**
 * Identity section for the client form.
 * Contains company name and registered official name.
 */
const ClientFormIdentitySection = ({
  nameField,
  officialNameField,
  errors
}: ClientFormIdentitySectionProps) => (
  <div className="space-y-4">
    <div className="text-[11px] font-mono font-bold uppercase tracking-widest text-neutral-400 border-b border-neutral-100 pb-1.5">
      01. Société
    </div>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
      <div>
        <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-neutral-400 mb-1.5 block" htmlFor="client-name">
          Nom de la société
        </label>
        <Input
          {...nameField}
          id="client-name"
          placeholder="Nom commercial du client"
          autoComplete="organization"
          className="!h-8 !text-xs !px-2.5 !bg-neutral-50/50 !border-neutral-200 hover:!bg-neutral-50 hover:!border-neutral-300 focus:!bg-white focus:!border-neutral-400 focus:!ring-0 !rounded-md !shadow-none transition-all text-neutral-800 placeholder:text-neutral-300 w-full"
        />
        {errors.name && (
          <p className="text-destructive text-[10px] font-medium mt-1">{errors.name.message}</p>
        )}
      </div>
      <div>
        <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-neutral-400 mb-1.5 block" htmlFor="client-official-name">
          Raison sociale
        </label>
        <Input
          {...officialNameField}
          id="client-official-name"
          placeholder="Dénomination légale officielle"
          className="!h-8 !text-xs !px-2.5 !bg-neutral-50/50 !border-neutral-200 hover:!bg-neutral-50 hover:!border-neutral-300 focus:!bg-white focus:!border-neutral-400 focus:!ring-0 !rounded-md !shadow-none transition-all text-neutral-800 placeholder:text-neutral-300 w-full"
        />
        {errors.official_name && (
          <p className="text-destructive text-[10px] font-medium mt-1">{errors.official_name.message}</p>
        )}
      </div>
    </div>
  </div>
);

export default ClientFormIdentitySection;
