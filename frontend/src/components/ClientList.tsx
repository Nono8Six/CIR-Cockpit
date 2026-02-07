import { Archive } from 'lucide-react';

import { Client } from '@/types';
import { formatClientNumber } from '@/utils/clients/formatClientNumber';

interface ClientListProps {
  clients: Client[];
  selectedClientId: string | null;
  onSelect: (clientId: string) => void;
}

const ClientList = ({ clients, selectedClientId, onSelect }: ClientListProps) => {
  if (clients.length === 0) {
    return (
      <div className="text-sm text-slate-400 border border-dashed border-slate-200 rounded-lg p-4">
        Aucun client trouve.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {clients.map(client => {
        const isSelected = selectedClientId === client.id;
        return (
          <button
            key={client.id}
            type="button"
            onClick={() => onSelect(client.id)}
            className={`w-full text-left p-3 rounded-md border transition ${
              isSelected ? 'border-cir-red bg-cir-red/5' : 'border-slate-200 hover:border-cir-red/40'
            }`}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-xs text-slate-400 uppercase tracking-widest">
                  {formatClientNumber(client.client_number)} · {client.account_type === 'cash' ? 'Comptant' : 'Compte a terme'}
                </p>
                <p className="text-sm font-semibold text-slate-900 truncate">{client.name}</p>
                <p className="text-xs text-slate-500 truncate">{client.city}</p>
              </div>
              {client.archived_at && (
                <span className="flex items-center gap-1 text-[10px] uppercase text-amber-600">
                  <Archive size={12} /> Archive
                </span>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
};

export default ClientList;
