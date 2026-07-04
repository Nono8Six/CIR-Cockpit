import { X } from 'lucide-react';

import type { PricingReferenceAnomaliesListResponse } from '../../../../../../shared/schemas/pricing/references.schema';
import { Badge } from '@/components/ui/data-display/Badge';
import { DialogDescription, DialogTitle } from '@/components/ui/feedback/Dialog';
import { Button } from '@/components/ui/inputs/basic/Button';
import {
  anomalyTypeActionLabels,
  anomalyTypeLabels,
  severityLabels
} from '../../utils/pricing-references-formatters';
import {
  EMPTY_VALUE,
  anomalySeverityToneClassName,
  formatDetailValue,
  getAnomalyLineContext,
  getAnomalySourceLabel,
  getExcelFieldLabel
} from './anomaly-utils';

type AnomalyRow = PricingReferenceAnomaliesListResponse['rows'][number];

interface AnomalyDetailPanelProps {
  anomaly: AnomalyRow | null;
  onClose: () => void;
}

/**
 * Detail panel for displaying contextual details of a specific anomaly.
 * Used inside the Anomalies tab workspace.
 * 
 * @param props Component properties containing anomaly and onClose handler.
 */
export const AnomalyDetailPanel = ({
  anomaly,
  onClose
}: AnomalyDetailPanelProps) => {
  if (!anomaly) return null;

  const lineContext = getAnomalyLineContext(anomaly);
  const excelFields = anomaly.columns.map((column) => ({
    code: column,
    label: getExcelFieldLabel(column)
  }));
  const detailEntries = Object.entries(anomaly.details)
    .filter(([key]) => !['raw_values', 'segment_key', 'cir_key', 'classification_key'].includes(key))
    .filter(([, value]) => formatDetailValue(value) !== EMPTY_VALUE)
    .slice(0, 4);

  return (
    <section className="flex min-h-0 max-h-[min(78vh,44rem)] flex-col overflow-hidden bg-white text-slate-950">
      <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4">
        <div className="min-w-0 space-y-2">
          <Badge
            variant="outline"
            className={`px-2 py-0.5 text-[9px] font-bold uppercase leading-none tracking-[0.12em] shadow-none ${anomalySeverityToneClassName[anomaly.severity]}`}
          >
            {severityLabels[anomaly.severity]}
          </Badge>
          <DialogTitle className="text-base font-semibold leading-snug tracking-tight text-slate-950">
            {anomalyTypeLabels[anomaly.type]}
          </DialogTitle>
          <DialogDescription className="text-xs leading-relaxed text-muted-foreground">
            Correction dans le fichier Excel source, puis nouvel import.
          </DialogDescription>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-8 rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-950"
          onClick={onClose}
          aria-label="Fermer le détail de l'anomalie"
        >
          <X className="size-3.5" aria-hidden="true" />
        </Button>
      </div>

      <div className="min-h-0 flex-1 space-y-4 overflow-auto bg-slate-50/70 p-5 text-xs">
        <section className="space-y-1.5">
          <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-slate-500">
            Message détecté
          </p>
          <p className="rounded-md border border-slate-200 bg-white p-3 font-medium leading-relaxed text-slate-950">
            {anomaly.message}
          </p>
        </section>

        <dl className="grid grid-cols-2 gap-2">
          {[
            ['Fichier', getAnomalySourceLabel(anomaly)],
            ['Ligne Excel source', anomaly.source_row_number?.toString() ?? EMPTY_VALUE],
            ['Marque', lineContext.marque ?? EMPTY_VALUE],
            ['Catégorie fabricant', lineContext.catFab ?? EMPTY_VALUE],
            ['Segment', lineContext.segment ?? EMPTY_VALUE],
            ['ID numérique', lineContext.idnumerique ?? EMPTY_VALUE]
          ].map(([label, value]) => (
            <div key={label} className="rounded-md border border-slate-200 bg-white px-3 py-2.5">
              <dt className="text-[9px] font-bold uppercase tracking-[0.16em] text-slate-500">
                {label}
              </dt>
              <dd className="mt-1 min-w-0 break-words font-medium text-slate-950">{value}</dd>
            </div>
          ))}
        </dl>

        <section className="space-y-2">
          <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-slate-500">
            Champs Excel à compléter
          </p>
          <div className="flex flex-wrap gap-1.5">
            {excelFields.length > 0 ? (
              excelFields.map((field) => (
                <span
                  key={field.code}
                  className="rounded-md border border-slate-200 bg-white px-2 py-1 text-[11px] font-semibold text-slate-800"
                  title={field.code}
                >
                  {field.label}
                </span>
              ))
            ) : (
              <span className="text-xs text-muted-foreground">{EMPTY_VALUE}</span>
            )}
          </div>
        </section>

        <section className="space-y-1.5">
          <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-slate-500">
            Action attendue
          </p>
          <p className="rounded-md border border-slate-200 bg-white p-3 font-medium leading-relaxed text-slate-950">
            {anomalyTypeActionLabels[anomaly.type]}
          </p>
        </section>

        {detailEntries.length > 0 && (
          <section className="space-y-2">
            <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-slate-500">
              Détails complémentaires
            </p>
            <div className="grid gap-1.5">
              {detailEntries.map(([key, value]) => (
                <div key={key} className="grid grid-cols-[7rem_minmax(0,1fr)] gap-2 rounded-md border border-slate-200 bg-white px-2.5 py-1.5">
                  <span className="font-mono text-[10px] font-semibold text-slate-500">{key}</span>
                  <span className="min-w-0 break-words font-mono text-[11px] text-slate-800">
                    {formatDetailValue(value)}
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}

        <section className="space-y-1.5 border-t border-slate-200 pt-3">
          <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-slate-500">
            Référence technique
          </p>
          <p className="break-all rounded-md border border-slate-200 bg-white p-2 font-mono text-[10px] text-muted-foreground">
            import {anomaly.import_id} · snapshot {anomaly.snapshot_id ?? EMPTY_VALUE}
          </p>
        </section>
      </div>
    </section>
  );
};

