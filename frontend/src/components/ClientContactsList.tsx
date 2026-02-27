import { Pencil, Trash2 } from 'lucide-react';

import { ClientContact } from '@/types';
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
      <div className="text-sm text-muted-foreground/80 border border-dashed border-border rounded-md p-4">
        {emptyLabel ?? 'Aucun contact pour ce client.'}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {contacts.map(contact => {
        const isFocused = focusedContactId === contact.id;
        const label = `${contact.first_name ?? ''} ${contact.last_name}`.trim();
        return (
          <div
            key={contact.id}
            className={`flex items-center justify-between gap-3 rounded-md border px-3 py-2 ${
              isFocused ? 'border-ring bg-primary/5' : 'border-border'
            }`}
          >
            <div className="min-w-0">
              <p className="text-sm font-semibold text-foreground truncate">{label}</p>
              <p className="text-xs text-muted-foreground truncate">
                {contact.position ?? 'Contact'}
                {contact.email ? ` - ${contact.email}` : ''}
                {contact.phone ? ` - ${contact.phone}` : ''}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                className="h-8 px-2"
                onClick={() => onEdit(contact)}
                aria-label="Modifier le contact"
              >
                <Pencil size={14} />
              </Button>
              <Button
                type="button"
                variant="outline"
                className="h-8 px-2 text-destructive border-destructive/30 hover:bg-destructive/10"
                onClick={() => onDelete(contact)}
                aria-label="Supprimer le contact"
              >
                <Trash2 size={14} />
              </Button>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default ClientContactsList;
