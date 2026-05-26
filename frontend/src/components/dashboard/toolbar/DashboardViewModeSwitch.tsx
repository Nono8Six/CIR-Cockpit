import { motion } from 'motion/react';
import { Columns3, LayoutList } from 'lucide-react';

type ViewMode = 'kanban' | 'list';

type DashboardViewModeSwitchProps = {
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
};

const DashboardViewModeSwitch = ({
  viewMode,
  onViewModeChange
}: DashboardViewModeSwitchProps) => {
  return (
    <div
      className="inline-flex h-8 w-fit items-center rounded-md border border-border bg-card p-0.5 shadow-soft"
      data-testid="dashboard-view-mode-tabs"
      role="tablist"
      aria-label="Modes d'affichage"
    >
      <button
        type="button"
        role="tab"
        aria-selected={viewMode === 'kanban'}
        onClick={() => onViewModeChange('kanban')}
        className={`relative flex h-[26px] items-center gap-1.5 rounded-[4px] px-2.5 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/40 ${
          viewMode === 'kanban' ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
        }`}
        aria-label="Mode Tableau"
      >
        {viewMode === 'kanban' && (
          <motion.span
            layoutId="activeViewTab"
            className="absolute inset-0 rounded-[4px] bg-surface-2 shadow-sm"
            transition={{ type: 'spring', stiffness: 380, damping: 30 }}
          />
        )}
        <span className="relative z-10 flex items-center gap-1.5">
          <Columns3 size={13} aria-hidden="true" />
          Tableau
        </span>
      </button>

      <button
        type="button"
        role="tab"
        aria-selected={viewMode === 'list'}
        onClick={() => onViewModeChange('list')}
        className={`relative flex h-[26px] items-center gap-1.5 rounded-[4px] px-2.5 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/40 ${
          viewMode === 'list' ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
        }`}
        aria-label="Mode Historique"
      >
        {viewMode === 'list' && (
          <motion.span
            layoutId="activeViewTab"
            className="absolute inset-0 rounded-[4px] bg-surface-2 shadow-sm"
            transition={{ type: 'spring', stiffness: 380, damping: 30 }}
          />
        )}
        <span className="relative z-10 flex items-center gap-1.5">
          <LayoutList size={13} aria-hidden="true" />
          Historique
        </span>
      </button>
      
      <span className="hidden items-center pl-1 pr-0.5 sm:inline-flex">
        <kbd className="pointer-events-none select-none rounded border border-border bg-surface-1 px-1 py-0.5 font-mono text-[9px] font-medium text-muted-foreground">
          V
        </kbd>
      </span>
    </div>
  );
};

export default DashboardViewModeSwitch;
