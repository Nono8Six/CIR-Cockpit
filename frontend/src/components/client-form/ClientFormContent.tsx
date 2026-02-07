import type { ChangeEvent } from 'react';
import type { FieldErrors, UseFormRegisterReturn } from 'react-hook-form';

import type { Agency, UserRole } from '@/types';
import type { ClientFormValues } from '../../../../shared/schemas/client.schema';
import ClientFormAccountSection from './ClientFormAccountSection';
import ClientFormAddressSection from './ClientFormAddressSection';
import ClientFormAgencySection from './ClientFormAgencySection';
import ClientFormCodesSection from './ClientFormCodesSection';
import ClientFormFooter from './ClientFormFooter';
import ClientFormIdentitySection from './ClientFormIdentitySection';
import ClientFormNotesSection from './ClientFormNotesSection';

type ClientFormContentProps = {
  isEdit: boolean;
  isSubmitting: boolean;
  agencies: Agency[];
  userRole: UserRole;
  clientNumberField: UseFormRegisterReturn;
  clientNumber: string;
  onClientNumberChange: (event: ChangeEvent<HTMLInputElement>) => void;
  accountTypeField: UseFormRegisterReturn;
  accountType: 'cash' | 'term';
  errors: FieldErrors<ClientFormValues>;
  nameField: UseFormRegisterReturn;
  addressField: UseFormRegisterReturn;
  cityField: UseFormRegisterReturn;
  postalCodeField: UseFormRegisterReturn;
  postalCode: string;
  onPostalCodeChange: (event: ChangeEvent<HTMLInputElement>) => void;
  siretField: UseFormRegisterReturn;
  agencyField: UseFormRegisterReturn;
  agencyValue: string;
  agencyLabel: string;
  notesField: UseFormRegisterReturn;
  onCancel: () => void;
};

const ClientFormContent = ({
  isEdit,
  isSubmitting,
  agencies,
  userRole,
  clientNumberField,
  clientNumber,
  onClientNumberChange,
  accountTypeField,
  accountType,
  errors,
  nameField,
  addressField,
  cityField,
  postalCodeField,
  postalCode,
  onPostalCodeChange,
  siretField,
  agencyField,
  agencyValue,
  agencyLabel,
  notesField,
  onCancel
}: ClientFormContentProps) => (
  <>
    <ClientFormAccountSection
      clientNumberField={clientNumberField}
      clientNumber={clientNumber}
      onClientNumberChange={onClientNumberChange}
      accountTypeField={accountTypeField}
      accountType={accountType}
      errors={errors}
    />
    <ClientFormIdentitySection nameField={nameField} errors={errors} />
    <ClientFormAddressSection
      addressField={addressField}
      cityField={cityField}
      errors={errors}
    />
    <ClientFormCodesSection
      postalCodeField={postalCodeField}
      postalCode={postalCode}
      onPostalCodeChange={onPostalCodeChange}
      siretField={siretField}
      errors={errors}
    />
    <ClientFormAgencySection
      agencies={agencies}
      userRole={userRole}
      agencyField={agencyField}
      agencyValue={agencyValue}
      agencyLabel={agencyLabel}
      errors={errors}
    />
    <ClientFormNotesSection notesField={notesField} />
    <ClientFormFooter
      isEdit={isEdit}
      isSubmitting={isSubmitting}
      onCancel={onCancel}
    />
  </>
);

export default ClientFormContent;
