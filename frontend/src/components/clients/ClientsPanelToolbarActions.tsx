import { Archive, ArchiveRestore, Plus } from 'lucide-react';

import { Button } from '@/components/ui/button';
import type { ClientsPanelViewMode } from './ClientsPanel.shared';

type ClientsPanelToolbarActionsProps = {
  showArchived: boolean;
  onToggleArchived: () => void;
  viewMode: ClientsPanelViewMode;
  onCreateClient: () => void;
};

const ClientsPanelToolbarActions = ({
  showArchived,
  onToggleArchived,
  viewMode,
  onCreateClient
}: ClientsPanelToolbarActionsProps) => (
  <div className="flex items-center gap-2">
    <Button
      type="button"
      variant="outline"
      className="h-8 px-3 text-xs"
      onClick={onToggleArchived}
    >
      {showArchived ? <ArchiveRestore size={14} className="mr-1" /> : <Archive size={14} className="mr-1" />}
      {showArchived ? 'Masquer archives' : 'Voir archives'}
    </Button>
    {viewMode === 'clients' && (
      <Button type="button" className="h-8 px-3 text-xs" onClick={onCreateClient}>
        <Plus size={14} className="mr-1" /> Nouveau client
      </Button>
    )}
  </div>
);

export default ClientsPanelToolbarActions;
