import { Building2 } from 'lucide-react';

import type { Entity } from '@/types';
import { formatClientNumber } from '@/utils/clients/formatClientNumber';
import { Badge } from '../ui/data-display/Badge';
import AppSearchGroup from './AppSearchGroup';
import AppSearchRow from './AppSearchRow';

type AppSearchClientsSectionProps = {
  clients: Entity[];
  onFocusClient: (clientId: string, contactId?: string | null, clientNumber?: string | null) => void;
};

const AppSearchClientsSection = ({ clients, onFocusClient }: AppSearchClientsSectionProps) => {
  if (clients.length === 0) return null;

  return (
    <AppSearchGroup heading="Clients">
      {clients.map((client) => (
        <AppSearchRow
          key={client.id}
          value={`client ${client.name} ${client.client_number ?? ''} ${client.city ?? ''}`}
          onSelect={() => onFocusClient(client.id, undefined, client.client_number)}
          icon={Building2}
          label={client.name}
          detail={client.city ?? undefined}
          meta={formatClientNumber(client.client_number) || undefined}
          testId={`app-search-client-${client.id}`}
          trailing={client.archived_at ? (
            <Badge variant="warning" density="dense" className="shrink-0">
              Archivé
            </Badge>
          ) : undefined}
        />
      ))}
    </AppSearchGroup>
  );
};

export default AppSearchClientsSection;
