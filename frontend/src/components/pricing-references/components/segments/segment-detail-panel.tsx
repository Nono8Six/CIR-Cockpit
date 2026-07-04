import { Button } from '@/components/ui/inputs/basic/Button';
import type { PricingReferenceSegmentsListResponse } from '../../../../../../shared/schemas/pricing/references.schema';
import { formatCount, linkStatusLabels } from '../../utils/pricing-references-formatters';

type SegmentRow = PricingReferenceSegmentsListResponse['rows'][number];

interface SegmentDetailPanelProps {
  segment: SegmentRow | null;
  onClose: () => void;
}

/**
 * Side/bottom detail drawer displaying detailed attributes for a selected manufacturer segment.
 */
export const SegmentDetailPanel = ({ segment, onClose }: SegmentDetailPanelProps) => {
  if (!segment) return null;

  const detailRows = [
    ['Segment', segment.segment],
    ['ID numérique', segment.idnumerique],
    ['Marque', segment.marque],
    ['Catégorie fabricant', segment.cat_fab],
    ['Libellé catégorie', segment.cat_fab_l ?? '-'],
    ['Clé CIR', segment.cir_key ?? '-'],
    ['Statut liaison', segment.link_status ? linkStatusLabels[segment.link_status] : '-'],
    ['Lignes grille achat', formatCount(segment.purchase_grid_rows_count)]
  ];

  return (
    <aside className="border border-border/70 bg-surface-1 p-4 rounded-lg shadow-sm h-fit">
      <div className="mb-4 flex items-start justify-between gap-3 border-b border-border/30 pb-2.5">
        <div className="min-w-0">
          <h3 className="truncate text-sm font-semibold text-foreground font-sans">
            {segment.marque} · {segment.cat_fab}
          </h3>
          <p className="mt-1 truncate font-mono text-[11px] text-muted-foreground">
            {segment.segment_key}
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onClose}
          className="h-7 text-xs px-2.5"
        >
          Fermer
        </Button>
      </div>
      <dl className="grid gap-2.5 sm:grid-cols-2">
        {detailRows.map(([label, value]) => (
          <div
            key={label}
            className="min-w-0 border border-border/60 bg-background px-3 py-2 rounded-lg"
          >
            <dt className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              {label}
            </dt>
            <dd className="mt-1 truncate text-xs font-semibold text-foreground">{value}</dd>
          </div>
        ))}
      </dl>
    </aside>
  );
};
