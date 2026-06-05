import type { Entity } from '@/types';
import { Building2 } from 'lucide-react';
import { Badge } from '../ui/data-display/Badge';
import { CommandGroup, CommandItem } from '../ui/inputs/selects/Command';
import { formatClientNumber } from '@/utils/clients/formatClientNumber';

type AppSearchClientsSectionProps = {
  clients: Entity[];
  onFocusClient: (clientId: string, contactId?: string | null, clientNumber?: string | null) => void;
};

const AppSearchClientsSection = ({ clients, onFocusClient }: AppSearchClientsSectionProps) => {
  if (clients.length === 0) return null;

  const handleFocusClient = (client: Entity) => {
    onFocusClient(client.id, undefined, client.client_number);
  };

  return (
    <CommandGroup heading="Clients">
      {clients.map((client) => (
        <a
          href={client.client_number ? `/clients/${client.client_number}` : '/clients'}
          key={client.id}
          data-testid={`app-search-client-${client.id}`}
        >
          <CommandItem
            value={`${client.name} ${client.client_number ?? ''} ${client.city ?? ''}`}
            onSelect={() => handleFocusClient(client)}
            className="gap-3 px-3 py-2"
          >
            <Building2 className="size-4 text-muted-foreground" aria-hidden="true" />
            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span className="truncate text-sm font-medium text-foreground">{client.name}</span>
              <span className="truncate text-xs text-muted-foreground">
                {client.client_number
                  ? `${formatClientNumber(client.client_number)} • ${client.city ?? ''}`
                  : client.city}
              </span>
            </div>
            {client.archived_at && (
              <Badge variant="warning" density="dense" className="shrink-0 uppercase tracking-wide">
                Archivé
              </Badge>
            )}
          </CommandItem>
        </a>
      ))}
    </CommandGroup>
  );
};

export default AppSearchClientsSection;
