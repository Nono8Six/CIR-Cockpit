import { Badge } from '@/components/ui/data-display/Badge';
import { cn } from '@/lib/utils';
import type { PricingReferenceImportsListResponse } from '../../../../../../shared/schemas/pricing/references.schema';
import {
  formatCount,
  formatDateTime,
  getStatusVariant,
  importStatusLabels
} from '../../utils/pricing-references-formatters';

interface ImportRowsProps {
  rows: PricingReferenceImportsListResponse['imports'];
  selectedImportId: string | null;
  onSelect: (importId: string) => void;
}

/**
 * Renders a list of reference imports.
 * Optimized for click target sizes and interactive feedback.
 */
export const ImportRows = ({ rows, selectedImportId, onSelect }: ImportRowsProps) => {
  if (rows.length === 0) {
    return (
      <div className="p-8 text-center text-sm text-muted-foreground border border-border/70 bg-background/50 rounded-lg">
        Aucun import référentiel disponible.
      </div>
    );
  }

  return (
    <div className="divide-y divide-border/60 border border-border/70 bg-background shadow-sm rounded-lg overflow-hidden">
      {rows.map((row) => (
        <button
          key={row.id}
          type="button"
          onClick={() => onSelect(row.id)}
          className={cn(
            'grid w-full gap-2 px-4 py-3 text-left transition-[background-color,border-color] hover:bg-primary/[0.035] md:grid-cols-[9rem_10rem_minmax(0,1fr)_8rem_8rem] items-center',
            selectedImportId === row.id && 'bg-primary/[0.055]'
          )}
        >
          <span>
            <Badge variant={getStatusVariant(row.status)} className="px-2 py-0.5 text-[10px]">
              {importStatusLabels[row.status]}
            </Badge>
          </span>
          <span className="font-mono text-xs text-muted-foreground">
            {formatDateTime(row.created_at)}
          </span>
          <span className="min-w-0 truncate text-xs text-foreground font-medium">
            {row.error_message ?? row.id}
          </span>
          <span className="font-mono text-xs tabular-nums text-muted-foreground">
            {formatCount(row.classification_rows_count)}
          </span>
          <span className="font-mono text-xs tabular-nums text-muted-foreground">
            {formatCount(row.anomalies_total)}
          </span>
        </button>
      ))}
    </div>
  );
};
