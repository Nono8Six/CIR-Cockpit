import { Search } from 'lucide-react';

import type { Agency, UserRole } from '@/types';
import type { ClientsPanelViewMode } from './ClientsPanel.shared';

type ClientsPanelSearchControlsProps = {
  searchTerm: string;
  onSearchTermChange: (value: string) => void;
  viewMode: ClientsPanelViewMode;
  userRole: UserRole;
  agencies: Agency[];
  agencyFilterId: string | null;
  onAgencyFilterChange: (value: string | null) => void;
};

const ClientsPanelSearchControls = ({
  searchTerm,
  onSearchTermChange,
  viewMode,
  userRole,
  agencies,
  agencyFilterId,
  onAgencyFilterChange
}: ClientsPanelSearchControlsProps) => (
  <div className="flex flex-wrap items-center gap-3">
    <div className="flex items-center gap-2 flex-1 min-w-[240px]">
      <div className="flex items-center gap-2 border border-slate-200 rounded-md px-3 py-2 w-full">
        <Search size={14} className="text-slate-400" />
        <input
          type="text"
          value={searchTerm}
          onChange={(event) => onSearchTermChange(event.target.value)}
          placeholder={
            viewMode === 'clients'
              ? 'Rechercher un client...'
              : 'Rechercher un prospect...'
          }
          className="flex-1 text-sm focus:outline-none"
        />
      </div>
    </div>
    {userRole === 'super_admin' && (
      <select
        className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 max-w-[220px]"
        value={agencyFilterId ?? ''}
        onChange={(event) => onAgencyFilterChange(event.target.value || null)}
      >
        <option value="">Toutes les agences</option>
        {agencies.map((agency) => (
          <option key={agency.id} value={agency.id}>
            {agency.name}
          </option>
        ))}
        <option value="__orphans__">Non rattachés</option>
      </select>
    )}
  </div>
);

export default ClientsPanelSearchControls;
