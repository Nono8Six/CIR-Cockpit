import { useId, useState } from 'react';

import { cn } from '@/lib/utils';
import { formatCompactEuro, type WeeklyEvolutionPoint } from '@/utils/dashboard/dashboardOverview';

type DashboardEvolutionChartProps = {
  points: WeeklyEvolutionPoint[];
  caption: string;
};

const CHART_WIDTH = 1000;
const CHART_HEIGHT = 132;
const GRID_RATIOS = [0, 0.5, 1];

const buildPath = (values: number[], max: number): string => {
  const step = CHART_WIDTH / Math.max(values.length - 1, 1);
  return values
    .map((value, index) => {
      const x = index * step;
      const y = CHART_HEIGHT - (value / max) * CHART_HEIGHT;
      return `${index === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');
};

const terminalOffset = (values: number[], max: number): number =>
  (1 - values[values.length - 1] / max) * 100;

// Courbes reconstruites depuis les dates des dossiers (creation, cloture d'etape).
// Le parent ne monte ce panneau que si la serie porte assez de points reels.
const DashboardEvolutionChart = ({ points, caption }: DashboardEvolutionChartProps) => {
  const gradientId = useId();
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const pipelineValues = points.map((point) => point.openPipelineAmount);
  const wonValues = points.map((point) => point.wonCumulativeAmount);
  const max = Math.max(...pipelineValues, ...wonValues, 1);
  const hoveredPoint = hoveredIndex === null ? null : points[hoveredIndex];

  return (
    <section
      className="flex shrink-0 flex-col gap-2 rounded-lg border border-border bg-card p-3.5 shadow-soft"
      data-testid="dashboard-evolution-chart"
      aria-label="Évolution du pipeline et du gagné"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div className="flex items-baseline gap-2">
          <h2 className="text-[13px] font-bold text-foreground">
            Évolution du pipeline &amp; du gagné
          </h2>
          <p className="text-[11px] text-muted-foreground">{caption}</p>
        </div>
        <div className="flex gap-3 text-[11px] text-foreground/80">
          <span className="flex items-center gap-1.5">
            <span className="size-2 rounded-[2px] bg-primary" aria-hidden="true" />
            Pipeline ouvert
          </span>
          <span className="flex items-center gap-1.5">
            <span className="size-2 rounded-[2px] bg-success" aria-hidden="true" />
            Gagné (cumul)
          </span>
        </div>
      </div>

      <div className="flex gap-2">
        <div
          className="flex w-12 shrink-0 flex-col justify-between text-right font-mono text-[11px] tabular-nums text-muted-foreground"
          style={{ height: CHART_HEIGHT }}
          aria-hidden="true"
        >
          {[...GRID_RATIOS].reverse().map((ratio) => (
            <span key={ratio} className="leading-none">
              {formatCompactEuro(max * ratio)}
            </span>
          ))}
        </div>

        <div className="relative min-w-0 flex-1" style={{ height: CHART_HEIGHT }}>
          <svg
            width="100%"
            height={CHART_HEIGHT}
            viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
            preserveAspectRatio="none"
            role="img"
            aria-label={`Pipeline ouvert ${formatCompactEuro(pipelineValues[pipelineValues.length - 1])}, gagné cumulé ${formatCompactEuro(wonValues[wonValues.length - 1])} sur ${points.length} semaines`}
          >
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor="hsl(var(--primary))" stopOpacity="0.1" />
                <stop offset="1" stopColor="hsl(var(--primary))" stopOpacity="0" />
              </linearGradient>
            </defs>
            {GRID_RATIOS.map((ratio) => (
              <line
                key={ratio}
                x1="0"
                y1={CHART_HEIGHT - CHART_HEIGHT * ratio}
                x2={CHART_WIDTH}
                y2={CHART_HEIGHT - CHART_HEIGHT * ratio}
                className="stroke-border-subtle"
                strokeWidth="1"
                vectorEffect="non-scaling-stroke"
              />
            ))}
            <path
              d={`${buildPath(pipelineValues, max)} L${CHART_WIDTH},${CHART_HEIGHT} L0,${CHART_HEIGHT} Z`}
              fill={`url(#${gradientId})`}
            />
            <path
              d={buildPath(pipelineValues, max)}
              fill="none"
              strokeWidth="2"
              vectorEffect="non-scaling-stroke"
              className="stroke-primary"
            />
            <path
              d={buildPath(wonValues, max)}
              fill="none"
              strokeWidth="2"
              vectorEffect="non-scaling-stroke"
              className="stroke-success"
            />
          </svg>

          {/* Points terminaux poses en HTML : la deformation du viewBox etirerait des cercles SVG. */}
          <span
            className="pointer-events-none absolute size-2 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-card bg-primary"
            style={{ left: '100%', top: `${terminalOffset(pipelineValues, max)}%` }}
            aria-hidden="true"
          />
          <span
            className="pointer-events-none absolute size-2 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-card bg-success"
            style={{ left: '100%', top: `${terminalOffset(wonValues, max)}%` }}
            aria-hidden="true"
          />

          <div className="absolute inset-0 flex" onMouseLeave={() => setHoveredIndex(null)}>
            {points.map((point, index) => (
              <span
                key={point.weekStart}
                className={cn(
                  'flex-1 border-l border-transparent',
                  hoveredIndex === index && 'border-border bg-surface-1/60'
                )}
                onMouseEnter={() => setHoveredIndex(index)}
              />
            ))}
          </div>

          {hoveredPoint ? (
            <div
              role="status"
              className="pointer-events-none absolute top-1 z-10 -translate-x-1/2 rounded-md border border-border bg-card px-2 py-1 shadow-soft"
              style={{
                left: `${((hoveredIndex ?? 0) + 0.5) * (100 / points.length)}%`
              }}
            >
              <p className="font-mono text-[11px] font-semibold tabular-nums text-foreground">
                {hoveredPoint.label}
              </p>
              <p className="mt-0.5 whitespace-nowrap text-[11px] text-muted-foreground">
                Pipeline{' '}
                <span className="font-mono font-semibold tabular-nums text-primary">
                  {formatCompactEuro(hoveredPoint.openPipelineAmount)}
                </span>
              </p>
              <p className="whitespace-nowrap text-[11px] text-muted-foreground">
                Gagné{' '}
                <span className="font-mono font-semibold tabular-nums text-success">
                  {formatCompactEuro(hoveredPoint.wonCumulativeAmount)}
                </span>
              </p>
            </div>
          ) : null}
        </div>
      </div>

      <div className="flex pl-14">
        <div className="flex min-w-0 flex-1 justify-between font-mono text-[11px] text-muted-foreground">
          {points.map((point, index) => (
            <span
              key={point.weekStart}
              className={index % 2 === 0 || index === points.length - 1 ? undefined : 'invisible'}
            >
              {point.label}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
};

export default DashboardEvolutionChart;
