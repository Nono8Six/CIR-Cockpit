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
  viewMode: 'classification' | 'segments';
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
 * Optimized for keyboard access, screen readers, and pixel-perfect layouts.
 *
 * @param props Component props
 */
export const ImportRows = ({ rows, selectedImportId, onSelect, viewMode }: ImportRowsProps) => {
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
            <TableHead className="h-8 px-4 text-[10px] font-bold uppercase tracking-wider text-stone-500">
              Statut
            </TableHead>
            <TableHead className="h-8 px-4 text-[10px] font-bold uppercase tracking-wider text-stone-500">
              Identifiant d&apos;import
            </TableHead>
            <TableHead className="h-8 px-4 text-[10px] font-bold uppercase tracking-wider text-stone-500">
              Date d&apos;import
            </TableHead>
            <TableHead className="h-8 px-4 text-right text-[10px] font-bold uppercase tracking-wider text-stone-500">
              {viewMode === 'classification' ? 'Lignes (Classification)' : 'Lignes (Segments)'}
            </TableHead>
            <TableHead className="h-8 px-4 text-right text-[10px] font-bold uppercase tracking-wider text-stone-500">
              Anomalies
            </TableHead>
            <TableHead className="h-8 px-4 text-[10px] font-bold uppercase tracking-wider text-stone-500">
              Détails
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody className="divide-y divide-stone-200/30">
          {rows.map((row) => {
            const isSelected = selectedImportId === row.id;
            const lineCount = viewMode === 'classification' ? row.classification_rows_count : row.segments_rows_count;
            const detailText = row.error_message || (row.status === 'analyse_ok' || row.status === 'pret_activation' ? 'Aucun signal' : '-');

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
                <TableCell className="px-4 py-2.5 font-mono text-[11px] text-stone-900 font-bold select-all">
                  {row.id}
                </TableCell>
                <TableCell className="px-4 py-2.5 font-sans text-xs text-stone-600">
                  {formatDateTime(row.created_at)}
                </TableCell>
                <TableCell className="px-4 py-2.5 text-right font-mono text-[11px] tabular-nums text-stone-900">
                  {formatCount(lineCount)}
                </TableCell>
                <TableCell
                  className={cn(
                    'px-4 py-2.5 text-right font-mono text-[11px] tabular-nums',
                    row.anomalies_total && row.anomalies_total > 0 ? 'text-red-600 font-bold' : 'text-stone-500'
                  )}
                >
                  {formatCount(row.anomalies_total)}
                </TableCell>
                <TableCell
                  className={cn(
                    'px-4 py-2.5 text-xs truncate max-w-xs',
                    row.error_message ? 'text-red-600 font-medium' : 'text-stone-400 italic'
                  )}
                  title={row.error_message ?? undefined}
                >
                  {detailText}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
};
