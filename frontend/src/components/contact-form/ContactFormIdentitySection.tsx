import type { FieldErrors, UseFormRegisterReturn } from 'react-hook-form';

import type { ClientContactFormValues } from '../../../../shared/schemas/client-contact.schema';
import { Input } from '@/components/ui/input';

type ContactFormIdentitySectionProps = {
  firstNameField: UseFormRegisterReturn;
  lastNameField: UseFormRegisterReturn;
  errors: FieldErrors<ClientContactFormValues>;
};

const ContactFormIdentitySection = ({
  firstNameField,
  lastNameField,
  errors
}: ContactFormIdentitySectionProps) => (
  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
    <div>
      <label className="text-xs font-medium text-slate-500" htmlFor="contact-first-name">Prenom</label>
      <Input {...firstNameField} id="contact-first-name" placeholder="Prenom" autoComplete="given-name" />
      {errors.first_name && (
        <p className="text-[11px] text-red-600 mt-1">{errors.first_name.message}</p>
      )}
    </div>
    <div>
      <label className="text-xs font-medium text-slate-500" htmlFor="contact-last-name">Nom</label>
      <Input {...lastNameField} id="contact-last-name" placeholder="Nom" autoComplete="family-name" />
      {errors.last_name && (
        <p className="text-[11px] text-red-600 mt-1">{errors.last_name.message}</p>
      )}
    </div>
  </div>
);

export default ContactFormIdentitySection;
