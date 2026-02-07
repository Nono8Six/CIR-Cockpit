import type { ChangeEvent } from 'react';
import type { FieldErrors, UseFormRegisterReturn } from 'react-hook-form';

import type { Agency, UserRole } from '@/types';
import type { ProspectFormValues } from '../../../../shared/schemas/prospect.schema';
import ProspectFormAddressSection from './ProspectFormAddressSection';
import ProspectFormFooter from './ProspectFormFooter';
import ProspectFormIdentitySection from './ProspectFormIdentitySection';
import ProspectFormMetaSection from './ProspectFormMetaSection';
import ProspectFormNotesSection from './ProspectFormNotesSection';

type ProspectFormContentProps = {
  isEdit: boolean;
  isSubmitting: boolean;
  errors: FieldErrors<ProspectFormValues>;
  nameField: UseFormRegisterReturn;
  cityField: UseFormRegisterReturn;
  addressField: UseFormRegisterReturn;
  postalCodeField: UseFormRegisterReturn;
  postalCode: string;
  onPostalCodeChange: (event: ChangeEvent<HTMLInputElement>) => void;
  siretField: UseFormRegisterReturn;
  agencyField: UseFormRegisterReturn;
  agencyValue: string;
  agencies: Agency[];
  userRole: UserRole;
  agencyLabel: string;
  notesField: UseFormRegisterReturn;
  onCancel: () => void;
};

const ProspectFormContent = ({
  isEdit,
  isSubmitting,
  errors,
  nameField,
  cityField,
  addressField,
  postalCodeField,
  postalCode,
  onPostalCodeChange,
  siretField,
  agencyField,
  agencyValue,
  agencies,
  userRole,
  agencyLabel,
  notesField,
  onCancel
}: ProspectFormContentProps) => (
  <>
    <ProspectFormIdentitySection
      nameField={nameField}
      cityField={cityField}
      errors={errors}
    />
    <ProspectFormAddressSection
      addressField={addressField}
      postalCodeField={postalCodeField}
      postalCode={postalCode}
      onPostalCodeChange={onPostalCodeChange}
      errors={errors}
    />
    <ProspectFormMetaSection
      siretField={siretField}
      agencyField={agencyField}
      agencyValue={agencyValue}
      agencies={agencies}
      userRole={userRole}
      agencyLabel={agencyLabel}
      errors={errors}
    />
    <ProspectFormNotesSection notesField={notesField} />
    <ProspectFormFooter
      isEdit={isEdit}
      isSubmitting={isSubmitting}
      onCancel={onCancel}
    />
  </>
);

export default ProspectFormContent;
