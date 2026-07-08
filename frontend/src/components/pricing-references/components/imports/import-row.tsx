import type {
  PricingReferenceEffectiveImportFile,
  PricingReferenceImportStatus,
  PricingReferenceImportsListResponse
} from '../../../../../../shared/schemas/pricing/references.schema';
import { cn } from '@/lib/utils';
import {
  fileKindLabels,
  fileKindShortLabels,
  formatCount,
  formatDateTime,
  formatEffectiveFileProvenance,
  importStatusLabels,
  sortEffectiveImportFiles
} from '../../utils/pricing-references-formatters';

type ImportSummary = PricingReferenceImportsListResponse['imports'][number];

export const importStatusDotClassName: Record<PricingReferenceImportStatus, string> = {
  brouillon: 'bg-stone-300',
  analyse_en_cours: 'bg-amber-500',
  analyse_ok: 'bg-emerald-500',
  analyse_erreur: 'bg-red-500',
  pret_activation: 'bg-emerald-500',
  rejete: 'bg-red-500',
  archive: 'bg-stone-300'
};

interface ImportRowProps {
  row: ImportSummary;
  isActive?: boolean;
  onOpenDetail: (importId: string) => void;
}

const ImportFileEntry = ({ file }: { file: PricingReferenceEffectiveImportFile }) => (
  <span
    className="flex min-w-0 items-center gap-1.5"
    title={`${fileKindLabels[file.file_kind]} — ${file.original_filename}${
      file.source === 'reutilise' ? ` — ${formatEffectiveFileProvenance(file)}` : ''
    }`}
  >
    <span className="shrink-0 rounded bg-surface-3 px-1.5 text-[11px] leading-4 text-stone-700">
      {fileKindShortLabels[file.file_kind]}
    </span>
    <span className="truncate text-[11px] leading-4 text-stone-700">{file.original_filename}</span>
    {file.source === 'reutilise' ? (
      <span className="shrink-0 text-[11px] leading-4 text-stone-500">réutilisé</span>
    ) : null}
  </span>
);

/**
 * Two-line chronological import row (~52px): status dot + label on the left,
 * "Import du {date-heure}" plus the version lifecycle mention (activée le /
 * archivée le, driven by the snapshot — distinct from the import status) and
 * optional error message on the first line, the effective file kinds/names
 * with reuse provenance on the second, and three fixed mono counter columns at
 * the right (classification / segments / anomalies). The UUID lives in the
 * detail dialog.
 */
export const ImportRow = ({ row, isActive = false, onOpenDetail }: ImportRowProps) => {
  const files = sortEffectiveImportFiles(row.files);
  const versionMention =
    row.is_active_version && row.activated_at
      ? `Version activée le ${formatDateTime(row.activated_at)}`
      : row.snapshot_status === 'archive'
        ? row.deactivated_at
          ? `Version archivée le ${formatDateTime(row.deactivated_at)}`
          : 'Version archivée'
        : null;
  return (
    <button
      type="button"
      onClick={() => onOpenDetail(row.id)}
      aria-label={`Voir le détail de l'import du ${formatDateTime(row.created_at)}`}
      className={cn(
        'flex w-full items-center gap-3 border-b border-stone-100 px-4 py-2 text-left transition-colors last:border-b-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring/45',
        isActive
          ? 'bg-surface-1 hover:bg-surface-1 focus-visible:bg-surface-1'
          : 'hover:bg-stone-50 focus-visible:bg-stone-50'
      )}
    >
      <span
        className={cn('size-1.5 shrink-0 rounded-full', importStatusDotClassName[row.status])}
        aria-hidden="true"
      />
      <span className="hidden w-28 shrink-0 truncate text-[11px] text-stone-500 sm:block">
        {importStatusLabels[row.status]}
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex min-w-0 items-baseline gap-2">
          <span className="whitespace-nowrap text-xs font-medium leading-4 text-stone-950">
            Import du {formatDateTime(row.created_at)}
          </span>
          {versionMention ? (
            <span
              className="hidden min-w-0 truncate text-[11px] leading-4 text-stone-500 sm:block"
              title={versionMention}
            >
              {versionMention}
            </span>
          ) : null}
          {row.error_message ? (
            <span
              className="min-w-0 truncate text-[11px] leading-4 text-red-700"
              title={row.error_message}
            >
              {row.error_message}
            </span>
          ) : null}
        </span>
        <span className="mt-1 flex min-w-0 items-center gap-3">
          {files.length > 0 ? (
            files.map((file) => (
              <ImportFileEntry key={`${file.file_kind}-${file.sha256}`} file={file} />
            ))
          ) : (
            <span className="text-[11px] leading-4 text-stone-400">Aucun fichier rattaché</span>
          )}
        </span>
      </span>
      <span className="hidden w-20 shrink-0 text-right font-mono text-[11px] tabular-nums text-stone-500 sm:block">
        {formatCount(row.classification_rows_count)}
      </span>
      <span className="hidden w-20 shrink-0 text-right font-mono text-[11px] tabular-nums text-stone-500 sm:block">
        {formatCount(row.segments_rows_count)}
      </span>
      <span
        className={cn(
          'w-20 shrink-0 text-right font-mono text-[11px] tabular-nums',
          row.anomalies_total && row.anomalies_total > 0 ? 'text-amber-700' : 'text-stone-500'
        )}
      >
        {formatCount(row.anomalies_total)}
      </span>
    </button>
  );
};
