import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import type { AgencyStatus, Interaction } from '@/types';
import InteractionCard from '@/components/InteractionCard';

type KanbanColumnProps = {
  columnId: string;
  title: string;
  dotClassName: string;
  toneClassName?: string;
  interactions: Interaction[];
  emptyLabel: string;
  onSelectInteraction: (interaction: Interaction) => void;
  onDeleteInteraction: (interaction: Interaction) => void;
  getStatusMeta: (interaction: Interaction) => AgencyStatus | undefined;
  activeInteractionId?: string | null;
};

const KanbanColumn = ({
  columnId,
  title,
  dotClassName,
  toneClassName = 'border-border-subtle bg-surface-1',
  interactions,
  emptyLabel,
  onSelectInteraction,
  onDeleteInteraction,
  getStatusMeta,
  activeInteractionId
}: KanbanColumnProps) => {
  const reducedMotion = useReducedMotion();

  return (
    <section
      className="flex min-h-[17rem] min-w-0 flex-col overflow-hidden rounded-lg border border-border bg-surface-2 p-2 shadow-soft"
      data-testid={`dashboard-kanban-column-${columnId}`}
    >
      <header className={`mb-2 flex items-center justify-between rounded-md border px-2 py-2 shadow-[inset_0_1px_0_hsl(var(--background)/0.75)] ${toneClassName}`}>
        <h3 className="flex min-w-0 items-center gap-2 text-xs font-semibold text-foreground">
          <span className="relative flex size-2">
            <span className={`absolute inline-flex h-full w-full rounded-full opacity-20 ${dotClassName}`} style={{ transform: 'scale(2)' }} />
            <span className={`relative inline-flex size-2 rounded-full ${dotClassName}`} aria-hidden="true" />
          </span>
          <span className="truncate">{title}</span>
        </h3>
        <span className="inline-flex h-5 min-w-5 shrink-0 items-center justify-center rounded-md border border-border/70 bg-background/80 px-1.5 font-mono text-[10px] font-semibold text-foreground shadow-soft">
          {interactions.length}
        </span>
      </header>
      <div
        className="flex min-h-0 flex-1 flex-col gap-1.5 overflow-y-auto px-1 py-1"
        data-testid={`dashboard-kanban-column-body-${columnId}`}
      >
        <AnimatePresence mode="popLayout" initial={!reducedMotion}>
          {interactions.map((interaction) => {
            const isActive = activeInteractionId === interaction.id;

            return (
              <motion.div
                key={interaction.id}
                layout={!reducedMotion}
                initial={!reducedMotion ? { opacity: 0, y: 12, scale: 0.97 } : undefined}
                animate={!reducedMotion ? { opacity: 1, y: 0, scale: 1 } : undefined}
                exit={!reducedMotion ? { opacity: 0, y: -12, scale: 0.97 } : undefined}
                transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                role="button"
                tabIndex={0}
                onClick={() => onSelectInteraction(interaction)}
                onKeyDown={(event) => {
                  if (event.target !== event.currentTarget) {
                     return;
                  }
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    onSelectInteraction(interaction);
                  }
                }}
                className={`w-full rounded-lg text-left focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/40 focus-visible:ring-offset-1 transition-[box-shadow] duration-150 ${
                  isActive 
                    ? 'ring-2 ring-primary/40 shadow-md' 
                    : ''
                }`}
                aria-label={`Ouvrir ${interaction.company_name}`}
                data-testid={`dashboard-kanban-card-${interaction.id}`}
              >
                <InteractionCard
                  data={interaction}
                  statusMeta={getStatusMeta(interaction)}
                  onDeleteInteraction={onDeleteInteraction}
                />
              </motion.div>
            );
          })}
        </AnimatePresence>
        
        {interactions.length === 0 && (
          <div className="rounded-md border border-dashed border-border bg-card/80 py-12 text-center text-xs font-medium text-muted-foreground">
            {emptyLabel}
          </div>
        )}
      </div>
    </section>
  );
};

export default KanbanColumn;
