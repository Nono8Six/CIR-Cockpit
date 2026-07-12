import { motion } from 'motion/react';
import { CalendarCheck, LayoutList, TrendingUp, type LucideIcon } from 'lucide-react';

import type { DashboardViewMode } from '@/utils/dashboard/dashboardFilters';

type DashboardViewModeSwitchProps = {
  viewMode: DashboardViewMode;
  onViewModeChange: (mode: DashboardViewMode) => void;
};

const VIEW_TABS: Array<{ mode: DashboardViewMode; label: string; ariaLabel: string; icon: LucideIcon }> = [
  { mode: 'myday', label: 'Ma journée', ariaLabel: 'Mode Ma journée', icon: CalendarCheck },
  { mode: 'pipeline', label: 'Pipeline', ariaLabel: 'Mode Pipeline', icon: TrendingUp },
  { mode: 'list', label: 'Historique', ariaLabel: 'Mode Historique', icon: LayoutList }
];

const DashboardViewModeSwitch = ({
  viewMode,
  onViewModeChange
}: DashboardViewModeSwitchProps) => {
  return (
    <div
      className="inline-flex h-8 w-fit items-center rounded-lg border border-border bg-background p-0.5 shadow-none"
      data-testid="dashboard-view-mode-tabs"
      role="tablist"
      aria-label="Modes d'affichage"
    >
      {VIEW_TABS.map(({ mode, label, ariaLabel, icon: Icon }) => (
        <button
          key={mode}
          type="button"
          role="tab"
          aria-selected={viewMode === mode}
          onClick={() => onViewModeChange(mode)}
          className={`relative flex h-7 items-center gap-1.5 rounded-md px-2.5 text-xs font-semibold transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 ${
            viewMode === mode ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
          }`}
          aria-label={ariaLabel}
        >
          {viewMode === mode && (
            <motion.span
              layoutId="activeViewTab"
              className="absolute inset-0 rounded-md bg-surface-2 shadow-none"
              transition={{ type: 'spring', stiffness: 380, damping: 30 }}
            />
          )}
          <span className="relative z-10 flex items-center gap-1.5">
            <Icon size={13} aria-hidden="true" />
            {label}
          </span>
        </button>
      ))}

      <span className="hidden items-center pl-1 pr-0.5 sm:inline-flex">
        <kbd className="pointer-events-none select-none rounded border border-border bg-surface-1 px-1 py-0.5 font-mono text-[9px] font-medium text-muted-foreground">
          V
        </kbd>
      </span>
    </div>
  );
};

export default DashboardViewModeSwitch;
