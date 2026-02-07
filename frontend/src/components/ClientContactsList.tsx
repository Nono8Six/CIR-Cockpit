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
      <div className="text-sm text-slate-400 border border-dashed border-slate-200 rounded-md p-4">
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
              isFocused ? 'border-cir-red bg-cir-red/5' : 'border-slate-200'
            }`}
          >
            <div className="min-w-0">
              <p className="text-sm font-semibold text-slate-900 truncate">{label}</p>
              <p className="text-xs text-slate-500 truncate">
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
                className="h-8 px-2 text-red-600 border-red-200 hover:bg-red-50"
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
