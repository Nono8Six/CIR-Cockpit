import type { FieldErrors, UseFormRegisterReturn } from 'react-hook-form';

import type { ClientCompanyFormUiValues } from '../../hooks/entities/clients/useClientFormDialog';
import { Input } from '../ui/inputs/basic/Input';

type ClientFormContactSectionProps = {
  firstNameField: UseFormRegisterReturn;
  lastNameField: UseFormRegisterReturn;
  emailField: UseFormRegisterReturn;
  phoneField: UseFormRegisterReturn;
  errors: FieldErrors<ClientCompanyFormUiValues>;
};

/**
 * Primary contact details section for the client form.
 * Allows editing the primary contact first name, last name, phone, and email.
 */
const ClientFormContactSection = ({
  firstNameField,
  lastNameField,
  emailField,
  phoneField,
  errors
}: ClientFormContactSectionProps) => (
  <div className="space-y-4">
    <div className="text-[11px] font-mono font-bold uppercase tracking-widest text-neutral-400 border-b border-neutral-100 pb-1.5">
      02. Contact Principal
    </div>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
      <div>
        <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-neutral-400 mb-1.5 block" htmlFor="contact-first-name">
          Prénom
        </label>
        <Input
          {...firstNameField}
          id="contact-first-name"
          placeholder="Prénom du contact"
          className="!h-8 !text-xs !px-2.5 !bg-neutral-50/50 !border-neutral-200 hover:!bg-neutral-50 hover:!border-neutral-300 focus:!bg-white focus:!border-neutral-400 focus:!ring-0 !rounded-md !shadow-none transition-all text-neutral-800 placeholder:text-neutral-300 w-full"
        />
        {errors.first_name && (
          <p className="text-destructive text-[10px] font-medium mt-1">{errors.first_name.message}</p>
        )}
      </div>
      <div>
        <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-neutral-400 mb-1.5 block" htmlFor="contact-last-name">
          Nom
        </label>
        <Input
          {...lastNameField}
          id="contact-last-name"
          placeholder="Nom du contact"
          className="!h-8 !text-xs !px-2.5 !bg-neutral-50/50 !border-neutral-200 hover:!bg-neutral-50 hover:!border-neutral-300 focus:!bg-white focus:!border-neutral-400 focus:!ring-0 !rounded-md !shadow-none transition-all text-neutral-800 placeholder:text-neutral-300 w-full"
        />
        {errors.last_name && (
          <p className="text-destructive text-[10px] font-medium mt-1">{errors.last_name.message}</p>
        )}
      </div>
    </div>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
      <div>
        <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-neutral-400 mb-1.5 block" htmlFor="contact-email">
          Email
        </label>
        <Input
          {...emailField}
          id="contact-email"
          placeholder="contact@exemple.com"
          autoComplete="email"
          className="!h-8 !text-xs !px-2.5 !bg-neutral-50/50 !border-neutral-200 hover:!bg-neutral-50 hover:!border-neutral-300 focus:!bg-white focus:!border-neutral-400 focus:!ring-0 !rounded-md !shadow-none transition-all text-neutral-800 placeholder:text-neutral-300 w-full"
        />
        {errors.email && (
          <p className="text-destructive text-[10px] font-medium mt-1">{errors.email.message}</p>
        )}
      </div>
      <div>
        <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-neutral-400 mb-1.5 block" htmlFor="contact-phone">
          Téléphone
        </label>
        <Input
          {...phoneField}
          id="contact-phone"
          placeholder="06 00 00 00 00"
          autoComplete="tel"
          className="!h-8 !text-xs !px-2.5 !bg-neutral-50/50 !border-neutral-200 hover:!bg-neutral-50 hover:!border-neutral-300 focus:!bg-white focus:!border-neutral-400 focus:!ring-0 !rounded-md !shadow-none transition-all text-neutral-800 placeholder:text-neutral-300 w-full !font-mono"
        />
        {errors.phone && (
          <p className="text-destructive text-[10px] font-medium mt-1">{errors.phone.message}</p>
        )}
      </div>
    </div>
  </div>
);

export default ClientFormContactSection;
