import type { Ref } from 'react';

import type { PricingReferenceAnomaliesListResponse } from '../../../../../../shared/schemas/pricing/references.schema';
import { cn } from '@/lib/utils';
import {
  EMPTY_VALUE,
  anomalySeverityDotClassName,
  getAnomalyLineContext,
  getExcelFieldLabel
} from './anomaly-utils';
import { severityLabels } from '../../utils/pricing-references-formatters';

type AnomalyRow = PricingReferenceAnomaliesListResponse['rows'][number];

interface AnomalyRowButtonProps {
  anomaly: AnomalyRow;
  onSelect: (anomalyId: string) => void;
  ref?: Ref<HTMLButtonElement>;
}

/**
 * Single 36px triage row: severity dot, mono Excel line number, message with
 * affected columns, marque and truncated line context. Opens the detail dialog.
 */
export const AnomalyRowButton = ({ anomaly, onSelect, ref }: AnomalyRowButtonProps) => {
  const lineContext = getAnomalyLineContext(anomaly);
  const columnLabels = anomaly.columns.map(getExcelFieldLabel).join(', ');
  const context = [lineContext.segment, lineContext.idnumerique, lineContext.catFab]
    .filter(Boolean)
    .join(' · ');

  return (
    <button
      ref={ref}
      type="button"
      onClick={() => onSelect(anomaly.id)}
      aria-label={`Voir le détail de l'anomalie ligne ${anomaly.source_row_number ?? 'inconnue'} : ${anomaly.message}`}
      className="flex h-9 w-full items-center gap-3 border-b border-stone-100 px-4 text-left text-xs transition-colors last:border-b-0 hover:bg-stone-50 focus-visible:bg-stone-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring/45"
    >
      <span
        className={cn('size-1.5 shrink-0 rounded-full', anomalySeverityDotClassName[anomaly.severity])}
        title={severityLabels[anomaly.severity]}
        aria-hidden="true"
      />
      <span className="w-12 shrink-0 font-mono text-[11px] tabular-nums text-stone-500">
        L. {anomaly.source_row_number ?? EMPTY_VALUE}
      </span>
      <span className="min-w-0 flex-1 truncate">
        <span className="text-stone-950">{anomaly.message}</span>
        {columnLabels ? <span className="text-stone-500"> · {columnLabels}</span> : null}
      </span>
      {lineContext.marque ? (
        <span className="shrink-0 text-[11px] text-stone-500">{lineContext.marque}</span>
      ) : null}
      {context ? (
        <span className="hidden w-44 shrink-0 truncate text-right text-[11px] text-stone-500 md:block">
          {context}
        </span>
      ) : null}
    </button>
  );
};
