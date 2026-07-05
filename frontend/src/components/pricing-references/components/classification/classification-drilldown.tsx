import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, Check, ChevronRight, Copy, Search } from 'lucide-react';

import type { PricingReferenceClassificationListResponse } from '../../../../../../shared/schemas/pricing/references.schema';
import { listAllPricingReferenceClassification } from '@/services/pricingReferences';
import { pricingReferenceClassificationAllKey } from '@/services/query/queryKeys';
import { Button } from '@/components/ui/inputs/basic/Button';
import { cn } from '@/lib/utils';
import { handleUiError } from '@/services/errors/handleUiError';
import { formatCount } from '../../utils/pricing-references-formatters';

type ClassificationRow = PricingReferenceClassificationListResponse['rows'][number];

interface ClassificationDrillDownProps {
  importId?: string | null;
  toolbar?: ReactNode;
}

interface SubFamilyNode {
  label: string;
  cir_key: string;
  row: ClassificationRow;
}

interface FamilyNode {
  label: string;
  subfamilies: {
    [sfaId: string]: SubFamilyNode;
  };
}

interface MegaFamilyNode {
  label: string;
  families: {
    [famId: string]: FamilyNode;
  };
}

interface ClassificationTree {
  [megaId: string]: MegaFamilyNode;
}

const columnClassName =
  'flex min-h-0 flex-col border-b border-stone-200/60 last:border-b-0 md:border-b-0 md:border-r md:border-stone-200/60 md:last:border-r-0';

const ColumnHeader = ({ label, count }: { label: string; count: number | null }) => (
  <div className="flex h-9 shrink-0 select-none items-center justify-between border-b border-stone-200/60 px-3">
    <span className="font-mono text-[10px] uppercase tracking-[0.08em] text-stone-400">{label}</span>
    {count !== null ? (
      <span className="font-mono text-[11px] tabular-nums text-stone-400">{formatCount(count)}</span>
    ) : null}
  </div>
);

const GhostSearch = ({
  value,
  onChange,
  placeholder,
  ariaLabel,
  disabled
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  ariaLabel: string;
  disabled?: boolean;
}) => (
  <div className="relative shrink-0 border-b border-stone-100 transition-colors focus-within:border-stone-300">
    <Search
      className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-stone-300"
      aria-hidden="true"
    />
    <input
      type="text"
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
      aria-label={ariaLabel}
      disabled={disabled}
      className="h-8 w-full bg-transparent pl-9 pr-3 text-xs text-stone-950 placeholder:text-stone-400 focus:outline-none disabled:cursor-not-allowed disabled:opacity-60"
    />
  </div>
);

const ColumnPlaceholder = ({ label }: { label: string }) => (
  <p className="px-3 py-8 text-center text-xs text-muted-foreground">{label}</p>
);

const ClassificationQueryErrorState = ({ onRetry }: { onRetry: () => void }) => (
  <div className="flex flex-1 flex-col items-center justify-center px-6 py-16 text-center">
    <div className="grid size-9 place-items-center rounded-md bg-red-50 text-red-700">
      <AlertTriangle className="size-4" aria-hidden="true" />
    </div>
    <p className="mt-3 text-sm font-semibold text-red-950">Classification indisponible</p>
    <p className="mt-1 max-w-sm text-xs leading-relaxed text-red-800/80">
      La vue hiérarchique n&apos;a pas pu charger la classification CIR. Le problème a été transmis au
      pipeline d&apos;erreurs.
    </p>
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={onRetry}
      className="mt-4 h-8 border-red-200 bg-white text-xs font-semibold text-red-900 hover:bg-red-50"
    >
      Réessayer
    </Button>
  </div>
);

/**
 * Staircase (Miller columns) navigation for the CIR classification: one single
 * surface, three hairline-separated columns, 32px rows selected by background.
 * The view toggle lives in the shared toolbar; the selected sub-family key is
 * exposed in a discreet copy band at the foot of the third column.
 */
export const ClassificationDrillDown = ({ importId, toolbar }: ClassificationDrillDownProps) => {
  // Column search terms
  const [megaSearch, setMegaSearch] = useState('');
  const [famSearch, setFamSearch] = useState('');
  const [sfaSearch, setSfaSearch] = useState('');

  // Node selection states
  const [selectedMega, setSelectedMega] = useState<string | null>(null);
  const [selectedFam, setSelectedFam] = useState<string | null>(null);
  const [selectedSfa, setSelectedSfa] = useState<string | null>(null);

  // Copy-to-clipboard state
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const listAllInput = useMemo(
    () => (importId ? { import_id: importId } : {}),
    [importId]
  );

  const classificationQuery = useQuery({
    queryKey: pricingReferenceClassificationAllKey(listAllInput),
    queryFn: () => listAllPricingReferenceClassification(listAllInput)
  });

  useEffect(() => {
    if (classificationQuery.error) {
      handleUiError(classificationQuery.error, 'Impossible de charger la vue hiérarchique.');
    }
  }, [classificationQuery.error]);

  const rows = useMemo(
    (): ClassificationRow[] => classificationQuery.data?.rows ?? [],
    [classificationQuery.data]
  );
  const isLoading = classificationQuery.isLoading;
  const isTruncated = classificationQuery.data?.truncated === true;
  const totalRows = classificationQuery.data?.total ?? rows.length;

  // Reset child selections when a parent level changes
  const handleSelectMega = (megaId: string) => {
    setSelectedMega(megaId);
    setSelectedFam(null);
    setSelectedSfa(null);
  };

  const handleSelectFam = (famId: string) => {
    setSelectedFam(famId);
    setSelectedSfa(null);
  };

  // Build the hierarchical lookup tree from the flat rows array
  const tree = useMemo((): ClassificationTree => {
    const root: ClassificationTree = {};
    rows.forEach((row) => {
      const { mega, mega_lib, fam, fam_lib, sfa, sfa_lib } = row;

      const cleanMega = mega.trim();
      const cleanMegaLib = mega_lib.trim();
      const cleanFam = fam.trim();
      const cleanFamLib = fam_lib.trim();
      const cleanSfa = sfa.trim();
      const cleanSfaLib = sfa_lib.trim();

      if (!root[cleanMega]) {
        root[cleanMega] = { label: cleanMegaLib, families: {} };
      }
      if (!root[cleanMega].families[cleanFam]) {
        root[cleanMega].families[cleanFam] = { label: cleanFamLib, subfamilies: {} };
      }
      if (!root[cleanMega].families[cleanFam].subfamilies[cleanSfa]) {
        root[cleanMega].families[cleanFam].subfamilies[cleanSfa] = {
          label: cleanSfaLib,
          cir_key: row.cir_key.trim(),
          row
        };
      }
    });
    return root;
  }, [rows]);

  // Copy handler for selected keys
  const handleCopyKey = (key: string) => {
    void navigator.clipboard.writeText(key);
    setCopiedKey(key);
    setTimeout(() => {
      setCopiedKey(null);
    }, 2000);
  };

  // Filtered lists per column level
  const filteredMegas = useMemo(() => {
    return Object.entries(tree)
      .map(([id, node]) => ({
        id,
        label: node.label,
        familyCount: Object.keys(node.families).length
      }))
      .filter(
        (m) =>
          m.id.toLowerCase().includes(megaSearch.toLowerCase()) ||
          m.label.toLowerCase().includes(megaSearch.toLowerCase())
      )
      .sort((a, b) => a.id.localeCompare(b.id));
  }, [tree, megaSearch]);

  const filteredFams = useMemo(() => {
    if (!selectedMega || !tree[selectedMega]) return [];
    return Object.entries(tree[selectedMega].families)
      .map(([id, node]) => ({
        id,
        label: node.label,
        subfamilyCount: Object.keys(node.subfamilies).length
      }))
      .filter(
        (f) =>
          f.id.toLowerCase().includes(famSearch.toLowerCase()) ||
          f.label.toLowerCase().includes(famSearch.toLowerCase())
      )
      .sort((a, b) => a.id.localeCompare(b.id));
  }, [tree, selectedMega, famSearch]);

  const filteredSfas = useMemo(() => {
    if (!selectedMega || !selectedFam || !tree[selectedMega]?.families[selectedFam]) return [];
    return Object.entries(tree[selectedMega].families[selectedFam].subfamilies)
      .map(([id, node]) => ({
        id,
        label: node.label,
        cir_key: node.cir_key,
        row: node.row
      }))
      .filter(
        (s) =>
          s.id.toLowerCase().includes(sfaSearch.toLowerCase()) ||
          s.label.toLowerCase().includes(sfaSearch.toLowerCase()) ||
          s.cir_key.toLowerCase().includes(sfaSearch.toLowerCase())
      )
      .sort((a, b) => a.id.localeCompare(b.id));
  }, [tree, selectedMega, selectedFam, sfaSearch]);

  const selectedSfaDetails = useMemo(() => {
    if (!selectedMega || !selectedFam || !selectedSfa) return null;
    return tree[selectedMega]?.families[selectedFam]?.subfamilies[selectedSfa] ?? null;
  }, [tree, selectedMega, selectedFam, selectedSfa]);

  const itemClassName = (isActive: boolean) =>
    cn(
      'flex h-8 w-full shrink-0 items-center gap-2 px-3 text-left text-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring/45',
      isActive ? 'bg-surface-1 text-stone-950' : 'text-stone-700 hover:bg-stone-50'
    );

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-stone-200/60 bg-white">
      <div className="flex min-h-11 shrink-0 flex-wrap items-center gap-2 border-b border-stone-200/60 px-4 py-1.5">
        {toolbar}
        <span className="ml-auto font-mono text-[11px] tabular-nums text-muted-foreground">
          {formatCount(totalRows)} clés
        </span>
      </div>

      {isTruncated ? (
        <p
          role="status"
          className="shrink-0 border-b border-stone-200/60 bg-amber-50/60 px-4 py-2 text-xs text-amber-900"
        >
          Vue hiérarchique limitée aux {formatCount(rows.length)} premières lignes sur{' '}
          {formatCount(totalRows)}. Utilisez la vue tableau ou affinez la source si une clé CIR
          manque.
        </p>
      ) : null}

      {isLoading ? (
        <div className="grid min-h-0 flex-1 grid-cols-1 md:grid-cols-3" aria-hidden="true">
          {Array.from({ length: 3 }).map((_, columnIdx) => (
            <div key={columnIdx} className={columnClassName}>
              <div className="flex h-9 items-center border-b border-stone-200/60 px-3">
                <div className="h-3 w-24 animate-pulse rounded bg-stone-100" />
              </div>
              <div className="h-8 border-b border-stone-100" />
              {Array.from({ length: 6 }).map((_, itemIdx) => (
                <div key={itemIdx} className="flex h-8 items-center px-3">
                  <div className="h-3.5 w-3/4 animate-pulse rounded bg-stone-50" />
                </div>
              ))}
            </div>
          ))}
        </div>
      ) : classificationQuery.isError ? (
        <ClassificationQueryErrorState onRetry={() => void classificationQuery.refetch()} />
      ) : (
        <div className="grid min-h-0 flex-1 grid-cols-1 md:grid-cols-3">
          {/* Level 1: Méga-familles */}
          <section className={columnClassName} aria-label="Méga-familles">
            <ColumnHeader label="Méga-familles" count={filteredMegas.length} />
            <GhostSearch
              value={megaSearch}
              onChange={setMegaSearch}
              placeholder="Filtrer méga…"
              ariaLabel="Filtrer les méga-familles"
            />
            <div className="min-h-0 flex-1 overflow-y-auto py-1">
              {filteredMegas.map((mega) => {
                const isActive = selectedMega === mega.id;
                return (
                  <button
                    key={mega.id}
                    type="button"
                    onClick={() => handleSelectMega(mega.id)}
                    aria-pressed={isActive}
                    className={itemClassName(isActive)}
                  >
                    <span className="w-8 shrink-0 font-mono text-[11px] tabular-nums text-stone-400">
                      {mega.id}
                    </span>
                    <span className={cn('min-w-0 flex-1 truncate', isActive && 'font-medium text-stone-950')}>
                      {mega.label}
                    </span>
                    <span className="shrink-0 font-mono text-[11px] tabular-nums text-stone-400">
                      {mega.familyCount}
                    </span>
                    <ChevronRight className="size-3.5 shrink-0 text-stone-300" aria-hidden="true" />
                  </button>
                );
              })}
              {filteredMegas.length === 0 ? <ColumnPlaceholder label="Aucun résultat" /> : null}
            </div>
          </section>

          {/* Level 2: Familles */}
          <section className={columnClassName} aria-label="Familles">
            <ColumnHeader label="Familles" count={selectedMega ? filteredFams.length : null} />
            <GhostSearch
              value={famSearch}
              onChange={setFamSearch}
              placeholder="Filtrer famille…"
              ariaLabel="Filtrer les familles"
              disabled={!selectedMega}
            />
            <div className="min-h-0 flex-1 overflow-y-auto py-1">
              {selectedMega ? (
                filteredFams.map((fam) => {
                  const isActive = selectedFam === fam.id;
                  return (
                    <button
                      key={fam.id}
                      type="button"
                      onClick={() => handleSelectFam(fam.id)}
                      aria-pressed={isActive}
                      className={itemClassName(isActive)}
                    >
                      <span className="w-8 shrink-0 font-mono text-[11px] tabular-nums text-stone-400">
                        {fam.id}
                      </span>
                      <span className={cn('min-w-0 flex-1 truncate', isActive && 'font-medium text-stone-950')}>
                        {fam.label}
                      </span>
                      <span className="shrink-0 font-mono text-[11px] tabular-nums text-stone-400">
                        {fam.subfamilyCount}
                      </span>
                      <ChevronRight className="size-3.5 shrink-0 text-stone-300" aria-hidden="true" />
                    </button>
                  );
                })
              ) : (
                <ColumnPlaceholder label="Sélectionnez une méga-famille" />
              )}
              {selectedMega && filteredFams.length === 0 ? (
                <ColumnPlaceholder label="Aucun résultat" />
              ) : null}
            </div>
          </section>

          {/* Level 3: Sous-familles */}
          <section className={columnClassName} aria-label="Sous-familles">
            <ColumnHeader label="Sous-familles" count={selectedFam ? filteredSfas.length : null} />
            <GhostSearch
              value={sfaSearch}
              onChange={setSfaSearch}
              placeholder="Filtrer sous-famille…"
              ariaLabel="Filtrer les sous-familles"
              disabled={!selectedFam}
            />
            <div className="min-h-0 flex-1 overflow-y-auto py-1">
              {selectedFam ? (
                filteredSfas.map((sfa) => {
                  const isActive = selectedSfa === sfa.id;
                  return (
                    <button
                      key={sfa.id}
                      type="button"
                      onClick={() => setSelectedSfa(sfa.id)}
                      aria-pressed={isActive}
                      className={itemClassName(isActive)}
                    >
                      <span className="w-8 shrink-0 font-mono text-[11px] tabular-nums text-stone-400">
                        {sfa.id}
                      </span>
                      <span className={cn('min-w-0 flex-1 truncate', isActive && 'font-medium text-stone-950')}>
                        {sfa.label}
                      </span>
                      <span className="shrink-0 font-mono text-[11px] tabular-nums text-stone-400">
                        {sfa.cir_key}
                      </span>
                    </button>
                  );
                })
              ) : (
                <ColumnPlaceholder label="Sélectionnez une famille" />
              )}
              {selectedFam && filteredSfas.length === 0 ? (
                <ColumnPlaceholder label="Aucun résultat" />
              ) : null}
            </div>
            {selectedSfaDetails ? (
              <div className="flex shrink-0 items-center justify-between gap-3 border-t border-stone-200/60 px-3 py-2">
                <div className="min-w-0">
                  <p className="truncate text-[11px] text-stone-500">{selectedSfaDetails.label}</p>
                  <p className="font-mono text-xs tabular-nums text-stone-950">
                    {selectedSfaDetails.cir_key}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => handleCopyKey(selectedSfaDetails.cir_key)}
                  className="h-7 shrink-0 gap-1.5 rounded-md px-2 text-xs font-medium text-stone-600 hover:bg-stone-100 hover:text-stone-950"
                >
                  {copiedKey === selectedSfaDetails.cir_key ? (
                    <>
                      <Check className="size-3.5 text-emerald-600" aria-hidden="true" />
                      Copié
                    </>
                  ) : (
                    <>
                      <Copy className="size-3.5 text-stone-400" aria-hidden="true" />
                      Copier la clé CIR
                    </>
                  )}
                </Button>
              </div>
            ) : null}
          </section>
        </div>
      )}
    </div>
  );
};
