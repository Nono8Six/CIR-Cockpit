import type { Agency, UserRole } from '@/types';
import { ToolbarRow } from '@/components/ui/toolbar-row';
import type { ClientsPanelViewMode } from './ClientsPanel.shared';
import ClientsPanelSearchControls from './ClientsPanelSearchControls';
import ClientsPanelTitle from './ClientsPanelTitle';
import ClientsPanelToolbarActions from './ClientsPanelToolbarActions';
import ClientsPanelViewModeTabs from './ClientsPanelViewModeTabs';

type ClientsPanelToolbarProps = {
  viewMode: ClientsPanelViewMode;
  onViewModeChange: (mode: ClientsPanelViewMode) => void;
  showArchived: boolean;
  onToggleArchived: () => void;
  onCreateClient: () => void;
  searchTerm: string;
  onSearchTermChange: (value: string) => void;
  userRole: UserRole;
  agencies: Agency[];
  agencyFilterId: string | null;
  onAgencyFilterChange: (value: string | null) => void;
};

const ClientsPanelToolbar = ({
  viewMode,
  onViewModeChange,
  showArchived,
  onToggleArchived,
  onCreateClient,
  searchTerm,
  onSearchTermChange,
  userRole,
  agencies,
  agencyFilterId,
  onAgencyFilterChange
}: ClientsPanelToolbarProps) => (
  <div className="bg-white border border-slate-200 rounded-lg shadow-sm p-4 flex flex-col gap-3">
    <ToolbarRow density="comfortable">
      <div className="flex flex-wrap items-center gap-4">
        <ClientsPanelTitle viewMode={viewMode} />
        <ClientsPanelViewModeTabs
          viewMode={viewMode}
          onViewModeChange={onViewModeChange}
        />
      </div>
      <ClientsPanelToolbarActions
        showArchived={showArchived}
        onToggleArchived={onToggleArchived}
        viewMode={viewMode}
        onCreateClient={onCreateClient}
      />
    </ToolbarRow>
    <ClientsPanelSearchControls
      searchTerm={searchTerm}
      onSearchTermChange={onSearchTermChange}
      viewMode={viewMode}
      userRole={userRole}
      agencies={agencies}
      agencyFilterId={agencyFilterId}
      onAgencyFilterChange={onAgencyFilterChange}
    />
  </div>
);

export default ClientsPanelToolbar;
