import CockpitManualContactForm from './CockpitManualContactForm';
import type { CockpitManualContactProps } from './CockpitContactSection.types';
import CockpitSelectedContactCard from './CockpitSelectedContactCard';

const CockpitManualContactSection = ({
  errors,
  selectedContact,
  onClearSelectedContact,
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
}: CockpitManualContactProps) => (
  <div className="space-y-3">
    {selectedContact ? (
      <CockpitSelectedContactCard
        contact={selectedContact}
        onClear={onClearSelectedContact}
      />
    ) : (
      <CockpitManualContactForm
        errors={errors}
        relationMode={relationMode}
        contactFirstNameField={contactFirstNameField}
        contactLastNameField={contactLastNameField}
        contactPositionField={contactPositionField}
        contactPhoneField={contactPhoneField}
        contactEmailField={contactEmailField}
        contactFirstNameInputRef={contactFirstNameInputRef}
        contactFirstName={contactFirstName}
        contactLastName={contactLastName}
        contactPhone={contactPhone}
        contactEmail={contactEmail}
        onContactFirstNameChange={onContactFirstNameChange}
        onContactLastNameChange={onContactLastNameChange}
        onContactPhoneChange={onContactPhoneChange}
      />
    )}
  </div>
);

export default CockpitManualContactSection;
