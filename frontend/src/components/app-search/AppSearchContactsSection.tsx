import type { EntityContact } from '@/types';
import { UserRound } from 'lucide-react';
import { CommandGroup, CommandItem } from '@/components/ui/command';

type AppSearchContactsSectionProps = {
  contacts: EntityContact[];
  entityNameById: Map<string, string>;
  onFocusClient: (clientId: string, contactId?: string | null) => void;
};

const AppSearchContactsSection = ({
  contacts,
  entityNameById,
  onFocusClient
}: AppSearchContactsSectionProps) => {
  if (contacts.length === 0) return null;

  return (
    <CommandGroup heading="Contacts">
      {contacts.map((contact) => (
        <CommandItem
          key={contact.id}
          value={`${contact.first_name ?? ''} ${contact.last_name ?? ''} ${contact.position ?? ''} ${contact.email ?? ''} ${contact.phone ?? ''} ${entityNameById.get(contact.entity_id) ?? ''}`}
          onSelect={() => onFocusClient(contact.entity_id, contact.id)}
          className="gap-3 px-3 py-2"
          data-testid={`app-search-contact-${contact.id}`}
        >
          <UserRound className="size-4 text-muted-foreground" aria-hidden="true" />
          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            <span className="truncate text-sm font-medium text-foreground">
              {(contact.first_name ?? '').trim()} {contact.last_name}
            </span>
            <span className="truncate text-xs text-muted-foreground">
              {entityNameById.get(contact.entity_id) ?? 'Client'} • {contact.position ?? 'Contact'} • {contact.email ?? contact.phone ?? 'Coordonnées manquantes'}
            </span>
          </div>
        </CommandItem>
      ))}
    </CommandGroup>
  );
};

export default AppSearchContactsSection;
