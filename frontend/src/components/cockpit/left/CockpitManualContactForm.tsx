import CockpitContactNameFields from './CockpitContactNameFields';
import CockpitContactPhoneEmailFields from './CockpitContactPhoneEmailFields';
import CockpitContactPhoneField from './CockpitContactPhoneField';
import CockpitContactPositionField from './CockpitContactPositionField';
import type { CockpitManualContactFormProps } from './CockpitManualContactForm.types';

const CockpitManualContactForm = ({
  errors,
  isSolicitationRelation,
  isSupplierRelation,
  isInternalRelation,
  contactFirstNameField,
  contactLastNameField,
  contactPositionField,
  contactPhoneField,
  contactEmailField,
  contactFirstNameInputRef,
  contactFirstName,
  contactLastName,
  contactPhone,
  contactEmail,
  onContactFirstNameChange,
  onContactLastNameChange,
  onContactPhoneChange
}: CockpitManualContactFormProps) => {
  return (
    <div className="space-y-2">
      {!isSolicitationRelation && (
        <CockpitContactNameFields
          firstNameField={contactFirstNameField}
          lastNameField={contactLastNameField}
          firstNameInputRef={contactFirstNameInputRef}
          firstName={contactFirstName}
          lastName={contactLastName}
          onFirstNameChange={onContactFirstNameChange}
          onLastNameChange={onContactLastNameChange}
          firstNameError={errors.contact_first_name?.message}
          lastNameError={errors.contact_last_name?.message}
        />
      )}
      {isSupplierRelation && (
        <CockpitContactPositionField
          positionField={contactPositionField}
          positionError={errors.contact_position?.message}
        />
      )}
      {!isInternalRelation && !isSolicitationRelation && (
        <CockpitContactPhoneEmailFields
          phoneField={contactPhoneField}
          emailField={contactEmailField}
          phone={contactPhone}
          email={contactEmail}
          onPhoneChange={onContactPhoneChange}
          phoneError={errors.contact_phone?.message}
          emailError={errors.contact_email?.message}
        />
      )}
      {isSolicitationRelation && (
        <CockpitContactPhoneField
          phoneField={contactPhoneField}
          phone={contactPhone}
          onPhoneChange={onContactPhoneChange}
          phoneError={errors.contact_phone?.message}
        />
      )}
    </div>
  );
};

export default CockpitManualContactForm;
