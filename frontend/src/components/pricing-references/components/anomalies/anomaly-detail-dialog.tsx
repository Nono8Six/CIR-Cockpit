import { useEffect } from 'react';
import { ArrowDown, ArrowUp, X } from 'lucide-react';

import type { PricingReferenceAnomaliesListResponse } from '../../../../../../shared/schemas/pricing/references.schema';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from '@/components/ui/feedback/Dialog';
import { Button } from '@/components/ui/inputs/basic/Button';
import { cn } from '@/lib/utils';
import {
  anomalyTypeActionLabels,
  anomalyTypeLabels,
  severityLabels
} from '../../utils/pricing-references-formatters';
import {
  EMPTY_VALUE,
  anomalySeverityDotClassName,
  formatDetailValue,
  getAnomalyLineContext,
  getAnomalySourceLabel,
  getExcelFieldLabel,
  getRawValues
} from './anomaly-utils';

type AnomalyRow = PricingReferenceAnomaliesListResponse['rows'][number];

interface AnomalyDetailDialogProps {
  anomaly: AnomalyRow | null;
  position: { index: number; total: number } | null;
  onNavigate: (delta: -1 | 1) => void;
  onClose: () => void;
  onCloseAutoFocus: (event: Event) => void;
}

interface DetailRow {
  label: string;
  value: string;
  mono?: boolean;
  monoLabel?: boolean;
}

const buildDetailRows = (anomaly: AnomalyRow): DetailRow[] => {
  const lineContext = getAnomalyLineContext(anomaly);
  const rows: DetailRow[] = [
    { label: 'Message', value: anomaly.message },
    { label: 'Action de correction', value: anomalyTypeActionLabels[anomaly.type] },
    { label: 'Fichier source', value: getAnomalySourceLabel(anomaly) },
    { label: 'Ligne Excel', value: anomaly.source_row_number?.toString() ?? EMPTY_VALUE, mono: true },
    { label: 'Marque', value: lineContext.marque ?? EMPTY_VALUE },
    { label: 'Catégorie fabricant', value: lineContext.catFab ?? EMPTY_VALUE },
    { label: 'Segment', value: lineContext.segment ?? EMPTY_VALUE },
    { label: 'ID numérique', value: lineContext.idnumerique ?? EMPTY_VALUE, mono: true }
  ];
  if (lineContext.cirKey) {
    rows.push({ label: 'Clé CIR', value: lineContext.cirKey, mono: true });
  }
  if (anomaly.columns.length > 0) {
    rows.push({
      label: 'Colonnes concernées',
      value: anomaly.columns.map(getExcelFieldLabel).join(', ')
    });
  }
  return rows;
};

const buildComplementaryRows = (anomaly: AnomalyRow): DetailRow[] =>
  Object.entries(anomaly.details)
    .filter(([key]) =>
      !['raw_values', 'segment_key', 'cir_key', 'classification_key', 'marque', 'cat_fab'].includes(key)
    )
    .map(([key, value]) => ({ label: key, value: formatDetailValue(value), mono: true, monoLabel: true }))
    .filter((row) => row.value !== EMPTY_VALUE);

const DetailRowItem = ({ label, value, mono, monoLabel }: DetailRow) => (
  <div className="grid grid-cols-[8.5rem_minmax(0,1fr)] items-baseline gap-x-4 border-b border-stone-100 py-2 last:border-b-0">
    <dt
      className={cn(
        'text-xs text-stone-500',
        monoLabel && 'break-all font-mono text-[11px]'
      )}
    >
      {label}
    </dt>
    <dd
      className={cn(
        'min-w-0 break-words text-xs font-medium leading-relaxed text-stone-950',
        mono && 'font-mono text-[11px] tabular-nums'
      )}
    >
      {value}
    </dd>
  </div>
);

/**
 * Centered detail dialog (command-palette style) for one anomaly, with in-group
 * navigation: up/down buttons plus ArrowUp/ArrowDown and j/k shortcuts. Focus is
 * handed back to the originating row on close via onCloseAutoFocus.
 */
export const AnomalyDetailDialog = ({
  anomaly,
  position,
  onNavigate,
  onClose,
  onCloseAutoFocus
}: AnomalyDetailDialogProps) => {
  const isOpen = anomaly !== null;

  // Document-level shortcuts: a header nav button can become disabled while
  // focused (first/last anomaly), dropping focus to body — keys must keep working.
  useEffect(() => {
    if (!isOpen) return undefined;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented) return;
      const target = event.target instanceof HTMLElement ? event.target : null;
      if (target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) return;
      if (event.key === 'ArrowDown' || event.key === 'j') {
        event.preventDefault();
        onNavigate(1);
      } else if (event.key === 'ArrowUp' || event.key === 'k') {
        event.preventDefault();
        onNavigate(-1);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onNavigate]);

  const rawValues = anomaly ? getRawValues(anomaly.details) : {};
  const rawValueEntries = Object.entries(rawValues);
  const complementaryRows = anomaly ? buildComplementaryRows(anomaly) : [];
  const canGoPrevious = position !== null && position.index > 0;
  const canGoNext = position !== null && position.index < position.total - 1;

  return (
    <Dialog
      open={anomaly !== null}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent
        className="w-[calc(100vw-1rem)] gap-0 rounded-xl border-stone-200/60 bg-white p-0 shadow-xl sm:max-w-lg"
        overlayClassName="bg-foreground/30 backdrop-blur-[2px]"
        showCloseButton={false}
        onCloseAutoFocus={onCloseAutoFocus}
      >
        {anomaly ? (
          <>
            <DialogHeader className="border-b border-stone-200/60 px-5 py-4 text-left">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 space-y-1">
                  <DialogTitle className="text-sm font-semibold tracking-tight text-stone-950">
                    {anomalyTypeLabels[anomaly.type]}
                  </DialogTitle>
                  <DialogDescription className="flex flex-wrap items-center gap-1.5 text-[11px] text-stone-500">
                    <span
                      className={cn(
                        'size-1.5 rounded-full',
                        anomalySeverityDotClassName[anomaly.severity]
                      )}
                      aria-hidden="true"
                    />
                    {severityLabels[anomaly.severity]}
                    <span className="text-stone-300" aria-hidden="true">·</span>
                    <span className="font-mono tabular-nums">
                      L. {anomaly.source_row_number ?? EMPTY_VALUE}
                    </span>
                  </DialogDescription>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-7 rounded-md text-stone-500 hover:bg-stone-100 hover:text-stone-950"
                    onClick={() => onNavigate(-1)}
                    disabled={!canGoPrevious}
                    aria-label="Anomalie précédente"
                  >
                    <ArrowUp className="size-3.5" aria-hidden="true" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-7 rounded-md text-stone-500 hover:bg-stone-100 hover:text-stone-950"
                    onClick={() => onNavigate(1)}
                    disabled={!canGoNext}
                    aria-label="Anomalie suivante"
                  >
                    <ArrowDown className="size-3.5" aria-hidden="true" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-7 rounded-md text-stone-500 hover:bg-stone-100 hover:text-stone-950"
                    onClick={onClose}
                    aria-label="Fermer le détail de l'anomalie"
                  >
                    <X className="size-3.5" aria-hidden="true" />
                  </Button>
                </div>
              </div>
            </DialogHeader>

            <div className="max-h-[min(65vh,32rem)] overflow-y-auto px-5 py-1">
              <dl>
                {buildDetailRows(anomaly).map((row) => (
                  <DetailRowItem key={row.label} {...row} />
                ))}
              </dl>
              <p className="pb-1 pt-3 font-mono text-[10px] uppercase tracking-[0.08em] text-stone-500">
                Valeurs Excel brutes
              </p>
              {rawValueEntries.length > 0 ? (
                <dl>
                  {rawValueEntries.map(([key, value]) => (
                    <DetailRowItem
                      key={key}
                      label={getExcelFieldLabel(key)}
                      value={formatDetailValue(value)}
                      mono
                    />
                  ))}
                </dl>
              ) : (
                <p className="pb-2 text-xs text-muted-foreground">
                  Valeurs source brutes indisponibles pour cette anomalie.
                </p>
              )}
              {complementaryRows.length > 0 ? (
                <dl className="border-t border-stone-100">
                  {complementaryRows.map((row) => (
                    <DetailRowItem key={row.label} {...row} />
                  ))}
                </dl>
              ) : null}
            </div>

            <div className="flex items-center justify-between border-t border-stone-200/60 px-5 py-2.5 text-[11px] text-stone-500">
              <span>Flèches ou j / k pour changer d’anomalie</span>
              {position ? (
                <span className="font-mono tabular-nums">
                  {position.index + 1} / {position.total}
                </span>
              ) : null}
            </div>
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  );
};
