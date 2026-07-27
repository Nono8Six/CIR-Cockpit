import { cn } from '@/lib/utils';
import {
  formatCompactEuro,
  type WeeklyEvolutionPoint
} from '@/utils/dashboard/dashboardOverview';

type SparklineProps = {
  values: number[];
  className: string;
};

// Mini-courbe normalisee sur la fenetre : n'affiche rien tant que la serie est plate a zero.
const Sparkline = ({ values, className }: SparklineProps) => {
  if (values.length < 2 || values.every((value) => value === 0)) {
    return <div className="h-[22px]" aria-hidden="true" />;
  }

  const max = Math.max(...values);
  const min = Math.min(...values);
  const range = max - min || 1;
  const step = 100 / (values.length - 1);
  const points = values
    .map((value, index) => {
      const x = index * step;
      const y = 19 - ((value - min) / range) * 16;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');

  return (
    <svg
      width="100%"
      height="22"
      viewBox="0 0 100 22"
      preserveAspectRatio="none"
      aria-hidden="true"
      className="overflow-visible"
    >
      <polyline
        points={points}
        fill="none"
        strokeWidth="2"
        vectorEffect="non-scaling-stroke"
        className={className}
      />
    </svg>
  );
};

type DeltaTone = 'up-bad' | 'up-good' | 'down-bad' | 'down-good';

const deltaToneClass: Record<DeltaTone, string> = {
  'up-bad': 'text-primary',
  'up-good': 'text-success',
  'down-bad': 'text-primary',
  'down-good': 'text-success'
};

const formatWeeklyDelta = (
  current: number,
  previous: number,
  positiveIsGood: boolean
): { label: string; tone: DeltaTone } | null => {
  const delta = current - previous;
  if (delta === 0) {
    return null;
  }

  const rising = delta > 0;
  const tone: DeltaTone = rising
    ? positiveIsGood ? 'up-good' : 'up-bad'
    : positiveIsGood ? 'down-bad' : 'down-good';

  return { label: `${rising ? '▲' : '▼'} ${Math.abs(delta)}`, tone };
};

type KpiCardProps = {
  label: string;
  value: string;
  valueClassName?: string;
  accent?: boolean;
  secondary?: { label: string; className: string } | null;
  sparkline?: { values: number[]; className: string } | null;
  testId: string;
};

const KpiCard = ({ label, value, valueClassName, accent, secondary, sparkline, testId }: KpiCardProps) => (
  <div
    className={cn(
      'flex flex-col gap-2 rounded-lg border border-border bg-card p-3.5 shadow-soft',
      accent && 'border-l-[3px] border-l-primary'
    )}
    data-testid={testId}
  >
    <span className="text-[10.5px] font-semibold uppercase tracking-wide text-muted-foreground">
      {label}
    </span>
    <div className="flex items-end justify-between gap-2">
      <span
        className={cn(
          'text-[28px] font-extrabold leading-none tracking-tight text-foreground tabular-nums',
          valueClassName
        )}
      >
        {value}
      </span>
      {secondary ? (
        <span className={cn('pb-0.5 text-[11px] font-semibold', secondary.className)}>
          {secondary.label}
        </span>
      ) : null}
    </div>
    {sparkline ? (
      <Sparkline values={sparkline.values} className={sparkline.className} />
    ) : (
      <div className="h-[22px]" aria-hidden="true" />
    )}
  </div>
);

type DashboardKpiRowProps = {
  overdueCount: number;
  oldestOverdueDays: number | null;
  dueTodayCount: number;
  toPlanCount: number;
  openCount: number;
  pipelineOpenAmount: number;
  pipelineOpenCount: number;
  wonCount30d: number;
  lostCount30d: number;
  conversionRate: number | null;
  evolution: WeeklyEvolutionPoint[];
};

const DashboardKpiRow = ({
  overdueCount,
  oldestOverdueDays,
  dueTodayCount,
  toPlanCount,
  openCount,
  pipelineOpenAmount,
  pipelineOpenCount,
  wonCount30d,
  lostCount30d,
  conversionRate,
  evolution
}: DashboardKpiRowProps) => {
  const openSeries = evolution.map((point) => point.openDossiersCount);
  const pipelineSeries = evolution.map((point) => point.openPipelineAmount);
  const wonSeries = evolution.map((point) => point.wonCumulativeAmount);

  const openDelta =
    openSeries.length >= 2
      ? formatWeeklyDelta(openSeries[openSeries.length - 1], openSeries[openSeries.length - 2], false)
      : null;

  return (
    <div
      className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5"
      data-testid="dashboard-kpi-row"
    >
      <KpiCard
        testId="dashboard-kpi-overdue"
        label="Relances en retard"
        value={String(overdueCount)}
        accent={overdueCount > 0}
        secondary={
          overdueCount > 0 && oldestOverdueDays !== null
            ? { label: `max ${oldestOverdueDays} j`, className: 'text-primary' }
            : null
        }
      />
      <KpiCard
        testId="dashboard-kpi-today"
        label="À faire aujourd'hui"
        value={String(dueTodayCount)}
        secondary={
          toPlanCount > 0
            ? { label: `+ ${toPlanCount} à planifier`, className: 'text-warning-foreground' }
            : null
        }
      />
      <KpiCard
        testId="dashboard-kpi-open"
        label="Dossiers ouverts"
        value={String(openCount)}
        secondary={openDelta ? { label: openDelta.label, className: deltaToneClass[openDelta.tone] } : null}
        sparkline={{ values: openSeries, className: 'stroke-warning' }}
      />
      <KpiCard
        testId="dashboard-kpi-pipeline"
        label="Pipeline ouvert"
        value={formatCompactEuro(pipelineOpenAmount)}
        valueClassName="font-mono text-[22px]"
        secondary={{ label: `${pipelineOpenCount} dossiers`, className: 'text-muted-foreground' }}
        sparkline={{ values: pipelineSeries, className: 'stroke-primary' }}
      />
      <KpiCard
        testId="dashboard-kpi-conversion"
        label="Taux conversion"
        value={conversionRate === null ? '—' : `${conversionRate}%`}
        secondary={{
          label: `${wonCount30d} gagnés / ${lostCount30d} perdus`,
          className: 'text-muted-foreground'
        }}
        sparkline={{ values: wonSeries, className: 'stroke-success' }}
      />
    </div>
  );
};

export default DashboardKpiRow;
