import { Plus } from 'lucide-react';

import ClientContactsList from '@/components/ClientContactsList';
import { Button } from '@/components/ui/button';
import type { ClientContact } from '@/types';

interface EntityContactsPanelSectionProps {
  contacts: ClientContact[];
  focusedContactId: string | null;
  isContactsLoading: boolean;
  emptyLabel: string;
  onAddContact: () => void;
  onEditContact: (contact: ClientContact) => void;
  onDeleteContact: (contact: ClientContact) => void;
}

const EntityContactsPanelSection = ({
  contacts,
  focusedContactId,
  isContactsLoading,
  emptyLabel,
  onAddContact,
  onEditContact,
  onDeleteContact
}: EntityContactsPanelSectionProps) => (
  <section className="flex min-h-0 flex-col gap-3">
    <div className="flex items-center justify-between gap-3">
      <div className="min-w-0">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground/80">
          Contacts
        </p>
        <p className="text-sm text-muted-foreground">{contacts.length} contact(s)</p>
      </div>
      <Button type="button" variant="outline" size="sm" onClick={onAddContact}>
        <Plus size={14} aria-hidden="true" />
        Ajouter
      </Button>
    </div>

    <div className="min-h-0 max-h-[46vh] overflow-y-auto pr-1">
      {isContactsLoading ? (
        <div className="rounded-md border border-dashed border-border bg-surface-1/40 px-3 py-2.5 text-sm text-muted-foreground/80">
          Chargement des contacts…
        </div>
      ) : (
        <ClientContactsList
          contacts={contacts}
          focusedContactId={focusedContactId}
          onEdit={onEditContact}
          onDelete={onDeleteContact}
          emptyLabel={emptyLabel}
        />
      )}
    </div>
  </section>
);

export default EntityContactsPanelSection;
