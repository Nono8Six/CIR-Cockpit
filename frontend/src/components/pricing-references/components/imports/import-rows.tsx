import type {
  PricingReferenceImportStatus,
  PricingReferenceImportsListResponse
} from '../../../../../../shared/schemas/pricing/references.schema';
import { ImportRow } from './import-row';

type ImportSummary = PricingReferenceImportsListResponse['imports'][number];

interface ImportRowsProps {
  rows: ImportSummary[];
  activeImport: ImportSummary | null;
  statusFilter: PricingReferenceImportStatus | 'all';
  isLoading: boolean;
  onOpenDetail: (importId: string) => void;
}

const SectionBand = ({ label, withCaptions }: { label: string; withCaptions: boolean }) => (
  <div className="flex items-end justify-between gap-3 border-b border-stone-100 px-4 pb-1.5 pt-3">
    <span className="font-mono text-[10px] uppercase tracking-[0.08em] text-stone-500">{label}</span>
    {withCaptions ? (
      <span className="hidden items-center gap-3 sm:flex" aria-hidden="true">
        <span className="w-20 text-right font-mono text-[10px] uppercase tracking-[0.08em] text-stone-500">
          Classif.
        </span>
        <span className="w-20 text-right font-mono text-[10px] uppercase tracking-[0.08em] text-stone-500">
          Segments
        </span>
        <span className="w-20 text-right font-mono text-[10px] uppercase tracking-[0.08em] text-stone-500">
          Anomalies
        </span>
      </span>
    ) : null}
  </div>
);

const SectionEmpty = ({ label }: { label: string }) => (
  <p className="border-b border-stone-100 px-4 py-3 text-xs text-muted-foreground last:border-b-0">
    {label}
  </p>
);

/**
 * Chronological import list split into ACTIF (the current snapshot import, softly
 * highlighted) and HISTORIQUE sections, each introduced by a mono micro-label.
 * Column captions for the three counter columns sit in the first visible band.
 */
export const ImportRows = ({
  rows,
  activeImport,
  statusFilter,
  isLoading,
  onOpenDetail
}: ImportRowsProps) => {
  if (isLoading) {
    return (
      <div aria-hidden="true">
        <div className="flex items-end border-b border-stone-100 px-4 pb-1.5 pt-3">
          <div className="h-2.5 w-12 animate-pulse rounded bg-stone-100" />
        </div>
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="flex h-10 items-center border-b border-stone-100 px-4">
            <div className="h-3.5 w-2/3 animate-pulse rounded bg-stone-50" />
          </div>
        ))}
      </div>
    );
  }

  const activeMatchesFilter =
    activeImport !== null && (statusFilter === 'all' || activeImport.status === statusFilter);
  const showActiveSection = activeMatchesFilter || statusFilter === 'all';
  const historyRows = rows.filter((row) => row.id !== activeImport?.id);

  if (!showActiveSection && historyRows.length === 0) {
    return (
      <p className="px-4 py-8 text-center text-xs text-muted-foreground">
        Aucun import ne correspond au filtre sélectionné.
      </p>
    );
  }

  return (
    <div>
      {showActiveSection ? (
        <section aria-label="Snapshot actif">
          <SectionBand label="Actif" withCaptions />
          {activeMatchesFilter && activeImport ? (
            <ImportRow row={activeImport} isActive onOpenDetail={onOpenDetail} />
          ) : (
            <SectionEmpty label="Aucun snapshot actif. Importez la classification CIR puis les segments et grilles pour initialiser le référentiel." />
          )}
        </section>
      ) : null}
      <section aria-label="Historique des imports">
        <SectionBand label="Historique" withCaptions={!showActiveSection} />
        {historyRows.length > 0 ? (
          historyRows.map((row) => (
            <ImportRow key={row.id} row={row} onOpenDetail={onOpenDetail} />
          ))
        ) : (
          <SectionEmpty
            label={
              statusFilter === 'all'
                ? 'Aucun autre import dans l’historique.'
                : 'Aucun import ne correspond au filtre sélectionné.'
            }
          />
        )}
      </section>
    </div>
  );
};
