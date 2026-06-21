import type { FieldErrors, UseFormRegisterReturn } from 'react-hook-form';

import type { ClientCompanyFormUiValues } from '../../hooks/entities/clients/useClientFormDialog';
import { Input } from '../ui/inputs/basic/Input';

type ClientFormCodesSectionProps = {
  siretField: UseFormRegisterReturn;
  sirenField: UseFormRegisterReturn;
  nafCodeField: UseFormRegisterReturn;
  errors: FieldErrors<ClientCompanyFormUiValues>;
};

/**
 * Legal identifiers section for the client form.
 * Displays SIRET, SIREN, and NAF codes in a 3-column grid, styled in monospace.
 */
const ClientFormCodesSection = ({
  siretField,
  sirenField,
  nafCodeField,
  errors
}: ClientFormCodesSectionProps) => (
  <div className="space-y-4">
    <div className="text-[11px] font-mono font-bold uppercase tracking-widest text-neutral-400 border-b border-neutral-100 pb-1.5">
      06. Identifiants Légaux
    </div>
    <div className="grid grid-cols-3 gap-5">
      <div>
        <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-neutral-400 mb-1.5 block" htmlFor="client-siret">
          SIRET
        </label>
        <Input
          {...siretField}
          id="client-siret"
          placeholder="Non renseigné"
          className="!h-8 !text-xs !px-2.5 !bg-neutral-50/50 !border-neutral-200 hover:!bg-neutral-50 hover:!border-neutral-300 focus:!bg-white focus:!border-neutral-400 focus:!ring-0 !rounded-md !shadow-none transition-all text-neutral-800 placeholder:text-neutral-300 w-full !font-mono"
        />
        {errors.siret && (
          <p className="text-destructive text-[10px] font-medium mt-1">{errors.siret.message}</p>
        )}
      </div>
      <div>
        <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-neutral-400 mb-1.5 block" htmlFor="client-siren">
          SIREN
        </label>
        <Input
          {...sirenField}
          id="client-siren"
          placeholder="Non renseigné"
          className="!h-8 !text-xs !px-2.5 !bg-neutral-50/50 !border-neutral-200 hover:!bg-neutral-50 hover:!border-neutral-300 focus:!bg-white focus:!border-neutral-400 focus:!ring-0 !rounded-md !shadow-none transition-all text-neutral-800 placeholder:text-neutral-300 w-full !font-mono"
        />
        {errors.siren && (
          <p className="text-destructive text-[10px] font-medium mt-1">{errors.siren.message}</p>
        )}
      </div>
      <div>
        <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-neutral-400 mb-1.5 block" htmlFor="client-naf-code">
          Code NAF
        </label>
        <Input
          {...nafCodeField}
          id="client-naf-code"
          placeholder="Non renseigné"
          className="!h-8 !text-xs !px-2.5 !bg-neutral-50/50 !border-neutral-200 hover:!bg-neutral-50 hover:!border-neutral-300 focus:!bg-white focus:!border-neutral-400 focus:!ring-0 !rounded-md !shadow-none transition-all text-neutral-800 placeholder:text-neutral-300 w-full !font-mono"
        />
        {errors.naf_code && (
          <p className="text-destructive text-[10px] font-medium mt-1">{errors.naf_code.message}</p>
        )}
      </div>
    </div>
  </div>
);

export default ClientFormCodesSection;
