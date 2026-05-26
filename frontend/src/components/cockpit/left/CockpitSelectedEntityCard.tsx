import { Building2 } from 'lucide-react';
import { motion, useReducedMotion } from 'motion/react';

import type { Entity } from '@/types';
import { Badge } from '../../ui/data-display/Badge';

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
  const shouldReduceMotion = useReducedMotion();

  return (
    <motion.div
      whileHover={shouldReduceMotion ? {} : { y: -0.5 }}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
      className="flex items-center justify-between gap-4 rounded-xl border border-border border-l-4 border-l-primary bg-surface-1/50 hover:bg-surface-1 px-5 py-4 shadow-sm transition-all duration-200"
    >
      <div className="flex items-center gap-4 min-w-0 flex-1">
        <div className="w-8 h-8 rounded-md bg-card border border-border flex items-center justify-center text-muted-foreground shrink-0 shadow-sm ring-1 ring-border/50">
          <Building2 size={16} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="truncate text-[13px] font-bold text-foreground">
              {selectedEntity.name}
            </p>
            <Badge variant="secondary" className="text-[9px] uppercase tracking-wide px-1.5 py-0.5">
              {selectedEntity.entity_type}
            </Badge>
          </div>
          <p className="truncate text-[11px] font-medium text-muted-foreground/80 mt-0.5">
            {selectedEntityMeta || '-'}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2.5 shrink-0">
        {canConvertToClient && (
          <motion.button
            type="button"
            onClick={onOpenConvertDialog}
            whileHover={shouldReduceMotion ? {} : { scale: 1.02 }}
            whileTap={shouldReduceMotion ? {} : { scale: 0.96 }}
            className="rounded-md bg-primary/5 hover:bg-primary/10 border border-primary/20 hover:border-primary/30 px-2.5 py-1 text-xs font-bold text-primary transition-colors shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 cursor-pointer"
          >
            Convertir en client
          </motion.button>
        )}
        <motion.button
          type="button"
          onClick={onClearSelectedEntity}
          whileHover={shouldReduceMotion ? {} : { scale: 1.02 }}
          whileTap={shouldReduceMotion ? {} : { scale: 0.96 }}
          className="rounded-md bg-card border border-border px-2.5 py-1 text-xs font-bold text-muted-foreground hover:text-foreground hover:border-primary/30 transition-colors shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 cursor-pointer"
        >
          Effacer
        </motion.button>
      </div>
    </motion.div>
  );
};

export default CockpitSelectedEntityCard;
