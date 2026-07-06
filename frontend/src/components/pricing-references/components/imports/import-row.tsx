import type { PricingReferenceImportStatus, PricingReferenceImportsListResponse } from '../../../../../../shared/schemas/pricing/references.schema';
import { cn } from '@/lib/utils';
import { formatCount, formatDateTime, importStatusLabels } from '../../utils/pricing-references-formatters';

type ImportSummary = PricingReferenceImportsListResponse['imports'][number];

export const importStatusDotClassName: Record<PricingReferenceImportStatus, string> = {
  brouillon: 'bg-stone-300',
  analyse_en_cours: 'bg-amber-500',
  analyse_ok: 'bg-emerald-500',
  analyse_erreur: 'bg-red-500',
  pret_activation: 'bg-emerald-500',
  rejete: 'bg-red-500',
  archive: 'bg-stone-300'
};

interface ImportRowProps {
  row: ImportSummary;
  isActive?: boolean;
  onOpenDetail: (importId: string) => void;
}

/**
 * Single 40px chronological import row: status dot + label, "Import du {date}",
 * truncated error message, and three fixed mono counter columns at the right
 * (classification / segments / anomalies). The UUID lives in the detail dialog.
 */
export const ImportRow = ({ row, isActive = false, onOpenDetail }: ImportRowProps) => (
  <button
    type="button"
    onClick={() => onOpenDetail(row.id)}
    aria-label={`Voir le détail de l'import du ${formatDateTime(row.created_at)}`}
    className={cn(
      'flex h-10 w-full items-center gap-3 border-b border-stone-100 px-4 text-left transition-colors last:border-b-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring/45',
      isActive
        ? 'bg-surface-1 hover:bg-surface-1 focus-visible:bg-surface-1'
        : 'hover:bg-stone-50 focus-visible:bg-stone-50'
    )}
  >
    <span
      className={cn('size-1.5 shrink-0 rounded-full', importStatusDotClassName[row.status])}
      aria-hidden="true"
    />
    <span className="w-28 shrink-0 truncate text-[11px] text-stone-500">
      {importStatusLabels[row.status]}
    </span>
    <span className="shrink-0 whitespace-nowrap text-xs font-medium text-stone-950">
      Import du {formatDateTime(row.created_at)}
    </span>
    {row.error_message ? (
      <span className="min-w-0 flex-1 truncate text-[11px] text-red-700" title={row.error_message}>
        {row.error_message}
      </span>
    ) : (
      <span className="min-w-0 flex-1" aria-hidden="true" />
    )}
    <span className="hidden w-20 shrink-0 text-right font-mono text-[11px] tabular-nums text-stone-500 sm:block">
      {formatCount(row.classification_rows_count)}
    </span>
    <span className="hidden w-20 shrink-0 text-right font-mono text-[11px] tabular-nums text-stone-500 sm:block">
      {formatCount(row.segments_rows_count)}
    </span>
    <span
      className={cn(
        'w-20 shrink-0 text-right font-mono text-[11px] tabular-nums',
        row.anomalies_total && row.anomalies_total > 0 ? 'text-amber-700' : 'text-stone-500'
      )}
    >
      {formatCount(row.anomalies_total)}
    </span>
  </button>
);
