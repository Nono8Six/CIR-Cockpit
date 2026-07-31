import { Archive, ArchiveRestore, Plus } from 'lucide-react';

import { Button } from '../ui/inputs/basic/Button';

type UsersManagerHeaderProps = {
  showArchived: boolean;
  onToggleArchived: () => void;
  onOpenCreate: () => void;
  totalCount: number;
  activeCount: number;
  archivedCount: number;
  countsReady: boolean;
};

const pluralize = (count: number, singular: string, plural: string) =>
  `${count} ${count > 1 ? plural : singular}`;

const UsersManagerHeader = ({
  showArchived,
  onToggleArchived,
  onOpenCreate,
  totalCount,
  activeCount,
  archivedCount,
  countsReady
}: UsersManagerHeaderProps) => (
  <div
    className="flex shrink-0 flex-wrap items-center justify-between gap-3"
    data-testid="admin-users-header"
  >
    <div className="flex min-w-0 flex-wrap items-baseline gap-2.5">
      <h2 className="text-sm font-semibold leading-none text-foreground">Utilisateurs</h2>
      {countsReady ? (
        <span
          className="font-mono text-[11px] tabular-nums text-muted-foreground"
          data-testid="admin-users-counts"
        >
          {pluralize(totalCount, 'utilisateur', 'utilisateurs')}
          {' · '}
          {pluralize(activeCount, 'actif', 'actifs')}
          {' · '}
          {pluralize(archivedCount, 'archivé', 'archivés')}
        </span>
      ) : (
        <span className="skeleton-shimmer h-3 w-40 rounded" aria-hidden="true" />
      )}
    </div>
    <div className="flex items-center gap-2">
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="h-8 gap-1.5 rounded-md px-3 text-xs shadow-none"
        onClick={onToggleArchived}
        data-testid="admin-users-toggle-archived"
      >
        {showArchived ? <ArchiveRestore size={14} /> : <Archive size={14} />}
        {showArchived ? 'Masquer archives' : 'Voir archives'}
      </Button>
      <Button
        type="button"
        size="sm"
        className="h-8 gap-1.5 rounded-md px-3 text-xs"
        onClick={onOpenCreate}
        data-testid="admin-users-create-button"
      >
        <Plus size={14} /> Nouvel utilisateur
      </Button>
    </div>
  </div>
);

export default UsersManagerHeader;
