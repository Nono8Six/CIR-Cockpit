import { useId } from 'react';

import { formatCompactEuro, type WeeklyEvolutionPoint } from '@/utils/dashboard/dashboardOverview';

type DashboardEvolutionChartProps = {
  points: WeeklyEvolutionPoint[];
  caption: string;
};

const CHART_WIDTH = 900;
const CHART_HEIGHT = 150;
const CHART_TOP = 10;
const CHART_BOTTOM = 144;

const buildPath = (values: number[], max: number): string => {
  const step = CHART_WIDTH / Math.max(values.length - 1, 1);
  return values
    .map((value, index) => {
      const x = index * step;
      const y = CHART_BOTTOM - (value / max) * (CHART_BOTTOM - CHART_TOP);
      return `${index === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');
};

// Courbes reconstruites depuis les dates des dossiers (creation, cloture d'etape) :
// le stock pipeline par semaine et le cumul gagne sur la fenetre affichee.
const DashboardEvolutionChart = ({ points, caption }: DashboardEvolutionChartProps) => {
  const gradientId = useId();
  const pipelineValues = points.map((point) => point.openPipelineAmount);
  const wonValues = points.map((point) => point.wonCumulativeAmount);
  const max = Math.max(...pipelineValues, ...wonValues, 0);
  const hasData = points.length >= 2 && max > 0;

  return (
    <section
      className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4 shadow-soft"
      data-testid="dashboard-evolution-chart"
      aria-label="Évolution du pipeline et du gagné"
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="text-[13.5px] font-bold text-foreground">
            Évolution du pipeline &amp; du gagné
          </h3>
          <p className="mt-0.5 text-[11.5px] text-muted-foreground">{caption}</p>
        </div>
        <div className="flex gap-4 text-[11.5px] text-foreground/80">
          <span className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-[3px] bg-primary" aria-hidden="true" />
            Pipeline ouvert
          </span>
          <span className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-[3px] bg-success" aria-hidden="true" />
            Gagné (cumul)
          </span>
        </div>
      </div>

      {hasData ? (
        <>
          <svg
            width="100%"
            height={CHART_HEIGHT}
            viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
            preserveAspectRatio="none"
            role="img"
            aria-label={`Pipeline ouvert actuel ${formatCompactEuro(pipelineValues[pipelineValues.length - 1])}, gagné cumulé ${formatCompactEuro(wonValues[wonValues.length - 1])}`}
          >
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor="hsl(var(--primary))" stopOpacity="0.14" />
                <stop offset="1" stopColor="hsl(var(--primary))" stopOpacity="0" />
              </linearGradient>
            </defs>
            {[0.25, 0.5, 0.75, 1].map((ratio) => {
              const y = CHART_BOTTOM - (CHART_BOTTOM - CHART_TOP) * ratio;
              return (
                <line
                  key={ratio}
                  x1="0"
                  y1={y}
                  x2={CHART_WIDTH}
                  y2={y}
                  className="stroke-border-subtle"
                  strokeWidth="1"
                />
              );
            })}
            <path
              d={`${buildPath(pipelineValues, max)} L${CHART_WIDTH},${CHART_HEIGHT} L0,${CHART_HEIGHT} Z`}
              fill={`url(#${gradientId})`}
            />
            <path
              d={buildPath(pipelineValues, max)}
              fill="none"
              strokeWidth="2.5"
              vectorEffect="non-scaling-stroke"
              className="stroke-primary"
            />
            <path
              d={buildPath(wonValues, max)}
              fill="none"
              strokeWidth="2.5"
              vectorEffect="non-scaling-stroke"
              className="stroke-success"
            />
          </svg>
          <div className="flex justify-between px-0.5 font-mono text-[10px] text-muted-foreground/80">
            {points.map((point, index) => (
              <span
                key={point.weekStart}
                className={index % 2 === 0 || index === points.length - 1 ? undefined : 'invisible'}
              >
                {point.label}
              </span>
            ))}
          </div>
        </>
      ) : (
        <div className="flex h-[150px] items-center justify-center rounded-md border border-dashed border-border bg-surface-1 text-xs text-muted-foreground">
          {"Pas encore d'activité commerciale datée sur les 12 dernières semaines."}
        </div>
      )}
    </section>
  );
};

export default DashboardEvolutionChart;
