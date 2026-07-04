import { AlertOctagon, AlertTriangle, Database, ListTree } from 'lucide-react';

import { cn } from '@/lib/utils';
import type {
  PricingReferenceAnomalySeverity,
  PricingReferenceHealthReport
} from '../../../../../../shared/schemas/pricing/references.schema';
import { formatCount } from '../../utils/pricing-references-formatters';

export type TabId = 'imports' | 'classification' | 'segments' | 'links' | 'anomalies' | 'history';

interface HealthStripProps {
  report: PricingReferenceHealthReport | null | undefined;
  isLoading: boolean;
  onNavigate?: (
    tab: TabId,
    filters?: { severity?: PricingReferenceAnomalySeverity | 'all' }
  ) => void;
}

/**
 * Top horizontal summary strip displaying reference health counts.
 * Interactive buttons direct users contextually to the appropriate workspace tab.
 */
export const HealthStrip = ({ report, isLoading, onNavigate }: HealthStripProps) => {
  const items = [
    {
      label: 'Classification',
      value: report?.classification.rows_count,
      tab: 'classification' as TabId,
      severity: undefined,
      icon: ListTree,
      toneClass: 'text-slate-500'
    },
    {
      label: 'Segments',
      value: report?.segments_grids.rows_count,
      tab: 'segments' as TabId,
      severity: undefined,
      icon: Database,
      toneClass: 'text-slate-500'
    },
    {
      label: 'Anomalies',
      value: report?.anomalies.total,
      tab: 'anomalies' as TabId,
      severity: 'all' as const,
      icon: AlertTriangle,
      toneClass: 'text-stone-600'
    },
    {
      label: 'Bloquantes',
      value: report?.anomalies.bloquante,
      tab: 'anomalies' as TabId,
      severity: 'bloquante' as const,
      icon: AlertOctagon,
      toneClass: 'text-rose-600'
    }
  ] as const;

  return (
    <section className="grid overflow-hidden rounded-lg border border-slate-200/70 bg-slate-200/70 shadow-[0_22px_60px_-50px_rgba(15,23,42,0.45)] sm:grid-cols-2 xl:grid-cols-4">
      {items.map(({ label, value, tab, severity, icon: Icon, toneClass }) => {
        const Comp = onNavigate ? 'button' : 'div';
        const isClickable =
          onNavigate &&
          ((value !== undefined && value > 0) ||
            label === 'Classification' ||
            label === 'Segments');

        return (
          <Comp
            key={label}
            type={onNavigate ? 'button' : undefined}
            onClick={
              onNavigate && isClickable
                ? () => onNavigate(tab, severity !== undefined ? { severity } : undefined)
                : undefined
            }
            className={cn(
              'group flex items-center justify-between gap-4 bg-white/95 px-4 py-3 text-left transition-[background-color,color,transform] duration-200',
              isClickable &&
                'cursor-pointer hover:bg-slate-50 active:scale-[0.99]'
            )}
          >
            <div className="min-w-0">
              <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-slate-500">
                {label}
              </p>
              <p
                className={cn(
                  'mt-1 font-mono text-xl font-semibold tabular-nums leading-none tracking-tight text-slate-950',
                  label === 'Bloquantes' && value !== undefined && value > 0 && 'text-rose-600'
                )}
              >
                {isLoading ? '...' : formatCount(value)}
              </p>
            </div>
            <div className={cn('grid size-8 shrink-0 place-items-center rounded-md border border-slate-200/70 bg-slate-50 transition-colors group-hover:bg-white', toneClass)}>
              <Icon className="size-4" aria-hidden="true" />
            </div>
          </Comp>
        );
      })}
    </section>
  );
};
