import { cn } from '@/lib/utils';
import {
  formatCompactEuro,
  type TopClientEntry
} from '@/utils/dashboard/dashboardOverview';

const BAR_CLASSES = [
  'bg-primary',
  'bg-warning',
  'bg-warning/60',
  'bg-muted-foreground/35',
  'bg-muted-foreground/35'
];

type DashboardTopClientsProps = {
  entries: TopClientEntry[];
  periodLabel: string;
};

// Classement des clients par montant commercial cumule sur la periode active.
const DashboardTopClients = ({ entries, periodLabel }: DashboardTopClientsProps) => (
  <section
    className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4 shadow-soft"
    data-testid="dashboard-top-clients"
    aria-label="Top clients"
  >
    <div className="flex items-center justify-between">
      <h3 className="text-[13.5px] font-bold text-foreground">Top clients</h3>
      <span className="text-[11px] text-muted-foreground">{periodLabel}</span>
    </div>

    {entries.length === 0 ? (
      <div className="flex flex-1 items-center justify-center rounded-md border border-dashed border-border bg-surface-1 px-3 py-8 text-center text-xs text-muted-foreground">
        Aucun montant renseigné sur la période.
      </div>
    ) : (
      <div className="flex flex-col gap-2.5">
        {entries.map((entry, index) => (
          <div key={entry.key} className="flex flex-col gap-1">
            <div className="flex items-center gap-2.5">
              <span
                className={cn(
                  'inline-flex size-[22px] shrink-0 items-center justify-center rounded-md text-[10px] font-bold tabular-nums',
                  index === 0 ? 'bg-accent text-accent-foreground' : 'bg-surface-2 text-muted-foreground'
                )}
              >
                {index + 1}
              </span>
              <span className="min-w-0 flex-1 truncate text-xs text-foreground">{entry.name}</span>
              <span className="font-mono text-[11.5px] font-semibold tabular-nums text-foreground">
                {formatCompactEuro(entry.amount)}
              </span>
            </div>
            <div className="ml-[32px] h-[5px] rounded-[3px] bg-surface-2">
              <div
                className={cn(
                  'h-full rounded-[3px] transition-[width] duration-300',
                  BAR_CLASSES[index] ?? BAR_CLASSES[BAR_CLASSES.length - 1]
                )}
                style={{ width: `${Math.max(Math.round(entry.ratio * 100), 3)}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    )}
  </section>
);

export default DashboardTopClients;
