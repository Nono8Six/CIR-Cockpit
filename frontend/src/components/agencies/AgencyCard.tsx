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
    <div className="flex items-center justify-between border border-slate-200 rounded-md p-3">
      <div>
        <p className="text-sm font-semibold text-slate-900">{agency.name}</p>
        {agency.archived_at && (
          <p className="text-xs text-amber-600">Archivee</p>
        )}
      </div>
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          className="h-8 px-2"
          onClick={() => onRename(agency)}
        >
          <Pencil size={14} />
        </Button>
        <Button
          type="button"
          variant="outline"
          className="h-8 px-2"
          onClick={() => onToggleArchive(agency)}
        >
          {agency.archived_at ? <ArchiveRestore size={14} /> : <Archive size={14} />}
        </Button>
        <Button
          type="button"
          variant="outline"
          className="h-8 px-2 text-red-600 border-red-200 hover:bg-red-50"
          onClick={() => onDelete(agency)}
        >
          <Trash2 size={14} />
        </Button>
      </div>
    </div>
  );
};

export default AgencyCard;
