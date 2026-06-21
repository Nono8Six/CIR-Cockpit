import { Plus } from 'lucide-react';

import ClientContactsList from '@/components/ClientContactsList';
import { Button } from '../ui/inputs/basic/Button';
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
        <h3 className="text-[10px] font-mono font-bold text-neutral-400 uppercase tracking-wider">
          Contacts
        </h3>
        <p className="text-xs text-neutral-500 font-medium mt-0.5">{contacts.length} contact(s)</p>
      </div>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="h-8 gap-1.5 border-neutral-200 hover:bg-neutral-50 text-neutral-800 text-xs px-3 shadow-sm font-semibold transition-all"
        onClick={onAddContact}
      >
        <Plus size={13} strokeWidth={1.5} className="text-neutral-500" />
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
