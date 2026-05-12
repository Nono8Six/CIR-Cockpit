import { Loader2, Plus } from 'lucide-react';

import EntityContactRow from '@/components/entity-contact/EntityContactRow';
import type { CockpitClientContactProps } from './CockpitContactSection.types';
import CockpitFieldError from './CockpitFieldError';
import CockpitSelectedContactCard from './CockpitSelectedContactCard';

const CockpitClientContactSection = ({
  errors,
  selectedEntity,
  selectedContact,
  contacts,
  contactsLoading,
  onContactSelect,
  contactSelectRef,
  onOpenContactDialog,
  onClearSelectedContact
}: CockpitClientContactProps) => {
  if (!selectedEntity) return null;

  if (selectedContact) {
    return (
      <div className="space-y-3">
        <CockpitSelectedContactCard
          contact={selectedContact}
          onClear={onClearSelectedContact}
        />
        <CockpitFieldError message={errors.contact_id?.message} />
      </div>
    );
  }

  const hasContacts = contacts.length > 0;

  return (
    <div className="space-y-3">
      {contactsLoading ? (
        <div className="flex min-h-[54px] items-center gap-2 rounded-md border border-dashed border-border bg-surface-1/40 px-3 py-2 text-xs text-muted-foreground">
          <Loader2 size={14} className="animate-spin" aria-hidden="true" />
          Chargement des contacts…
        </div>
      ) : hasContacts ? (
        <ul className="grid gap-2">
          {contacts.map((contact, index) => {
            return (
              <li key={contact.id}>
                <EntityContactRow
                  contact={contact}
                  variant="selectable"
                  buttonRef={index === 0 ? contactSelectRef : undefined}
                  onSelect={() => onContactSelect(contact.id)}
                />
              </li>
            );
          })}
        </ul>
      ) : (
        <div className="rounded-md border border-dashed border-border bg-surface-1/40 px-3 py-2.5">
          <p className="text-sm font-medium text-foreground">Aucun contact rattaché</p>
          <p className="mt-0.5 text-xs text-muted-foreground">Ajoute un contact pour continuer.</p>
        </div>
      )}

      <button
        type="button"
        onClick={onOpenContactDialog}
        className="inline-flex items-center justify-center gap-1.5 rounded-md border border-dashed border-border bg-transparent px-2.5 py-1.5 text-xs font-semibold text-muted-foreground transition-colors hover:border-foreground/25 hover:bg-surface-1 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      >
        <Plus size={13} aria-hidden="true" />
        Ajouter un nouveau contact
      </button>

      <CockpitFieldError message={errors.contact_id?.message} />
    </div>
  );
};

export default CockpitClientContactSection;
