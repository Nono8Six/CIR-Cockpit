import { Archive, ArchiveRestore, Plus } from 'lucide-react';

import { Button } from '@/components/ui/button';

type UsersManagerHeaderProps = {
  showArchived: boolean;
  onToggleArchived: () => void;
  onOpenCreate: () => void;
};

const UsersManagerHeader = ({
  showArchived,
  onToggleArchived,
  onOpenCreate
}: UsersManagerHeaderProps) => (
  <div className="flex flex-wrap items-center justify-between gap-3" data-testid="admin-users-header">
    <div>
      <h2 className="text-sm font-semibold text-foreground">Utilisateurs</h2>
      <p className="text-xs text-muted-foreground">Gestion des acces et roles globaux</p>
    </div>
    <div className="flex items-center gap-2">
      <Button
        type="button"
        variant="outline"
        className="h-9 px-3 text-xs sm:text-sm"
        onClick={onToggleArchived}
        data-testid="admin-users-toggle-archived"
      >
        {showArchived ? <ArchiveRestore size={14} className="mr-1" /> : <Archive size={14} className="mr-1" />}
        {showArchived ? 'Masquer archives' : 'Voir archives'}
      </Button>
      <Button type="button" className="h-9 px-3 text-xs sm:text-sm" onClick={onOpenCreate} data-testid="admin-users-create-button">
        <Plus size={14} className="mr-1" /> Nouvel utilisateur
      </Button>
    </div>
  </div>
);

export default UsersManagerHeader;
