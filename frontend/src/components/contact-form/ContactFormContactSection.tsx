import type { ChangeEvent } from 'react';
import type { FieldErrors, UseFormRegisterReturn } from 'react-hook-form';

import type { ClientContactFormValues } from '../../../../shared/schemas/client-contact.schema';
import { Input } from '@/components/ui/input';

type ContactFormContactSectionProps = {
  emailField: UseFormRegisterReturn;
  phoneField: UseFormRegisterReturn;
  phoneValue: string;
  onPhoneChange: (event: ChangeEvent<HTMLInputElement>) => void;
  errors: FieldErrors<ClientContactFormValues>;
};

const ContactFormContactSection = ({
  emailField,
  phoneField,
  phoneValue,
  onPhoneChange,
  errors
}: ContactFormContactSectionProps) => (
  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
    <div>
      <label className="text-xs font-medium text-slate-500" htmlFor="contact-email">Email</label>
      <Input
        {...emailField}
        id="contact-email"
        placeholder="contact@email.fr"
        type="email"
        autoComplete="email"
        spellCheck={false}
      />
      {errors.email && (
        <p className="text-[11px] text-red-600 mt-1">{errors.email.message}</p>
      )}
    </div>
    <div>
      <label className="text-xs font-medium text-slate-500" htmlFor="contact-phone">Telephone</label>
      <Input
        {...phoneField}
        id="contact-phone"
        value={phoneValue}
        onChange={onPhoneChange}
        placeholder="05 58 96 52 12"
        type="tel"
        inputMode="tel"
        autoComplete="tel"
      />
      {errors.phone && (
        <p className="text-[11px] text-red-600 mt-1">{errors.phone.message}</p>
      )}
    </div>
  </div>
);

export default ContactFormContactSection;
