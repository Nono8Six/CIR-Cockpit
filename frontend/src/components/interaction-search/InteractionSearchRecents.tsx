import { motion, useReducedMotion } from 'motion/react';
import { Building2, User } from 'lucide-react';

import type { Entity } from '@/types';
import { formatClientNumber } from '@/utils/clients/formatClientNumber';

type InteractionSearchRecentsProps = {
  recents: Entity[];
  onSelectEntity: (entity: Entity) => void;
  showTypeBadge?: boolean;
};

const InteractionSearchRecents = ({
  recents,
  onSelectEntity,
  showTypeBadge = false
}: InteractionSearchRecentsProps) => {
  const shouldReduceMotion = useReducedMotion();

  return (
    <div data-testid="interaction-search-recents" className="bg-card px-5 py-3.5 border-b border-border/60">
      <div className="flex flex-wrap items-center gap-4">
        <span className="shrink-0 text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground select-none">
          Récents
        </span>
        <div data-testid="interaction-search-recents-row" className="flex min-w-0 flex-wrap items-center gap-2.5">
          {recents.map((entity) => {
            const isIndividual =
              entity.entity_type?.toLowerCase().includes('particulier') ||
              entity.entity_type?.toLowerCase().includes('parti') ||
              entity.entity_type?.toLowerCase().includes('person');

            const Icon = isIndividual ? User : Building2;

            return (
              <motion.button
                key={entity.id}
                type="button"
                onClick={() => onSelectEntity(entity)}
                whileHover={shouldReduceMotion ? {} : { scale: 1.02, y: -0.5 }}
                whileTap={shouldReduceMotion ? {} : { scale: 0.97 }}
                transition={{ type: 'spring', stiffness: 450, damping: 25 }}
                className="inline-flex max-w-full items-center gap-2 rounded-full border border-border/80 bg-card px-3 py-1 text-xs font-semibold text-foreground/80 transition-all duration-200 hover:border-primary/40 hover:text-primary hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 cursor-pointer shadow-sm"
              >
                <Icon size={11} className="shrink-0 text-muted-foreground/60 transition-colors group-hover:text-primary" aria-hidden="true" />
                <span className="min-w-0 truncate max-w-[170px] text-foreground/90 font-medium">{entity.name}</span>
                {showTypeBadge && entity.entity_type ? (
                  <span className="shrink-0 rounded-full border border-border/80 bg-surface-3/80 px-1.5 py-[0.5px] text-[8px] font-bold uppercase tracking-widest text-foreground/80">
                    {entity.entity_type}
                  </span>
                ) : null}
                <span className="hidden font-mono text-[9px] tracking-tight text-muted-foreground sm:inline">
                  {formatClientNumber(entity.client_number)}
                </span>
              </motion.button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default InteractionSearchRecents;
