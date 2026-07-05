import { Badge } from '@/components/ui/data-display/Badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/data-display/Table';
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

const statusDotClasses: Record<PricingReferenceImportsListResponse['imports'][number]['status'], string> = {
  brouillon: 'bg-stone-400',
  analyse_en_cours: 'bg-amber-500',
  analyse_ok: 'bg-emerald-600',
  analyse_erreur: 'bg-red-600',
  pret_activation: 'bg-emerald-600',
  rejete: 'bg-red-600',
  archive: 'bg-stone-400'
};

/**
 * Renders a list of reference imports as a dense, minimalist table.
 * Rows are identified by their import date; the technical id stays available as secondary text.
 */
export const ImportRows = ({ rows, selectedImportId, onSelect }: ImportRowsProps) => {
  if (rows.length === 0) {
    return (
      <div className="rounded-xl border border-stone-200/50 bg-surface-1 p-8 text-center text-xs text-stone-500/80">
        Aucun import référentiel disponible dans l&apos;historique.
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-stone-200/50 bg-surface-1 overflow-hidden">
      <Table className="min-w-[800px] border-collapse">
        <TableHeader className="bg-surface-3/60 border-b border-stone-200/50">
          <TableRow className="hover:bg-transparent border-none">
            <TableHead className="h-8 px-4 text-[11px] font-medium text-stone-500">
              Statut
            </TableHead>
            <TableHead className="h-8 px-4 text-[11px] font-medium text-stone-500">
              Import
            </TableHead>
            <TableHead className="h-8 px-4 text-right text-[11px] font-medium text-stone-500">
              Classification
            </TableHead>
            <TableHead className="h-8 px-4 text-right text-[11px] font-medium text-stone-500">
              Segments
            </TableHead>
            <TableHead className="h-8 px-4 text-right text-[11px] font-medium text-stone-500">
              Anomalies
            </TableHead>
            <TableHead className="h-8 px-4 text-[11px] font-medium text-stone-500">
              Détails
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody className="divide-y divide-stone-200/30">
          {rows.map((row) => {
            const isSelected = selectedImportId === row.id;

            return (
              <TableRow
                key={row.id}
                tabIndex={0}
                aria-selected={isSelected}
                onClick={() => onSelect(row.id)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    onSelect(row.id);
                  }
                }}
                className={cn(
                  'cursor-pointer border-stone-200/30 transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/60 focus-visible:bg-surface-3',
                  isSelected
                    ? 'bg-surface-3 font-medium border-stone-300'
                    : 'hover:bg-surface-3/30 bg-transparent'
                )}
              >
                <TableCell className="px-4 py-2.5">
                  <Badge
                    variant={getStatusVariant(row.status)}
                    className="inline-flex items-center gap-1.5 rounded px-2 py-0.5 text-[10px] font-semibold border-transparent shadow-none"
                  >
                    <span
                      className={cn('size-1.5 rounded-full', statusDotClasses[row.status])}
                      aria-hidden="true"
                    />
                    {importStatusLabels[row.status]}
                  </Badge>
                </TableCell>
                <TableCell className="px-4 py-2.5">
                  <p className="text-xs font-medium text-stone-900">
                    Import du {formatDateTime(row.created_at)}
                  </p>
                  <p
                    className="mt-0.5 max-w-56 truncate font-mono text-[10px] text-stone-400 select-all"
                    title={row.id}
                  >
                    {row.id}
                  </p>
                </TableCell>
                <TableCell className="px-4 py-2.5 text-right font-mono text-[11px] tabular-nums text-stone-900">
                  {formatCount(row.classification_rows_count)}
                </TableCell>
                <TableCell className="px-4 py-2.5 text-right font-mono text-[11px] tabular-nums text-stone-900">
                  {formatCount(row.segments_rows_count)}
                </TableCell>
                <TableCell
                  className={cn(
                    'px-4 py-2.5 text-right font-mono text-[11px] tabular-nums',
                    row.anomalies_total && row.anomalies_total > 0
                      ? 'text-amber-800'
                      : 'text-stone-500'
                  )}
                >
                  {formatCount(row.anomalies_total)}
                </TableCell>
                <TableCell
                  className={cn(
                    'px-4 py-2.5 text-xs truncate max-w-xs',
                    row.error_message ? 'text-red-600 font-medium' : 'text-stone-300'
                  )}
                  title={row.error_message ?? undefined}
                >
                  {row.error_message ?? '—'}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
};
