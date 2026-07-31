import { cn } from '@/lib/utils';
import {
  formatCompactEuro,
  type OpenDossiersDelta
} from '@/utils/dashboard/dashboardOverview';

type MetricTone = 'neutral' | 'alert';

type MetricCellProps = {
  label: string;
  value: string;
  detail: string;
  tone: MetricTone;
  testId: string;
};

// Anatomie unique et non negociable pour les quatre metriques : pastille de tonalite,
// libelle, valeur, precision. Aucune cellule ne gagne ou ne perd un element.
const MetricCell = ({ label, value, detail, tone, testId }: MetricCellProps) => (
  <div
    className="flex min-w-0 flex-col gap-1 px-3.5 py-2.5 first:pl-4 last:pr-4"
    data-testid={testId}
  >
    <span className="flex items-center gap-1.5">
      <span
        className={cn(
          'size-1.5 shrink-0 rounded-full',
          tone === 'alert' ? 'bg-destructive' : 'bg-border'
        )}
        aria-hidden="true"
      />
      <span className="truncate text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
    </span>
    <span
      className={cn(
        'font-mono text-[19px] font-bold leading-none tabular-nums',
        tone === 'alert' ? 'text-destructive' : 'text-foreground'
      )}
    >
      {value}
    </span>
    <span className="truncate text-[11px] text-muted-foreground" title={detail}>
      {detail}
    </span>
  </div>
);

type DashboardKpiRowProps = {
  overdueCount: number;
  oldestOverdueDays: number | null;
  dueTodayCount: number;
  toPlanCount: number;
  openCount: number;
  openDossiersDelta: OpenDossiersDelta | null;
  pipelineOpenAmount: number;
  pipelineOpenCount: number;
};

const DashboardKpiRow = ({
  overdueCount,
  oldestOverdueDays,
  dueTodayCount,
  toPlanCount,
  openCount,
  openDossiersDelta,
  pipelineOpenAmount,
  pipelineOpenCount
}: DashboardKpiRowProps) => (
  <div
    className="grid grid-cols-2 divide-border-subtle overflow-hidden rounded-lg border border-border bg-card shadow-soft sm:grid-cols-4 sm:divide-x"
    data-testid="dashboard-kpi-row"
  >
    <MetricCell
      testId="dashboard-kpi-overdue"
      label="En retard"
      value={String(overdueCount)}
      detail={
        overdueCount > 0 && oldestOverdueDays !== null
          ? `la plus ancienne : ${oldestOverdueDays} j`
          : 'aucune relance en retard'
      }
      tone={overdueCount > 0 ? 'alert' : 'neutral'}
    />
    <MetricCell
      testId="dashboard-kpi-today"
      label="Aujourd'hui"
      value={String(dueTodayCount)}
      detail={
        toPlanCount > 0
          ? `${toPlanCount} dossier${toPlanCount > 1 ? 's' : ''} sans rappel`
          : 'tous les dossiers sont planifiés'
      }
      tone="neutral"
    />
    <MetricCell
      testId="dashboard-kpi-open"
      label="Dossiers ouverts"
      value={String(openCount)}
      detail={openDossiersDelta?.label ?? 'historique insuffisant'}
      tone="neutral"
    />
    <MetricCell
      testId="dashboard-kpi-pipeline"
      label="Pipeline ouvert"
      value={formatCompactEuro(pipelineOpenAmount)}
      detail={`${pipelineOpenCount} dossier${pipelineOpenCount > 1 ? 's' : ''} chiffré${pipelineOpenCount > 1 ? 's' : ''}`}
      tone="neutral"
    />
  </div>
);

export default DashboardKpiRow;
