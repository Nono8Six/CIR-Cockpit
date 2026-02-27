import type { Entity } from '@/types';
import { Building2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { CommandGroup, CommandItem } from '@/components/ui/command';
import { formatClientNumber } from '@/utils/clients/formatClientNumber';

type AppSearchClientsSectionProps = {
  clients: Entity[];
  onFocusClient: (clientId: string, contactId?: string | null) => void;
};

const AppSearchClientsSection = ({ clients, onFocusClient }: AppSearchClientsSectionProps) => {
  if (clients.length === 0) return null;

  return (
    <CommandGroup heading="Clients">
      {clients.map((client) => (
        <CommandItem
          key={client.id}
          value={`${client.name} ${client.client_number ?? ''} ${client.city ?? ''}`}
          onSelect={() => onFocusClient(client.id)}
          className="gap-3 px-3 py-2"
          data-testid={`app-search-client-${client.id}`}
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
      ))}
    </CommandGroup>
  );
};

export default AppSearchClientsSection;
