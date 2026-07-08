import { useEffect } from 'react';
import { ArrowDown, ArrowUp, X } from 'lucide-react';

import type {
  PricingReferenceAnomalyType,
  PricingReferenceDiffRow
} from '../../../../../../shared/schemas/pricing/references.schema';
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
  anomalyTypeLabels,
  diffTypeLabels,
  severityLabels
} from '../../utils/pricing-references-formatters';
import { anomalySeverityDotClassName, getExcelFieldLabel } from '../anomalies/anomaly-utils';
import {
  diffObjectTypeSingularLabels,
  getDiffColumnChanges,
  getDiffLabel,
  toDiffDisplayValue
} from './changes-utils';

interface ChangeDetailDialogProps {
  change: PricingReferenceDiffRow | null;
  position: { index: number; total: number } | null;
  onNavigate: (delta: -1 | 1) => void;
  onClose: () => void;
  onCloseAutoFocus: (event: Event) => void;
}

const EMPTY_VALUE = '-';

const contextFields: Array<{ key: string; label: string; mono?: boolean }> = [
  { key: 'marque', label: 'Marque' },
  { key: 'segment', label: 'Segment' },
  { key: 'cat_fab', label: 'Catégorie fabricant' },
  { key: 'num_four', label: 'N° fournisseur', mono: true },
  { key: 'priorite', label: 'Priorité', mono: true },
  { key: 'type_grill', label: 'Type de grille' },
  { key: 'cir_key', label: 'Clé CIR', mono: true },
  { key: 'mega', label: 'Mega', mono: true },
  { key: 'fam', label: 'Famille', mono: true },
  { key: 'sfa', label: 'Sous-famille', mono: true }
];

const isKnownAnomalyType = (value: string): value is PricingReferenceAnomalyType =>
  value in anomalyTypeLabels;

const formatSourceRows = (rows: readonly number[] | undefined): string =>
  rows && rows.length > 0 ? rows.map((row) => `L. ${row}`).join(', ') : EMPTY_VALUE;

interface ContextRow {
  label: string;
  value: string;
  mono?: boolean;
}

const buildContextRows = (change: PricingReferenceDiffRow): ContextRow[] => {
  if (change.object_type === 'anomalie') {
    const record = change.payload.after ?? change.payload.before;
    const type = getDiffLabel(change, 'type');
    const objectId = getDiffLabel(change, 'object_id');
    const message = record ? toDiffDisplayValue(record.message) : null;
    const severity = record ? toDiffDisplayValue(record.severity) : null;
    const rows: ContextRow[] = [];
    if (type) {
      rows.push({
        label: "Type d'anomalie",
        value: isKnownAnomalyType(type) ? anomalyTypeLabels[type] : type
      });
    }
    if (severity && severity in severityLabels) {
      rows.push({
        label: 'Sévérité anomalie',
        value: severityLabels[severity as keyof typeof severityLabels]
      });
    }
    if (message) rows.push({ label: 'Message', value: message });
    if (objectId) rows.push({ label: 'Objet concerné', value: objectId, mono: true });
    return rows;
  }

  return contextFields
    .map((field) => {
      const value = getDiffLabel(change, field.key);
      return value
        ? { label: field.label, value, ...(field.mono ? { mono: true } : {}) }
        : null;
    })
    .filter((row): row is ContextRow => row !== null);
};

const ContextRowItem = ({ label, value, mono }: ContextRow) => (
  <div className="grid grid-cols-[8.5rem_minmax(0,1fr)] items-baseline gap-x-4 border-b border-stone-100 py-2 last:border-b-0">
    <dt className="text-xs text-stone-500">{label}</dt>
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
 * Dialog centré avant/après d'un changement (payload autoportant du backend) :
 * contexte lisible, colonnes changées avec ancienne valeur barrée (D7), numéros
 * de ligne Excel base/cible en mono. ArrowUp/ArrowDown et j/k naviguent entre
 * les changements chargés du groupe sans fermer le dialog.
 */
export const ChangeDetailDialog = ({
  change,
  position,
  onNavigate,
  onClose,
  onCloseAutoFocus
}: ChangeDetailDialogProps) => {
  const isOpen = change !== null;

  // Raccourcis au niveau document : un bouton de navigation désactivé (première ou
  // dernière ligne) rend la main au body, les flèches doivent continuer à marcher.
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

  const contextRows = change ? buildContextRows(change) : [];
  const columnChanges = change ? getDiffColumnChanges(change) : [];
  const sourceRows = change?.payload.source_row_numbers;
  const identityNote = change?.payload.identity_note;
  const canGoPrevious = position !== null && position.index > 0;
  const canGoNext = position !== null && position.index < position.total - 1;

  return (
    <Dialog
      open={change !== null}
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
        {change ? (
          <>
            <DialogHeader className="border-b border-stone-200/60 px-5 py-4 text-left">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 space-y-1">
                  <DialogTitle className="text-sm font-semibold tracking-tight text-stone-950">
                    {diffObjectTypeSingularLabels[change.object_type]}
                    <span className="text-stone-300"> · </span>
                    {diffTypeLabels[change.diff_type]}
                  </DialogTitle>
                  <DialogDescription className="flex flex-wrap items-center gap-1.5 text-[11px] text-stone-500">
                    <span
                      className={cn(
                        'size-1.5 rounded-full',
                        anomalySeverityDotClassName[change.severity]
                      )}
                      aria-hidden="true"
                    />
                    {severityLabels[change.severity]}
                    <span className="text-stone-300" aria-hidden="true">
                      ·
                    </span>
                    <span
                      className="min-w-0 max-w-full truncate font-mono tabular-nums"
                      title={change.object_key}
                    >
                      {change.object_key}
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
                    aria-label="Changement précédent"
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
                    aria-label="Changement suivant"
                  >
                    <ArrowDown className="size-3.5" aria-hidden="true" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-7 rounded-md text-stone-500 hover:bg-stone-100 hover:text-stone-950"
                    onClick={onClose}
                    aria-label="Fermer le détail du changement"
                  >
                    <X className="size-3.5" aria-hidden="true" />
                  </Button>
                </div>
              </div>
            </DialogHeader>

            <div className="max-h-[min(65vh,32rem)] overflow-y-auto px-5 py-1">
              {contextRows.length > 0 ? (
                <dl>
                  {contextRows.map((row) => (
                    <ContextRowItem key={row.label} {...row} />
                  ))}
                </dl>
              ) : null}

              {columnChanges.length > 0 ? (
                <>
                  <p className="pb-1 pt-3 font-mono text-[10px] uppercase tracking-[0.08em] text-stone-500">
                    Avant / après
                  </p>
                  <dl>
                    {columnChanges.map((columnChange) => (
                      <div
                        key={columnChange.column}
                        className="grid grid-cols-[8.5rem_minmax(0,1fr)] items-baseline gap-x-4 border-b border-stone-100 py-2 last:border-b-0"
                      >
                        <dt
                          className="break-all font-mono text-[11px] text-stone-500"
                          title={getExcelFieldLabel(columnChange.column.toUpperCase())}
                        >
                          {columnChange.column}
                        </dt>
                        <dd className="min-w-0 break-words text-xs leading-relaxed">
                          {columnChange.before !== null ? (
                            <span className="font-mono text-[11px] tabular-nums text-stone-500 line-through">
                              {columnChange.before}
                            </span>
                          ) : null}
                          {columnChange.before !== null && columnChange.after !== null ? (
                            <span className="mx-1.5 text-stone-400" aria-hidden="true">
                              →
                            </span>
                          ) : null}
                          {columnChange.after !== null ? (
                            <span className="font-mono text-[11px] font-medium tabular-nums text-stone-950">
                              {columnChange.after}
                            </span>
                          ) : null}
                          {columnChange.before === null && columnChange.after === null
                            ? EMPTY_VALUE
                            : null}
                        </dd>
                      </div>
                    ))}
                  </dl>
                </>
              ) : null}

              <dl className="border-t border-stone-100">
                <ContextRowItem
                  label="Ligne Excel base"
                  value={formatSourceRows(sourceRows?.before)}
                  mono
                />
                <ContextRowItem
                  label="Ligne Excel cible"
                  value={formatSourceRows(sourceRows?.after)}
                  mono
                />
              </dl>

              {identityNote ? (
                <p className="pb-2 pt-2 text-[11px] leading-relaxed text-stone-500">
                  {identityNote}
                </p>
              ) : null}
            </div>

            <div className="flex items-center justify-between border-t border-stone-200/60 px-5 py-2.5 text-[11px] text-stone-500">
              <span>Flèches ou j / k pour naviguer entre les changements</span>
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
