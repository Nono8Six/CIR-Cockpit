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
  <div className="flex flex-wrap items-center justify-between gap-3">
    <div>
      <h2 className="text-sm font-semibold text-slate-900">Utilisateurs</h2>
      <p className="text-xs text-slate-500">Gestion des acces et roles globaux</p>
    </div>
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
      <Button type="button" className="h-8 px-3 text-xs" onClick={onOpenCreate}>
        <Plus size={14} className="mr-1" /> Nouvel utilisateur
      </Button>
    </div>
  </div>
);

export default UsersManagerHeader;
