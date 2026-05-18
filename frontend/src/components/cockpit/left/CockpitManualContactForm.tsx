import CockpitContactNameFields from './CockpitContactNameFields';
import CockpitContactPhoneEmailFields from './CockpitContactPhoneEmailFields';
import CockpitContactPositionField from './CockpitContactPositionField';
import type { CockpitManualContactFormProps } from './CockpitManualContactForm.types';

const CockpitManualContactForm = ({
  errors,
  relationMode,
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
  if (relationMode === 'solicitation') return null;

  return (
    <div className="space-y-2">
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
      {relationMode === 'supplier' && (
        <CockpitContactPositionField
          positionField={contactPositionField}
          positionError={errors.contact_position?.message}
        />
      )}
      {relationMode !== 'internal' && (
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
    </div>
  );
};

export default CockpitManualContactForm;
