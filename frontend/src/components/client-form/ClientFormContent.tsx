import type { ChangeEvent } from 'react';
import type { FieldErrors, UseFormRegisterReturn, UseFormReturn } from 'react-hook-form';

import type { DirectoryCommercialOption } from '../../../../shared/schemas/system/directory.schema';
import type { Agency, UserRole } from '@/types';
import type { ClientCompanyFormUiValues } from '../../hooks/entities/clients/useClientFormDialog';
import ClientFormAccountSection from './ClientFormAccountSection';
import ClientFormAddressSection from './ClientFormAddressSection';
import ClientFormAgencySection from './ClientFormAgencySection';
import ClientFormCodesSection from './ClientFormCodesSection';
import ClientFormContactSection from './ClientFormContactSection';
import ClientFormFooter from './ClientFormFooter';
import ClientFormIdentitySection from './ClientFormIdentitySection';
import ClientFormNotesSection from './ClientFormNotesSection';

type ClientFormContentProps = {
  isSubmitting: boolean;
  agencies: Agency[];
  userRole: UserRole;
  form: UseFormReturn<ClientCompanyFormUiValues>;
  clientNumberField: UseFormRegisterReturn;
  clientNumber: string;
  onClientNumberChange: (event: ChangeEvent<HTMLInputElement>) => void;
  accountTypeField: UseFormRegisterReturn;
  accountType: 'cash' | 'term';
  errors: FieldErrors<ClientCompanyFormUiValues>;
  nameField: UseFormRegisterReturn;
  commercials: DirectoryCommercialOption[];
  cirCommercialField: UseFormRegisterReturn;
  cirCommercialValue: ClientCompanyFormUiValues['cir_commercial_id'];
  addressField: UseFormRegisterReturn;
  cityField: UseFormRegisterReturn;
  postalCodeField: UseFormRegisterReturn;
  postalCode: string;
  onPostalCodeChange: (event: ChangeEvent<HTMLInputElement>) => void;
  siretField: UseFormRegisterReturn;
  sirenField: UseFormRegisterReturn;
  nafCodeField: UseFormRegisterReturn;
  officialNameField: UseFormRegisterReturn;
  agencyField: UseFormRegisterReturn;
  agencyValue: string;
  agencyLabel: string;
  notesField: UseFormRegisterReturn;
  firstNameField: UseFormRegisterReturn;
  lastNameField: UseFormRegisterReturn;
  emailField: UseFormRegisterReturn;
  phoneField: UseFormRegisterReturn;
  onCancel: () => void;
};

/**
 * Single-column scrolling form content layout.
 * Features structured, cleanly divided sections with high-end premium input styling.
 */
const ClientFormContent = ({
  isSubmitting,
  agencies,
  userRole,
  form,
  clientNumberField,
  clientNumber,
  onClientNumberChange,
  accountTypeField,
  accountType,
  errors,
  nameField,
  commercials,
  cirCommercialField,
  cirCommercialValue,
  addressField,
  cityField,
  postalCodeField,
  postalCode,
  onPostalCodeChange,
  siretField,
  sirenField,
  nafCodeField,
  officialNameField,
  agencyField,
  agencyValue,
  agencyLabel,
  notesField,
  firstNameField,
  lastNameField,
  emailField,
  phoneField,
  onCancel
}: ClientFormContentProps) => {
  const showAgencySelect = userRole !== 'tcs';

  const handleCommercialChange = (value: string | null) => {
    form.setValue('cir_commercial_id', value, { shouldDirty: true, shouldValidate: true });
  };

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Scrollable Form Body */}
      <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6 max-h-[min(65vh,580px)]">
        {/* Section 1: Identity */}
        <ClientFormIdentitySection
          nameField={nameField}
          officialNameField={officialNameField}
          errors={errors}
        />

        {/* Section 2: Contact Principal (Editable) */}
        <ClientFormContactSection
          firstNameField={firstNameField}
          lastNameField={lastNameField}
          emailField={emailField}
          phoneField={phoneField}
          errors={errors}
        />

        {/* Section 3: Address */}
        <ClientFormAddressSection
          addressField={addressField}
          cityField={cityField}
          postalCodeField={postalCodeField}
          postalCode={postalCode}
          onPostalCodeChange={onPostalCodeChange}
          errors={errors}
        />

        {/* Section 4: Account settings */}
        <ClientFormAccountSection
          clientNumberField={clientNumberField}
          clientNumber={clientNumber}
          onClientNumberChange={onClientNumberChange}
          accountTypeField={accountTypeField}
          accountType={accountType}
          errors={errors}
        />

        {/* Section 5: Agency & Commercial attribution */}
        <ClientFormAgencySection
          agencyField={agencyField}
          agencyValue={agencyValue}
          agencies={agencies}
          showAgencySelect={showAgencySelect}
          agencyLabel={agencyLabel}
          cirCommercialField={cirCommercialField}
          cirCommercialValue={cirCommercialValue}
          commercials={commercials}
          onCommercialChange={handleCommercialChange}
          errors={errors}
        />

        {/* Section 6: Legal identifiers */}
        <ClientFormCodesSection
          siretField={siretField}
          sirenField={sirenField}
          nafCodeField={nafCodeField}
          errors={errors}
        />

        {/* Section 7: Notes */}
        <ClientFormNotesSection notesField={notesField} />
      </div>

      {/* Footer */}
      <ClientFormFooter
        isSubmitting={isSubmitting}
        onCancel={onCancel}
        rootError={errors.root?.message}
      />
    </div>
  );
};

export default ClientFormContent;
