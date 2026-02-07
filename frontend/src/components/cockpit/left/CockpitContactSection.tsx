import CockpitClientContactSection from './CockpitClientContactSection';
import CockpitManualContactSection from './CockpitManualContactSection';
import type { CockpitContactSectionProps } from './CockpitContactSection.types';

const CockpitContactSection = ({
  labelStyle,
  errors,
  isClientRelation,
  isSolicitationRelation,
  isSupplierRelation,
  isInternalRelation,
  selectedEntity,
  selectedContact,
  selectedContactMeta,
  contactSelectValue,
  contacts,
  contactsLoading,
  onContactSelect,
  contactSelectRef,
  onOpenContactDialog,
  onClearSelectedContact,
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
}: CockpitContactSectionProps) => {
  if (isClientRelation) {
    return (
      <CockpitClientContactSection
        labelStyle={labelStyle}
        errors={errors}
        selectedEntity={selectedEntity}
        selectedContact={selectedContact}
        selectedContactMeta={selectedContactMeta}
        contactSelectValue={contactSelectValue}
        contacts={contacts}
        contactsLoading={contactsLoading}
        onContactSelect={onContactSelect}
        contactSelectRef={contactSelectRef}
        onOpenContactDialog={onOpenContactDialog}
        onClearSelectedContact={onClearSelectedContact}
      />
    );
  }

  return (
    <CockpitManualContactSection
      labelStyle={labelStyle}
      errors={errors}
      selectedContact={selectedContact}
      selectedContactMeta={selectedContactMeta}
      onClearSelectedContact={onClearSelectedContact}
      isSolicitationRelation={isSolicitationRelation}
      isSupplierRelation={isSupplierRelation}
      isInternalRelation={isInternalRelation}
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
  );
};

export default CockpitContactSection;
