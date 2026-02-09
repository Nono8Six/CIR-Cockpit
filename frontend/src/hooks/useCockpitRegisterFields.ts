import type { UseFormRegister } from 'react-hook-form';

import type { InteractionFormValues } from '@/schemas/interactionSchema';

type UseCockpitRegisterFieldsParams = {
  register: UseFormRegister<InteractionFormValues>;
};

export const useCockpitRegisterFields = ({ register }: UseCockpitRegisterFieldsParams) => {
  const companyField = register('company_name');
  const companyCityField = register('company_city');
  const contactFirstNameField = register('contact_first_name');
  const contactLastNameField = register('contact_last_name');
  const contactPositionField = register('contact_position');
  const contactPhoneField = register('contact_phone');
  const contactEmailField = register('contact_email');
  const notesField = register('notes');
  const orderRefField = register('order_ref');
  const reminderField = register('reminder_at');
  const subjectField = register('subject');

  return {
    companyField,
    companyCityField,
    contactFirstNameField,
    contactLastNameField,
    contactPositionField,
    contactPhoneField,
    contactEmailField,
    notesField,
    orderRefField,
    reminderField,
    subjectField
  };
};
