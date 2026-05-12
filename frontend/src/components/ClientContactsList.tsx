import { Pencil, Trash2 } from 'lucide-react';

import EntityContactRow from '@/components/entity-contact/EntityContactRow';
import { getEntityContactName } from '@/components/entity-contact/entityContactRow.utils';
import type { ClientContact } from '@/types';
import { Button } from './ui/button';

interface ClientContactsListProps {
  contacts: ClientContact[];
  focusedContactId: string | null;
  onEdit: (contact: ClientContact) => void;
  onDelete: (contact: ClientContact) => void;
  emptyLabel?: string;
}

const ClientContactsList = ({
  contacts,
  focusedContactId,
  onEdit,
  onDelete,
  emptyLabel
}: ClientContactsListProps) => {
  if (contacts.length === 0) {
    return (
      <div className="rounded-md border border-dashed border-border bg-surface-1/40 px-3 py-2.5 text-sm text-muted-foreground/80">
        {emptyLabel ?? 'Aucun contact pour ce client.'}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {contacts.map(contact => {
        const isFocused = focusedContactId === contact.id;
        const label = getEntityContactName(contact);
        return (
          <EntityContactRow
            key={contact.id}
            contact={contact}
            variant={isFocused ? 'focused' : 'default'}
            actions={(
              <>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-7 text-muted-foreground hover:text-foreground"
                  onClick={() => onEdit(contact)}
                  aria-label={`Modifier ${label}`}
                  title="Modifier"
                >
                  <Pencil size={13} aria-hidden="true" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-7 text-destructive hover:bg-destructive/10 hover:text-destructive"
                  onClick={() => onDelete(contact)}
                  aria-label={`Supprimer ${label}`}
                  title="Supprimer"
                >
                  <Trash2 size={13} aria-hidden="true" />
                </Button>
              </>
            )}
          />
        );
      })}
    </div>
  );
};

export default ClientContactsList;
