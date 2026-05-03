import { ChevronRight, Loader2, Plus, UserPlus } from 'lucide-react';

import AvatarInitials from '@/components/ui/avatar-initials';
import type { EntityContact } from '@/types';
import { cn } from '@/lib/utils';
import type { CockpitClientContactProps } from './CockpitContactSection.types';
import CockpitFieldError from './CockpitFieldError';
import CockpitSelectedContactCard from './CockpitSelectedContactCard';

const buildFullName = (contact: EntityContact): string =>
  [contact.first_name ?? '', contact.last_name ?? ''].filter(Boolean).join(' ').trim() || 'Contact';

const buildSecondary = (contact: EntityContact): string =>
  contact.phone?.trim() || contact.email?.trim() || '';

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
        <div className="flex items-center gap-2 rounded-md border border-dashed border-border bg-surface-1/40 px-3 py-3 text-xs text-muted-foreground">
          <Loader2 size={14} className="animate-spin" aria-hidden="true" />
          Chargement des contacts…
        </div>
      ) : hasContacts ? (
        <ul className="grid auto-rows-fr gap-3 sm:grid-cols-2">
          {contacts.map((contact, index) => {
            const fullName = buildFullName(contact);
            const secondary = buildSecondary(contact);
            return (
              <li key={contact.id}>
                <button
                  type="button"
                  ref={index === 0 ? contactSelectRef : undefined}
                  onClick={() => onContactSelect(contact.id)}
                  className={cn(
                    'group grid h-full min-h-[88px] w-full grid-cols-[36px_minmax(0,1fr)_auto] items-center gap-3 rounded-md border border-border bg-card px-3.5 py-3 text-left transition-[border-color,box-shadow,transform] active:scale-[0.99]',
                    'hover:border-foreground/20 hover:shadow-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2'
                  )}
                  aria-label={`Sélectionner ${fullName}`}
                >
                  <AvatarInitials name={fullName} size="md" className="rounded-md" />
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold leading-tight text-foreground">
                      {fullName}
                    </span>
                    <span className="mt-1 block truncate text-[12px] leading-[1.45] text-muted-foreground">
                      {contact.position || secondary || 'Aucune information'}
                    </span>
                  </span>
                  <ChevronRight
                    size={14}
                    aria-hidden="true"
                    className="shrink-0 text-muted-foreground/35 transition-colors group-hover:text-muted-foreground"
                  />
                </button>
              </li>
            );
          })}
        </ul>
      ) : (
        <div className="flex flex-col items-center justify-center gap-2 rounded-md border border-dashed border-border bg-surface-1/40 px-4 py-6 text-center">
          <span className="grid size-9 place-items-center rounded-full bg-card text-muted-foreground shadow-soft">
            <UserPlus size={16} aria-hidden="true" />
          </span>
          <p className="text-sm font-medium text-foreground">Aucun contact rattaché</p>
          <p className="text-xs text-muted-foreground">
            Ajoute un premier contact pour ce tiers.
          </p>
        </div>
      )}

      <button
        type="button"
        onClick={onOpenContactDialog}
        className="inline-flex w-full items-center justify-center gap-1.5 rounded-md border border-dashed border-border bg-transparent px-3 py-2 text-xs font-semibold text-muted-foreground transition-colors hover:border-foreground/25 hover:bg-surface-1 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 sm:w-auto"
      >
        <Plus size={13} aria-hidden="true" />
        Ajouter un nouveau contact
      </button>

      <CockpitFieldError message={errors.contact_id?.message} />
    </div>
  );
};

export default CockpitClientContactSection;
