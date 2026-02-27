import CockpitClientContactSelector from './CockpitClientContactSelector';
import type { CockpitClientContactProps } from './CockpitContactSection.types';
import CockpitFieldError from './CockpitFieldError';
import CockpitSelectedContactCard from './CockpitSelectedContactCard';

const CockpitClientContactSection = ({
  labelStyle,
  errors,
  selectedEntity,
  selectedContact,
  selectedContactMeta,
  contactSelectValue,
  contacts,
  contactsLoading,
  onContactSelect,
  contactSelectRef,
  onOpenContactDialog,
  onClearSelectedContact
}: CockpitClientContactProps) => {
  if (!selectedEntity) return null;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className={labelStyle}>Contact</label>
        <button
          type="button"
          onClick={onOpenContactDialog}
          className="text-xs font-semibold text-muted-foreground hover:text-foreground"
        >
          Ajouter un contact
        </button>
      </div>
      {selectedContact ? (
        <CockpitSelectedContactCard
          contact={selectedContact}
          contactMeta={selectedContactMeta}
          onClear={onClearSelectedContact}
        />
      ) : (
        <CockpitClientContactSelector
          contactSelectValue={contactSelectValue}
          contacts={contacts}
          contactsLoading={contactsLoading}
          onContactSelect={onContactSelect}
          contactSelectRef={contactSelectRef}
        />
      )}
      <CockpitFieldError message={errors.contact_id?.message} />
    </div>
  );
};

export default CockpitClientContactSection;
