import { cn } from '@/lib/utils';
import type {
  PricingReferenceAnomalySeverity,
  PricingReferenceHealthReport,
  PricingReferenceLinkStatus
} from '../../../../../../shared/schemas/pricing/references.schema';
import { formatCount } from '../../utils/pricing-references-formatters';

export type TabId = 'imports' | 'classification' | 'segments' | 'anomalies' | 'changements';

interface HealthStripProps {
  report: PricingReferenceHealthReport | null | undefined;
  isLoading: boolean;
  onNavigate?: (
    tab: TabId,
    filters?: {
      severity?: PricingReferenceAnomalySeverity | 'all';
      linkStatus?: PricingReferenceLinkStatus | 'all';
    }
  ) => void;
}

interface StatusCountProps {
  value: string;
  unit: string;
  ariaLabel: string;
  tone?: 'neutral' | 'warning' | 'danger';
  onClick?: () => void;
}

const toneDotClassName: Record<NonNullable<StatusCountProps['tone']>, string> = {
  neutral: 'bg-stone-300',
  warning: 'bg-amber-500',
  danger: 'bg-red-500'
};

const toneValueClassName: Record<NonNullable<StatusCountProps['tone']>, string> = {
  neutral: 'text-stone-900',
  warning: 'text-amber-800',
  danger: 'text-red-700'
};

const StatusCount = ({ value, unit, ariaLabel, tone = 'neutral', onClick }: StatusCountProps) => {
  const content = (
    <>
      {tone !== 'neutral' ? (
        <span className={cn('size-1.5 shrink-0 rounded-full', toneDotClassName[tone])} aria-hidden="true" />
      ) : null}
      <span className={cn('font-mono text-xs font-medium tabular-nums', toneValueClassName[tone])}>
        {value}
      </span>
      <span className="text-xs text-stone-500">{unit}</span>
    </>
  );

  if (!onClick) {
    return <span className="inline-flex items-center gap-1.5">{content}</span>;
  }

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      className="inline-flex items-center gap-1.5 rounded-sm transition-colors hover:[&>span:last-child]:text-stone-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
    >
      {content}
    </button>
  );
};

const Separator = () => (
  <span className="text-stone-300" aria-hidden="true">
    ·
  </span>
);

/**
 * Compact one-line health status for the active snapshot.
 * Counts navigate to the matching workspace tab; color only appears on deviations.
 */
export const HealthStrip = ({ report, isLoading, onNavigate }: HealthStripProps) => {
  if (isLoading) {
    return (
      <div className="flex h-5 items-center gap-3" aria-hidden="true">
        <span className="h-3 w-24 animate-pulse rounded bg-stone-100" />
        <span className="h-3 w-28 animate-pulse rounded bg-stone-100" />
        <span className="h-3 w-24 animate-pulse rounded bg-stone-100" />
      </div>
    );
  }

  const anomaliesTotal = report?.anomalies.total ?? 0;
  const blockingTotal = report?.anomalies.bloquante ?? 0;

  return (
    <div
      className="flex flex-wrap items-center gap-x-2.5 gap-y-1"
      data-testid="pricing-references-status-line"
    >
      <StatusCount
        value={formatCount(report?.classification.unique_cir_keys)}
        unit="clés CIR"
        ariaLabel="Voir la classification CIR"
        onClick={onNavigate ? () => onNavigate('classification') : undefined}
      />
      <Separator />
      <StatusCount
        value={formatCount(report?.segments_grids.rows_count)}
        unit="segments"
        ariaLabel="Voir les segments fabricant"
        onClick={onNavigate ? () => onNavigate('segments') : undefined}
      />
      <Separator />
      <StatusCount
        value={formatCount(anomaliesTotal)}
        unit={anomaliesTotal > 1 ? 'anomalies' : 'anomalie'}
        ariaLabel="Voir les anomalies"
        tone={anomaliesTotal > 0 ? 'warning' : 'neutral'}
        onClick={onNavigate ? () => onNavigate('anomalies', { severity: 'all' }) : undefined}
      />
      <Separator />
      <StatusCount
        value={formatCount(blockingTotal)}
        unit={blockingTotal > 1 ? 'bloquantes' : 'bloquante'}
        ariaLabel="Voir les anomalies bloquantes"
        tone={blockingTotal > 0 ? 'danger' : 'neutral'}
        onClick={onNavigate ? () => onNavigate('anomalies', { severity: 'bloquante' }) : undefined}
      />
    </div>
  );
};
