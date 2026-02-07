import type { Entity } from '@/types';
import { formatClientNumber } from '@/utils/clients/formatClientNumber';

type AppSearchClientsSectionProps = {
  clients: Entity[];
  onFocusClient: (clientId: string, contactId?: string | null) => void;
};

const AppSearchClientsSection = ({ clients, onFocusClient }: AppSearchClientsSectionProps) => {
  if (clients.length === 0) return null;

  return (
    <div className="space-y-1">
      <div className="px-2 py-1.5 text-xs font-semibold text-slate-400 uppercase tracking-wider">
        Clients
      </div>
      {clients.map((client) => (
        <button
          key={client.id}
          type="button"
          className="w-full flex items-center justify-between p-2.5 rounded-lg hover:bg-slate-50 text-left transition-colors"
          onClick={() => onFocusClient(client.id)}
        >
          <div className="flex flex-col gap-0.5">
            <span className="font-medium text-slate-900 text-sm">{client.name}</span>
            <span className="text-xs text-slate-500">
              {client.client_number
                ? `${formatClientNumber(client.client_number)} • ${client.city ?? ''}`
                : client.city}
            </span>
          </div>
          {client.archived_at && (
            <span className="text-[10px] uppercase tracking-wider text-amber-600 bg-amber-50 px-2 py-1 rounded">
              Archivé
            </span>
          )}
        </button>
      ))}
    </div>
  );
};

export default AppSearchClientsSection;
