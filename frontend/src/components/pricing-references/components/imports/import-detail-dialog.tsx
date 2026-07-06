import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, Check, Copy } from 'lucide-react';

import type { PricingReferenceImportGetResponse } from '../../../../../../shared/schemas/pricing/references.schema';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/feedback/Dialog';
import { Button } from '@/components/ui/inputs/basic/Button';
import { cn } from '@/lib/utils';
import { handleUiError } from '@/services/errors/handleUiError';
import { getPricingReferenceImport } from '@/services/pricingReferences';
import { pricingReferenceImportKey } from '@/services/query/queryKeys';
import {
  fileKindLabels,
  formatCount,
  formatDateTime,
  formatFileSize,
  importMappingStatusLabels,
  importStatusLabels
} from '../../utils/pricing-references-formatters';
import { importStatusDotClassName } from './import-row';

type ImportDetail = PricingReferenceImportGetResponse['import'];

interface ImportDetailDialogProps {
  importId: string | null;
  onClose: () => void;
  onConsult: (importId: string) => void;
}

const DetailRowItem = ({
  label,
  value,
  mono
}: {
  label: string;
  value: ReactNode;
  mono?: boolean;
}) => (
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

const DialogLoadingState = () => (
  <div className="px-5 py-2" aria-hidden="true">
    {Array.from({ length: 6 }).map((_, index) => (
      <div key={index} className="flex h-9 items-center border-b border-stone-100 last:border-b-0">
        <div className="h-3.5 w-2/3 animate-pulse rounded bg-stone-100" />
      </div>
    ))}
  </div>
);

/**
 * Centered detail dialog (command-palette style) for one reference import:
 * status, dates, counters, source files with mapping status, copyable UUID and
 * the "Consulter cet import" action that scopes the other tabs to this import.
 */
export const ImportDetailDialog = ({ importId, onClose, onConsult }: ImportDetailDialogProps) => {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const detailInput = useMemo(() => ({ import_id: importId ?? '' }), [importId]);
  const detailQuery = useQuery({
    queryKey: pricingReferenceImportKey(detailInput),
    queryFn: () => getPricingReferenceImport(detailInput),
    enabled: importId !== null
  });

  useEffect(() => {
    if (detailQuery.error) {
      handleUiError(detailQuery.error, 'Impossible de charger le détail de l import.');
    }
  }, [detailQuery.error]);

  const detail: ImportDetail | null = detailQuery.data?.import ?? null;

  const handleCopyId = (id: string) => {
    void navigator.clipboard.writeText(id);
    setCopiedId(id);
    setTimeout(() => {
      setCopiedId(null);
    }, 2000);
  };

  return (
    <Dialog
      open={importId !== null}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent
        className="w-[calc(100vw-1rem)] gap-0 rounded-xl border-stone-200/60 bg-white p-0 shadow-xl sm:max-w-lg"
        overlayClassName="bg-foreground/30 backdrop-blur-[2px]"
      >
        {detailQuery.isLoading ? (
          <>
            <DialogHeader className="border-b border-stone-200/60 px-5 py-4 text-left">
              <DialogTitle className="text-sm font-semibold tracking-tight text-stone-950">
                Détail de l&apos;import
              </DialogTitle>
              <DialogDescription className="text-[11px] text-stone-500">
                Chargement du détail…
              </DialogDescription>
            </DialogHeader>
            <DialogLoadingState />
          </>
        ) : detailQuery.isError ? (
          <>
            <DialogHeader className="border-b border-stone-200/60 px-5 py-4 text-left">
              <DialogTitle className="text-sm font-semibold tracking-tight text-stone-950">
                Détail de l&apos;import
              </DialogTitle>
              <DialogDescription className="text-[11px] text-stone-500">
                Le détail n&apos;a pas pu être chargé.
              </DialogDescription>
            </DialogHeader>
            <div className="flex flex-col items-center px-6 py-10 text-center">
              <div className="grid size-9 place-items-center rounded-md bg-red-50 text-red-700">
                <AlertTriangle className="size-4" aria-hidden="true" />
              </div>
              <p className="mt-3 text-xs leading-relaxed text-red-800/80">
                Le problème a été transmis au pipeline d&apos;erreurs.
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => void detailQuery.refetch()}
                className="mt-4 h-8 border-red-200 bg-white text-xs font-semibold text-red-900 hover:bg-red-50"
              >
                Réessayer
              </Button>
            </div>
          </>
        ) : detail ? (
          <>
            <DialogHeader className="border-b border-stone-200/60 px-5 py-4 text-left">
              <DialogTitle className="text-sm font-semibold tracking-tight text-stone-950">
                Import du {formatDateTime(detail.created_at)}
              </DialogTitle>
              <DialogDescription className="flex items-center gap-1.5 text-[11px] text-stone-500">
                <span
                  className={cn('size-1.5 rounded-full', importStatusDotClassName[detail.status])}
                  aria-hidden="true"
                />
                {importStatusLabels[detail.status]}
              </DialogDescription>
            </DialogHeader>

            <div className="max-h-[min(65vh,32rem)] overflow-y-auto px-5 py-1">
              <dl>
                <DetailRowItem label="Créé le" value={formatDateTime(detail.created_at)} />
                <DetailRowItem
                  label="Analyse terminée le"
                  value={formatDateTime(detail.analysis_completed_at)}
                />
                <DetailRowItem
                  label="Lignes classification"
                  value={formatCount(detail.classification_rows_count)}
                  mono
                />
                <DetailRowItem
                  label="Lignes segments"
                  value={formatCount(detail.segments_rows_count)}
                  mono
                />
                <DetailRowItem
                  label="Anomalies"
                  value={
                    <span
                      className={cn(
                        detail.anomalies_total && detail.anomalies_total > 0 && 'text-amber-700'
                      )}
                    >
                      {formatCount(detail.anomalies_total)}
                    </span>
                  }
                  mono
                />
                {detail.error_message ? (
                  <DetailRowItem
                    label="Erreur"
                    value={<span className="text-red-700">{detail.error_message}</span>}
                  />
                ) : null}
                <DetailRowItem
                  label="Identifiant"
                  value={
                    <span className="flex items-start justify-between gap-2">
                      <span className="min-w-0 break-all">{detail.id}</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => handleCopyId(detail.id)}
                        aria-label="Copier l'identifiant de l'import"
                        className="size-6 shrink-0 rounded-md text-stone-500 hover:bg-stone-100 hover:text-stone-950"
                      >
                        {copiedId === detail.id ? (
                          <Check className="!size-3 text-emerald-600" aria-hidden="true" />
                        ) : (
                          <Copy className="!size-3" aria-hidden="true" />
                        )}
                      </Button>
                    </span>
                  }
                  mono
                />
              </dl>

              <p className="pb-1 pt-3 font-mono text-[10px] uppercase tracking-[0.08em] text-stone-500">
                Fichiers importés
              </p>
              {detail.files.length > 0 ? (
                <dl>
                  {detail.files.map((file) => (
                    <DetailRowItem
                      key={file.id}
                      label={fileKindLabels[file.file_kind]}
                      value={
                        <>
                          <span className="break-all">{file.original_filename}</span>
                          <span className="mt-0.5 block font-normal text-stone-500">
                            {formatFileSize(file.size_bytes)} ·{' '}
                            {file.row_count !== null
                              ? `${formatCount(file.row_count)} lignes`
                              : 'lignes inconnues'}
                            {file.mapping_status
                              ? ` · ${importMappingStatusLabels[file.mapping_status]}`
                              : ''}
                          </span>
                        </>
                      }
                    />
                  ))}
                </dl>
              ) : (
                <p className="pb-2 text-xs text-muted-foreground">
                  Aucun fichier rattaché à cet import.
                </p>
              )}
            </div>

            <DialogFooter className="border-t border-stone-200/60 px-5 py-2.5 sm:items-center sm:justify-between">
              <span className="text-[11px] text-stone-500">
                Filtre les onglets Segments, Classification et Anomalies.
              </span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => onConsult(detail.id)}
                className="h-7 gap-1.5 rounded-md border-stone-200 bg-white px-2.5 text-xs font-medium text-stone-800 shadow-none hover:bg-stone-50"
              >
                Consulter cet import
              </Button>
            </DialogFooter>
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  );
};
