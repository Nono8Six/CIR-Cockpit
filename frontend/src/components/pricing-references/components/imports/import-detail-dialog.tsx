import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, Check, Copy } from 'lucide-react';

import type {
  PricingReferenceImportGetResponse,
  PricingReferenceImportsListResponse
} from '../../../../../../shared/schemas/pricing/references.schema';
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
import type { UserRole } from '@/types';
import {
  fileKindLabels,
  findReplacedByVersion,
  findReplacesVersion,
  formatCount,
  formatDateTime,
  formatEffectiveFileProvenance,
  formatFileSize,
  formatSha256Short,
  importMappingStatusLabels,
  importStatusLabels,
  snapshotVersionStatusLabels,
  sortEffectiveImportFiles
} from '../../utils/pricing-references-formatters';
import { ActivationConfirm } from './activation-confirm';
import { importStatusDotClassName } from './import-row';
import { useActivatePricingReferenceVersion } from './use-activate-version';

type ImportDetail = PricingReferenceImportGetResponse['import'];
type ImportSummary = PricingReferenceImportsListResponse['imports'][number];

interface ImportDetailDialogProps {
  importId: string | null;
  userRole: UserRole;
  /** Imports analysés chargés par la page, pour la version active et la chaîne remplacé/remplace. */
  versionRows: readonly ImportSummary[];
  onClose: () => void;
  onConsult: (importId: string) => void;
  /** Ouvre le détail d'un autre import (navigation dans la chaîne de versions). */
  onNavigateToImport: (importId: string) => void;
}

const VersionChainLink = ({
  label,
  onNavigate
}: {
  label: string;
  onNavigate: () => void;
}) => (
  <button
    type="button"
    onClick={onNavigate}
    className="mt-0.5 block w-fit rounded-sm text-left font-normal text-stone-600 underline decoration-stone-300 underline-offset-2 transition-colors hover:text-stone-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/45"
  >
    {label}
  </button>
);

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

const CopyValueButton = ({
  value,
  copyKey,
  copiedKey,
  onCopy,
  label
}: {
  value: string;
  copyKey: string;
  copiedKey: string | null;
  onCopy: (value: string, key: string) => void;
  label: string;
}) => (
  <Button
    type="button"
    variant="ghost"
    size="icon"
    onClick={() => onCopy(value, copyKey)}
    aria-label={label}
    className="size-6 shrink-0 rounded-md text-stone-500 hover:bg-stone-100 hover:text-stone-950"
  >
    {copiedKey === copyKey ? (
      <Check className="!size-3 text-emerald-600" aria-hidden="true" />
    ) : (
      <Copy className="!size-3" aria-hidden="true" />
    )}
  </Button>
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
 * status, dates, counters, version lifecycle (statut de snapshot, activée /
 * désactivée le, chaîne remplacée par / remplace naviguable), effective files
 * with provenance (fourni vs réutilisé d'un import antérieur), copyable
 * SHA-256 and origin import id, mapping status, copyable UUID, the "Consulter
 * cet import" action that scopes the other tabs to this import, and the
 * super-admin activation/rollback action with its in-dialog confirmation.
 */
export const ImportDetailDialog = ({
  importId,
  userRole,
  versionRows,
  onClose,
  onConsult,
  onNavigateToImport
}: ImportDetailDialogProps) => {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  // Confirmation liée à l'import affiché : changer d'import (chaîne de
  // versions) ou rouvrir le dialog ne laisse jamais une confirmation orpheline.
  const [activationConfirmImportId, setActivationConfirmImportId] = useState<string | null>(null);
  const isConfirmingActivation =
    importId !== null && activationConfirmImportId === importId;
  const copyResetTimerRef = useRef<number | null>(null);

  const activateMutation = useActivatePricingReferenceVersion(() => {
    setActivationConfirmImportId(null);
    onClose();
  });

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

  useEffect(
    () => () => {
      if (copyResetTimerRef.current !== null) {
        window.clearTimeout(copyResetTimerRef.current);
      }
    },
    []
  );

  const detail: ImportDetail | null = detailQuery.data?.import ?? null;
  const effectiveFiles = useMemo(
    () => (detail ? sortEffectiveImportFiles(detail.effective_files) : []),
    [detail]
  );
  const mappingStatusByFileKey = useMemo(
    () =>
      new Map(
        (detail?.files ?? []).map((file) => [
          `${file.file_kind}:${file.sha256}`,
          file.mapping_status
        ])
      ),
    [detail]
  );

  const activeVersion = useMemo(
    () => versionRows.find((row) => row.is_active_version) ?? null,
    [versionRows]
  );
  const replacedBy = detail ? findReplacedByVersion(versionRows, detail) : null;
  const replaces = detail ? findReplacesVersion(versionRows, detail) : null;
  const isRollback = detail?.snapshot_status === 'archive';
  const canActivate =
    detail !== null &&
    userRole === 'super_admin' &&
    detail.status === 'analyse_ok' &&
    !detail.is_active_version &&
    (detail.snapshot_status === 'cree' || detail.snapshot_status === 'archive');

  const handleCopy = (value: string, key: string) => {
    void navigator.clipboard.writeText(value);
    if (copyResetTimerRef.current !== null) {
      window.clearTimeout(copyResetTimerRef.current);
    }
    setCopiedKey(key);
    copyResetTimerRef.current = window.setTimeout(() => {
      setCopiedKey(null);
      copyResetTimerRef.current = null;
    }, 2000);
  };

  return (
    <Dialog
      open={importId !== null}
      onOpenChange={(open) => {
        if (!open && !activateMutation.isPending) {
          setActivationConfirmImportId(null);
          onClose();
        }
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
                {detail.snapshot_status ? (
                  <DetailRowItem
                    label="Version"
                    value={
                      <>
                        <span className="flex items-center gap-1.5">
                          <span
                            className={cn(
                              'size-1.5 rounded-full',
                              detail.snapshot_status === 'actif' ? 'bg-emerald-500' : 'bg-stone-300'
                            )}
                            aria-hidden="true"
                          />
                          {snapshotVersionStatusLabels[detail.snapshot_status]}
                        </span>
                        {detail.activated_at ? (
                          <span className="mt-0.5 block font-normal text-stone-500">
                            Activée le {formatDateTime(detail.activated_at)}
                          </span>
                        ) : null}
                        {detail.deactivated_at ? (
                          <span className="mt-0.5 block font-normal text-stone-500">
                            Désactivée le {formatDateTime(detail.deactivated_at)}
                          </span>
                        ) : null}
                        {replacedBy ? (
                          <VersionChainLink
                            label={`Remplacée par l'import du ${formatDateTime(replacedBy.created_at)}`}
                            onNavigate={() => {
                              setActivationConfirmImportId(null);
                              onNavigateToImport(replacedBy.id);
                            }}
                          />
                        ) : null}
                        {replaces ? (
                          <VersionChainLink
                            label={`Remplace l'import du ${formatDateTime(replaces.created_at)}`}
                            onNavigate={() => {
                              setActivationConfirmImportId(null);
                              onNavigateToImport(replaces.id);
                            }}
                          />
                        ) : null}
                      </>
                    }
                  />
                ) : null}
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
                      <CopyValueButton
                        value={detail.id}
                        copyKey="import-id"
                        copiedKey={copiedKey}
                        onCopy={handleCopy}
                        label="Copier l'identifiant de l'import"
                      />
                    </span>
                  }
                  mono
                />
              </dl>

              <p className="pb-1 pt-3 font-mono text-[10px] uppercase tracking-[0.08em] text-stone-500">
                Fichiers
              </p>
              {effectiveFiles.length > 0 ? (
                <dl>
                  {effectiveFiles.map((file) => {
                    const mappingStatus = mappingStatusByFileKey.get(
                      `${file.file_kind}:${file.sha256}`
                    );
                    return (
                      <DetailRowItem
                        key={`${file.file_kind}-${file.sha256}`}
                        label={fileKindLabels[file.file_kind]}
                        value={
                          <>
                            <span className="break-all">{file.original_filename}</span>
                            <span className="mt-0.5 flex items-center gap-1 font-normal text-stone-500">
                              <span className="min-w-0">{formatEffectiveFileProvenance(file)}</span>
                              {file.source === 'reutilise' && file.source_import_id ? (
                                <CopyValueButton
                                  value={file.source_import_id}
                                  copyKey={`source-${file.file_kind}`}
                                  copiedKey={copiedKey}
                                  onCopy={handleCopy}
                                  label={`Copier l'identifiant de l'import d'origine (${fileKindLabels[file.file_kind]})`}
                                />
                              ) : null}
                            </span>
                            <span className="mt-0.5 block font-normal text-stone-500">
                              {formatFileSize(file.size_bytes)} ·{' '}
                              {file.row_count !== null
                                ? `${formatCount(file.row_count)} lignes`
                                : 'lignes inconnues'}
                              {mappingStatus
                                ? ` · ${importMappingStatusLabels[mappingStatus]}`
                                : ''}
                            </span>
                            <span className="mt-0.5 flex items-center gap-1.5 font-normal">
                              <span className="text-[10px] text-stone-500">SHA-256</span>
                              <span
                                className="font-mono text-[10px] text-stone-500"
                                title={file.sha256}
                              >
                                {formatSha256Short(file.sha256)}
                              </span>
                              <CopyValueButton
                                value={file.sha256}
                                copyKey={`sha-${file.file_kind}`}
                                copiedKey={copiedKey}
                                onCopy={handleCopy}
                                label={`Copier le SHA-256 du fichier ${file.original_filename}`}
                              />
                            </span>
                          </>
                        }
                      />
                    );
                  })}
                </dl>
              ) : (
                <p className="pb-2 text-xs text-muted-foreground">
                  Aucun fichier rattaché à cet import.
                </p>
              )}
            </div>

            <DialogFooter className="border-t border-stone-200/60 px-5 py-2.5 sm:items-center sm:justify-between">
              {isConfirmingActivation ? (
                <ActivationConfirm
                  className="w-full"
                  targetCreatedAt={detail.created_at}
                  activeVersionCreatedAt={activeVersion?.created_at ?? null}
                  isRollback={isRollback}
                  isPending={activateMutation.isPending}
                  onConfirm={() => activateMutation.mutate(detail.id)}
                  onCancel={() => setActivationConfirmImportId(null)}
                />
              ) : (
                <>
                  <span className="text-[11px] text-stone-500">
                    Filtre les onglets Segments, Classification et Anomalies.
                  </span>
                  <span className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => onConsult(detail.id)}
                      className="h-7 gap-1.5 rounded-md border-stone-200 bg-white px-2.5 text-xs font-medium text-stone-800 shadow-none hover:bg-stone-50"
                    >
                      Consulter cet import
                    </Button>
                    {canActivate ? (
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => setActivationConfirmImportId(detail.id)}
                        className="h-7 gap-1.5 rounded-md bg-primary px-2.5 text-xs font-medium text-primary-foreground hover:bg-primary/95 active:scale-[0.98]"
                      >
                        {isRollback ? 'Réactiver cette version' : 'Activer cette version'}
                      </Button>
                    ) : null}
                  </span>
                </>
              )}
            </DialogFooter>
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  );
};
