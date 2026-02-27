import { Search } from 'lucide-react';

import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
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

const ALL_AGENCIES_VALUE = '__all__';

const ClientsPanelSearchControls = ({
  searchTerm,
  onSearchTermChange,
  viewMode,
  userRole,
  agencies,
  agencyFilterId,
  onAgencyFilterChange
}: ClientsPanelSearchControlsProps) => (
  <div className="flex flex-col gap-3 md:flex-row md:items-center">
    <div className="relative min-w-0 flex-1">
      <Search
        size={14}
        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/80"
        aria-hidden="true"
      />
      <Input
        data-testid="clients-toolbar-search"
        type="text"
        value={searchTerm}
        onChange={(event) => onSearchTermChange(event.target.value)}
        placeholder={
          viewMode === 'clients'
            ? 'Rechercher un client...'
            : 'Rechercher un prospect...'
        }
        className="h-9 pl-9 text-sm"
      />
    </div>
    {userRole === 'super_admin' && (
      <Select
        value={agencyFilterId ?? ALL_AGENCIES_VALUE}
        onValueChange={(value) =>
          onAgencyFilterChange(
            value === ALL_AGENCIES_VALUE ? null : value
          )
        }
      >
        <SelectTrigger
          data-testid="clients-toolbar-agency-filter"
          className="w-full md:max-w-[240px]"
          density="comfortable"
        >
          <SelectValue placeholder="Toutes les agences" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL_AGENCIES_VALUE}>Toutes les agences</SelectItem>
          {agencies.map((agency) => (
            <SelectItem key={agency.id} value={agency.id}>
              {agency.name}
            </SelectItem>
          ))}
          <SelectItem value="__orphans__">Non rattaches</SelectItem>
        </SelectContent>
      </Select>
    )}
  </div>
);

export default ClientsPanelSearchControls;
