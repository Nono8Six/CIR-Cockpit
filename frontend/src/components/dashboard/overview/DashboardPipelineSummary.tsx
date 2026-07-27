import { cn } from '@/lib/utils';
import {
  PIPELINE_STAGE_LABELS,
  formatPipelineAmount,
  type PipelineBoard
} from '@/utils/dashboard/dashboardPipeline';
import { formatCompactEuro, sumClosedAmounts } from '@/utils/dashboard/dashboardOverview';

type StageKey = 'unqualified' | 'qualification' | 'quote_sent' | 'negotiation';

const STAGE_ROWS: Array<{ key: StageKey; barClassName: string }> = [
  { key: 'unqualified', barClassName: 'bg-muted-foreground/35' },
  { key: 'qualification', barClassName: 'bg-warning/60' },
  { key: 'quote_sent', barClassName: 'bg-warning' },
  { key: 'negotiation', barClassName: 'bg-primary' }
];

type DashboardPipelineSummaryProps = {
  board: PipelineBoard;
};

// Etat du stock commercial par etape, avec le bilan gagne/perdu des 30 derniers jours.
const DashboardPipelineSummary = ({ board }: DashboardPipelineSummaryProps) => {
  const { wonAmount, lostAmount } = sumClosedAmounts(board.closed);
  const maxAmount = Math.max(
    ...STAGE_ROWS.map(({ key }) => board.amounts[key]),
    0
  );
  const maxCount = Math.max(...STAGE_ROWS.map(({ key }) => board[key].length), 0);

  return (
    <section
      className="flex flex-col gap-3.5 rounded-lg border border-border bg-card p-4 shadow-soft"
      data-testid="dashboard-pipeline-summary"
      aria-label="Pipeline commercial"
    >
      <div className="flex items-center justify-between">
        <h3 className="text-[13.5px] font-bold text-foreground">Pipeline commercial</h3>
        <span className="font-mono text-xs font-bold tabular-nums text-foreground">
          {formatPipelineAmount(board.openAmountTotal)}
        </span>
      </div>

      <div className="flex flex-col gap-2.5">
        {STAGE_ROWS.map(({ key, barClassName }) => {
          const count = board[key].length;
          const amount = board.amounts[key];
          // Faute de montants renseignes, la barre retombe sur le nombre de dossiers.
          const ratio = maxAmount > 0
            ? amount / maxAmount
            : maxCount > 0
              ? count / maxCount
              : 0;

          return (
            <div key={key} className="flex flex-col gap-1">
              <div className="flex items-baseline justify-between text-[11.5px]">
                <span className="text-foreground/80">
                  {PIPELINE_STAGE_LABELS[key]}
                  <span className="text-muted-foreground"> · {count}</span>
                </span>
                <span className="font-mono font-semibold tabular-nums text-foreground">
                  {amount > 0 ? formatCompactEuro(amount) : '—'}
                </span>
              </div>
              <div className="h-2 rounded-[4px] bg-surface-2">
                <div
                  className={cn('h-full rounded-[4px] transition-[width] duration-300', barClassName)}
                  style={{ width: `${Math.round(ratio * 100)}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex gap-2 border-t border-border-subtle pt-3">
        <div className="flex-1 rounded-md border border-success/25 bg-success/5 px-2.5 py-2">
          <p className="text-[10.5px] font-semibold text-success">Gagné 30 j</p>
          <p className="mt-0.5 text-[15px] font-extrabold text-foreground tabular-nums">
            {board.wonCount30d}
            {wonAmount > 0 ? (
              <span className="ml-1 font-mono text-[11px] font-semibold text-success">
                {formatCompactEuro(wonAmount)}
              </span>
            ) : null}
          </p>
        </div>
        <div className="flex-1 rounded-md border border-destructive/20 bg-destructive/5 px-2.5 py-2">
          <p className="text-[10.5px] font-semibold text-destructive">Perdu 30 j</p>
          <p className="mt-0.5 text-[15px] font-extrabold text-foreground tabular-nums">
            {board.lostCount30d}
            {lostAmount > 0 ? (
              <span className="ml-1 font-mono text-[11px] font-semibold text-destructive">
                {formatCompactEuro(lostAmount)}
              </span>
            ) : null}
          </p>
        </div>
      </div>
    </section>
  );
};

export default DashboardPipelineSummary;
