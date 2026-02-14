import { Archive, ArchiveRestore, Plus } from 'lucide-react';

import { Button } from '@/components/ui/button';

type AgenciesManagerHeaderProps = {
  showArchived: boolean;
  onToggleArchived: () => void;
  onCreate: () => void;
};

const AgenciesManagerHeader = ({ showArchived, onToggleArchived, onCreate }: AgenciesManagerHeaderProps) => {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3" data-testid="admin-agencies-header">
      <div>
        <h2 className="text-sm font-semibold text-slate-900">Agences</h2>
        <p className="text-xs text-slate-500">Gestion des agences et archivage</p>
      </div>
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          className="h-9 px-3 text-xs sm:text-sm"
          onClick={onToggleArchived}
          data-testid="admin-agencies-toggle-archived"
        >
          {showArchived ? <ArchiveRestore size={14} className="mr-1" /> : <Archive size={14} className="mr-1" />}
          {showArchived ? 'Masquer archives' : 'Voir archives'}
        </Button>
        <Button type="button" className="h-9 px-3 text-xs sm:text-sm" onClick={onCreate} data-testid="admin-agencies-create-button">
          <Plus size={14} className="mr-1" /> Nouvelle agence
        </Button>
      </div>
    </div>
  );
};

export default AgenciesManagerHeader;
