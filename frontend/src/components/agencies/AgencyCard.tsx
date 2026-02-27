import { Archive, ArchiveRestore, Pencil, Trash2 } from 'lucide-react';

import { Agency } from '@/types';
import { Button } from '@/components/ui/button';

type AgencyCardProps = {
  agency: Agency;
  onRename: (agency: Agency) => void;
  onToggleArchive: (agency: Agency) => void;
  onDelete: (agency: Agency) => void;
};

const AgencyCard = ({ agency, onRename, onToggleArchive, onDelete }: AgencyCardProps) => {
  return (
    <div className="flex flex-col gap-3 rounded-md border border-border p-3 sm:flex-row sm:items-center sm:justify-between" data-testid={`admin-agency-card-${agency.id}`}>
      <div>
        <p className="text-sm font-semibold text-foreground">{agency.name}</p>
        {agency.archived_at && (
          <p className="text-xs text-warning">Archivee</p>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant="outline"
          className="h-9 px-3 text-xs sm:text-sm"
          onClick={() => onRename(agency)}
          aria-label="Renommer l'agence"
          data-testid={`admin-agency-rename-${agency.id}`}
        >
          <Pencil size={14} className="mr-1" /> Renommer
        </Button>
        <Button
          type="button"
          variant="outline"
          className="h-9 px-3 text-xs sm:text-sm"
          onClick={() => onToggleArchive(agency)}
          aria-label={agency.archived_at ? "Restaurer l'agence" : "Archiver l'agence"}
          data-testid={`admin-agency-archive-toggle-${agency.id}`}
        >
          {agency.archived_at ? <ArchiveRestore size={14} className="mr-1" /> : <Archive size={14} className="mr-1" />}
          {agency.archived_at ? 'Restaurer' : 'Archiver'}
        </Button>
        <Button
          type="button"
          variant="outline"
          className="h-9 border-destructive/30 px-3 text-xs text-destructive hover:bg-destructive/10 sm:text-sm"
          onClick={() => onDelete(agency)}
          aria-label="Supprimer l'agence"
          data-testid={`admin-agency-delete-${agency.id}`}
        >
          <Trash2 size={14} className="mr-1" /> Supprimer
        </Button>
      </div>
    </div>
  );
};

export default AgencyCard;
