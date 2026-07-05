import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from '@/components/ui/feedback/Dialog';
import { cn } from '@/lib/utils';
import type { PricingReferenceSegmentsListResponse } from '../../../../../../shared/schemas/pricing/references.schema';
import { formatCount, linkStatusLabels } from '../../utils/pricing-references-formatters';

type SegmentRow = PricingReferenceSegmentsListResponse['rows'][number];

interface SegmentDetailDialogProps {
  segment: SegmentRow | null;
  onClose: () => void;
}

interface SegmentDetailRow {
  label: string;
  value: string;
  mono?: boolean;
}

const buildDetailRows = (segment: SegmentRow): SegmentDetailRow[] => [
  { label: 'Segment', value: segment.segment },
  { label: 'ID numérique', value: segment.idnumerique, mono: true },
  { label: 'Marque', value: segment.marque },
  { label: 'Catégorie fabricant', value: segment.cat_fab },
  { label: 'Libellé catégorie', value: segment.cat_fab_l ?? '-' },
  { label: 'Clé CIR', value: segment.cir_key ?? '-', mono: true },
  {
    label: 'Statut liaison',
    value: segment.link_status ? linkStatusLabels[segment.link_status] : '-'
  },
  { label: 'Lignes grille achat', value: formatCount(segment.purchase_grid_rows_count), mono: true }
];

/**
 * Centered dialog (command-palette style) displaying the detailed attributes of a
 * selected manufacturer segment as a hairline-separated key/value list.
 */
export const SegmentDetailDialog = ({ segment, onClose }: SegmentDetailDialogProps) => (
  <Dialog
    open={segment !== null}
    onOpenChange={(open) => {
      if (!open) onClose();
    }}
  >
    <DialogContent
      className="w-[calc(100vw-1rem)] gap-0 rounded-xl border-stone-200/60 bg-white p-0 shadow-xl sm:max-w-md"
      overlayClassName="bg-foreground/30 backdrop-blur-[2px]"
    >
      {segment ? (
        <>
          <DialogHeader className="space-y-1 border-b border-stone-200/60 px-5 py-4 text-left">
            <DialogTitle className="text-sm font-semibold text-stone-950">
              {segment.marque} · {segment.cat_fab}
            </DialogTitle>
            <DialogDescription className="font-mono text-[11px] text-stone-500">
              {segment.segment_key}
            </DialogDescription>
          </DialogHeader>
          <dl className="px-5 py-1">
            {buildDetailRows(segment).map((row) => (
              <div
                key={row.label}
                className="flex items-baseline justify-between gap-4 border-b border-stone-100 py-2.5 last:border-b-0"
              >
                <dt className="shrink-0 text-xs text-stone-500">{row.label}</dt>
                <dd
                  className={cn(
                    'min-w-0 truncate text-right text-xs font-medium text-stone-950',
                    row.mono && 'font-mono tabular-nums'
                  )}
                >
                  {row.value}
                </dd>
              </div>
            ))}
          </dl>
        </>
      ) : null}
    </DialogContent>
  </Dialog>
);
