import { CalendarCheck, History, TrendingUp, type LucideIcon } from 'lucide-react';

import { cn } from '@/lib/utils';
import type { DashboardViewMode } from '@/utils/dashboard/dashboardFilters';
import { formatPipelineAmount } from '@/utils/dashboard/dashboardPipeline';

export type DashboardHeaderStats = {
  overdueCount: number;
  dueTodayCount: number;
  openCount: number;
  pipelineOpenCount: number;
  pipelineOpenAmount: number;
  wonCount30d: number;
  lostCount30d: number;
};

type DashboardPageHeaderProps = {
  stats: DashboardHeaderStats;
  viewMode: DashboardViewMode;
  onViewModeChange: (mode: DashboardViewMode) => void;
};

const VIEW_TABS: Array<{
  mode: DashboardViewMode;
  label: string;
  ariaLabel: string;
  icon: LucideIcon;
}> = [
  { mode: 'myday', label: 'Ma journée', ariaLabel: 'Mode Ma journée', icon: CalendarCheck },
  { mode: 'pipeline', label: 'Pipeline', ariaLabel: 'Mode Pipeline', icon: TrendingUp },
  { mode: 'list', label: 'Historique', ariaLabel: 'Mode Historique', icon: History }
];

const DashboardPageHeader = ({ stats, viewMode, onViewModeChange }: DashboardPageHeaderProps) => {
  const hasOverdue = stats.overdueCount > 0;
  const tabCounts: Partial<Record<DashboardViewMode, { value: number; isAlert: boolean }>> = {
    myday: {
      value: stats.overdueCount + stats.dueTodayCount,
      isAlert: hasOverdue
    },
    pipeline: { value: stats.pipelineOpenCount, isAlert: false }
  };

  return (
    <div className="flex shrink-0 flex-col gap-2" data-testid="dashboard-page-header">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <div className="flex min-w-0 flex-wrap items-baseline gap-2.5">
          <h1 className="text-xl font-semibold leading-none tracking-tight text-foreground text-pretty">
            Pilotage
          </h1>
          <span className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <span
              className={cn('size-1.5 rounded-full', hasOverdue ? 'bg-destructive' : 'bg-emerald-500')}
              aria-hidden="true"
            />
            {hasOverdue
              ? `${stats.overdueCount} relance${stats.overdueCount > 1 ? 's' : ''} en retard`
              : 'Relances à jour'}
          </span>
        </div>

        <p
          className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5 text-[11.5px] text-muted-foreground"
          data-testid="dashboard-header-stats"
        >
          <span>
            <span className="font-mono font-semibold tabular-nums text-foreground">{stats.openCount}</span>
            {' dossiers ouverts'}
          </span>
          <span aria-hidden="true" className="text-border">·</span>
          <span>
            {'pipeline '}
            <span className="font-mono font-semibold tabular-nums text-foreground">
              {formatPipelineAmount(stats.pipelineOpenAmount)}
            </span>
          </span>
          <span aria-hidden="true" className="text-border">·</span>
          <span>
            <span className="font-mono font-semibold tabular-nums text-success">{stats.wonCount30d}</span>
            {' gagné'}{stats.wonCount30d > 1 ? 's' : ''}
            {' / '}
            <span className="font-mono font-semibold tabular-nums text-destructive">{stats.lostCount30d}</span>
            {' perdu'}{stats.lostCount30d > 1 ? 's' : ''}
            {' sur 30 j'}
          </span>
        </p>
      </div>

      <div
        className="select-none overflow-x-auto"
        data-testid="dashboard-view-mode-tabs"
        role="tablist"
        aria-label="Vues du pilotage"
      >
        <div className="flex h-9 w-full min-w-max items-center justify-start gap-5 border-b border-border-subtle">
          {VIEW_TABS.map(({ mode, label, ariaLabel, icon: Icon }) => {
            const isActive = viewMode === mode;
            const count = tabCounts[mode];

            return (
              <button
                key={mode}
                type="button"
                role="tab"
                aria-selected={isActive}
                aria-label={ariaLabel}
                onClick={() => onViewModeChange(mode)}
                className={cn(
                  'relative flex h-9 items-center gap-1.5 px-1 text-xs transition-colors duration-100',
                  'after:absolute after:inset-x-0 after:-bottom-px after:h-0.5 after:bg-transparent',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30',
                  isActive
                    ? 'font-medium text-foreground after:bg-primary'
                    : 'font-normal text-muted-foreground hover:text-foreground'
                )}
              >
                <Icon size={13} aria-hidden="true" className={isActive ? 'text-primary' : undefined} />
                <span className="whitespace-nowrap">{label}</span>
                {count && count.value > 0 ? (
                  <span
                    className={cn(
                      'font-mono text-[11px] tabular-nums',
                      count.isAlert ? 'font-semibold text-destructive' : 'text-muted-foreground/70'
                    )}
                  >
                    {count.value}
                  </span>
                ) : null}
              </button>
            );
          })}
          <span className="ml-auto hidden items-center pl-2 sm:inline-flex">
            <kbd className="pointer-events-none select-none rounded border border-border bg-surface-1 px-1 py-0.5 font-mono text-[9px] font-medium text-muted-foreground">
              V
            </kbd>
          </span>
        </div>
      </div>
    </div>
  );
};

export default DashboardPageHeader;
