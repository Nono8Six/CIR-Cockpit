import { Building2 } from 'lucide-react';

import type { Entity } from '@/types';
import { Badge } from '@/components/ui/badge';

type CockpitSelectedEntityCardProps = {
  selectedEntity: Entity;
  selectedEntityMeta: string;
  canConvertToClient: boolean;
  onOpenConvertDialog: () => void;
  onClearSelectedEntity: () => void;
};

const CockpitSelectedEntityCard = ({
  selectedEntity,
  selectedEntityMeta,
  canConvertToClient,
  onOpenConvertDialog,
  onClearSelectedEntity
}: CockpitSelectedEntityCardProps) => {
  return (
    <div className="rounded-lg border border-border bg-surface-1/80 p-3 flex items-start justify-between gap-3">
      <div className="flex items-start gap-2 min-w-0">
        <div className="w-8 h-8 rounded-md bg-card border border-border flex items-center justify-center text-muted-foreground">
          <Building2 size={16} />
        </div>
        <div className="min-w-0 space-y-1">
          <div className="flex items-center gap-2">
            <p className="text-[13px] font-semibold text-foreground truncate">{selectedEntity.name}</p>
            <Badge variant="secondary" className="text-[9px] uppercase tracking-wide">
              {selectedEntity.entity_type}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground truncate">
            {selectedEntityMeta || '-'}
          </p>
        </div>
      </div>
      <div className="flex flex-col items-end gap-1">
        {canConvertToClient && (
          <button
            type="button"
            onClick={onOpenConvertDialog}
            className="text-xs font-semibold text-primary hover:text-primary"
          >
            Convertir en client
          </button>
        )}
        <button
          type="button"
          onClick={onClearSelectedEntity}
          className="text-xs font-semibold text-muted-foreground hover:text-foreground"
        >
          Effacer
        </button>
      </div>
    </div>
  );
};

export default CockpitSelectedEntityCard;
