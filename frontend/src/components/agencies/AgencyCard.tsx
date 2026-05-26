import { Archive, ArchiveRestore, Pencil, Trash2, MoreVertical, Building2 } from 'lucide-react';

import { Agency } from '@/types';
import { Button } from '../ui/inputs/basic/Button';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel
} from '../ui/navigation/DropdownMenu';
import { Badge } from '../ui/data-display/Badge';

type AgencyCardProps = {
  agency: Agency;
  onRename: (agency: Agency) => void;
  onToggleArchive: (agency: Agency) => void;
  onDelete: (agency: Agency) => void;
};

const AgencyCard = ({ agency, onRename, onToggleArchive, onDelete }: AgencyCardProps) => {
  return (
    <div
      className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card p-4 shadow-sm transition-all hover:shadow-md hover:border-border/80"
      data-testid={`admin-agency-card-${agency.id}`}
    >
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-primary/5 text-primary">
          <Building2 size={18} />
        </div>
        <div>
          <p className="text-sm font-semibold text-foreground tracking-tight">{agency.name}</p>
          <div className="mt-1">
            {agency.archived_at ? (
              <Badge variant="warning" className="text-[10px] px-1.5 py-0">Archivée</Badge>
            ) : (
              <Badge variant="success" className="text-[10px] bg-success/10 text-success border-success/20 px-1.5 py-0">Active</Badge>
            )}
          </div>
        </div>
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            className="h-8 w-8 p-0 hover:bg-muted rounded-full"
            aria-label="Actions"
          >
            <MoreVertical size={16} />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuLabel className="text-xs text-muted-foreground">Options d&apos;agence</DropdownMenuLabel>
          <DropdownMenuItem
            onClick={() => onRename(agency)}
            data-testid={`admin-agency-rename-${agency.id}`}
          >
            <Pencil size={14} className="mr-2 text-muted-foreground" />
            <span>Renommer</span>
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => onToggleArchive(agency)}
            data-testid={`admin-agency-archive-toggle-${agency.id}`}
          >
            {agency.archived_at ? (
              <>
                <ArchiveRestore size={14} className="mr-2 text-muted-foreground" />
                <span>Restaurer l&apos;agence</span>
              </>
            ) : (
              <>
                <Archive size={14} className="mr-2 text-muted-foreground" />
                <span>Archiver l&apos;agence</span>
              </>
            )}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => onDelete(agency)}
            className="text-destructive focus:bg-destructive/10 focus:text-destructive"
            data-testid={`admin-agency-delete-${agency.id}`}
          >
            <Trash2 size={14} className="mr-2" />
            <span>Supprimer l&apos;agence</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};

export default AgencyCard;
