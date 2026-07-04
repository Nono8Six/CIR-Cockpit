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
      detail: `${formatCount(report?.classification.unique_cir_keys)} clés CIR`,
      tab: 'classification' as TabId,
      severity: undefined,
      icon: ListTree,
      cardClass: 'border-stone-200 bg-white',
      labelClass: 'text-stone-600',
      iconClass: 'bg-stone-100 text-stone-700'
    },
    {
      label: 'Segments fabricant',
      value: report?.segments_grids.rows_count,
      detail: `${formatCount(report?.segments_grids.unique_segment_identities)} identités`,
      tab: 'segments' as TabId,
      severity: undefined,
      icon: Database,
      cardClass: 'border-stone-200 bg-white',
      labelClass: 'text-stone-600',
      iconClass: 'bg-stone-100 text-stone-700'
    },
    {
      label: 'Anomalies',
      value: report?.anomalies.total,
      detail: `${formatCount(
        (report?.anomalies.haute ?? 0) + (report?.anomalies.moyenne ?? 0) + (report?.anomalies.faible ?? 0)
      )} non bloquantes`,
      tab: 'anomalies' as TabId,
      severity: 'all' as const,
      icon: AlertTriangle,
      cardClass: 'border-amber-200 bg-amber-50/45',
      labelClass: 'text-amber-800',
      iconClass: 'bg-amber-100 text-amber-700'
    },
    {
      label: 'Bloquantes',
      value: report?.anomalies.bloquante,
      detail: 'À traiter en priorité',
      tab: 'anomalies' as TabId,
      severity: 'bloquante' as const,
      icon: AlertOctagon,
      cardClass: 'border-red-200 bg-red-50/55',
      labelClass: 'text-red-900',
      iconClass: 'bg-red-100 text-red-700'
    }
  ] as const;

  return (
    <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {items.map(({ label, value, detail, tab, severity, icon: Icon, cardClass, labelClass, iconClass }) => {
        const Comp = onNavigate ? 'button' : 'div';
        const isClickable =
          onNavigate &&
          ((value !== undefined && value > 0) || label === 'Classification' || label === 'Segments fabricant');

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
              'group flex min-h-[6.25rem] items-center justify-between gap-4 rounded-xl border px-4 py-4 text-left shadow-none transition-[background-color,border-color,transform] duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
              cardClass,
              isClickable &&
                'cursor-pointer hover:border-stone-300/80 active:translate-y-px'
            )}
          >
            <div className="min-w-0">
              <p className={cn('truncate text-[10px] font-extrabold uppercase tracking-[0.12em]', labelClass)}>
                {label}
              </p>
              <p
                className={cn(
                  'mt-2 font-mono text-2xl font-extrabold tabular-nums leading-none tracking-tight text-stone-950',
                  label === 'Bloquantes' && value !== undefined && value > 0 && 'text-rose-600'
                )}
              >
                {isLoading ? '…' : formatCount(value)}
              </p>
              <p className="mt-1.5 truncate text-xs leading-none text-stone-500">{isLoading ? 'Chargement…' : detail}</p>
            </div>
            <div className={cn('grid size-9 shrink-0 place-items-center rounded-lg transition-colors', iconClass)}>
              <Icon className="size-4" aria-hidden="true" />
            </div>
          </Comp>
        );
      })}
    </section>
  );
};
