import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { Clock, Check, Folder, Inbox } from 'lucide-react';
import type { AgencyStatus, Interaction } from '@/types';
import InteractionCard from '@/components/InteractionCard';

type KanbanColumnProps = {
  columnId: string;
  title: string;
  interactions: Interaction[];
  emptyLabel: string;
  onSelectInteraction: (interaction: Interaction) => void;
  onDeleteInteraction: (interaction: Interaction) => void;
  getStatusMeta: (interaction: Interaction) => AgencyStatus | undefined;
  activeInteractionId?: string | null;
  className?: string;
  dotClassName?: string;
};

/**
 * KanbanColumn component representing a single status lane on the dashboard.
 * Manages item layout animation, pulsing indicators, and card spacing.
 * 
 * @param {KanbanColumnProps} props - The component props.
 * @returns {React.JSX.Element} The rendered column.
 */
const KanbanColumn = ({
  columnId,
  title,
  interactions,
  emptyLabel,
  onSelectInteraction,
  onDeleteInteraction,
  getStatusMeta,
  activeInteractionId,
  className = ''
}: KanbanColumnProps) => {
  const reducedMotion = useReducedMotion();
  const isEmpty = interactions.length === 0;
  const columnMinHeightClass = 'min-h-[18rem] lg:h-full';
  const columnBodyFlexClass = 'flex-1';

  const renderHeaderIcon = () => {
    switch (columnId) {
      case 'urgencies':
        return (
          <div className="flex size-6 shrink-0 items-center justify-center rounded-full bg-destructive text-[12.5px] font-bold text-white leading-none">
            !
          </div>
        );
      case 'in-progress':
        return (
          <div className="flex size-6 shrink-0 items-center justify-center rounded-full bg-warning text-white">
            <Clock size={11} className="stroke-[3.5]" />
          </div>
        );
      case 'completed':
        return (
          <div className="flex size-6 shrink-0 items-center justify-center rounded-full bg-success text-white">
            <Check size={11} className="stroke-[3.5]" />
          </div>
        );
      default:
        return null;
    }
  };

  const renderHeaderCountBadge = () => {
    switch (columnId) {
      case 'urgencies':
        return (
          <span className="inline-flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-destructive/10 px-1.5 font-sans text-[10px] font-bold text-destructive">
            {interactions.length}
          </span>
        );
      case 'in-progress':
        return (
          <span className="inline-flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-warning/15 px-1.5 font-sans text-[10px] font-bold text-warning-foreground">
            {interactions.length}
          </span>
        );
      case 'completed':
        return (
          <span className="inline-flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-success/15 px-1.5 font-sans text-[10px] font-bold text-success">
            {interactions.length}
          </span>
        );
      default:
        return (
          <span className="inline-flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-muted/65 px-1.5 font-sans text-[10px] font-bold text-muted-foreground">
            {interactions.length}
          </span>
        );
    }
  };

  return (
    <section
      className={`flex ${columnMinHeightClass} min-w-0 flex-col overflow-hidden rounded-2xl border p-4 shadow-[0_4px_20px_rgba(0,0,0,0.015),0_1px_3px_rgba(0,0,0,0.02)] ${className}`}
      data-testid={`dashboard-kanban-column-${columnId}`}
    >
      <header className="mb-4 flex items-center justify-between px-0.5 py-0.5 select-none">
        <h3 className="flex min-w-0 items-center gap-2.5 text-[12.5px] font-extrabold uppercase tracking-wider text-foreground">
          {renderHeaderIcon()}
          <span className="truncate">{title}</span>
        </h3>
        {renderHeaderCountBadge()}
      </header>
      <div
        className={`flex min-h-0 ${columnBodyFlexClass} flex-col gap-3 overflow-y-auto px-0.5 py-0.5`}
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
                className={`w-full rounded-2xl text-left focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/40 focus-visible:ring-offset-1 transition-[box-shadow] duration-150 ${
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
                  onSelectInteraction={onSelectInteraction}
                />
              </motion.div>
            );
          })}
        </AnimatePresence>
        
        {isEmpty && (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-white py-16 px-4 text-center shadow-soft">
            {columnId === 'in-progress' ? (
              <Folder size={26} className="text-muted-foreground/45 mb-3" />
            ) : (
              <Inbox size={26} className="text-success/70 mb-3" />
            )}
            <p className="text-[12px] font-bold text-muted-foreground/80 tracking-wide">{emptyLabel}</p>
          </div>
        )}
      </div>
    </section>
  );
};

export default KanbanColumn;
