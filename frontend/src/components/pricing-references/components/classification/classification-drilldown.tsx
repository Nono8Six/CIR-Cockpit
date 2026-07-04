import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, Check, ChevronRight, Copy, Search, Sparkles } from 'lucide-react';

import type { PricingReferenceClassificationListResponse } from '../../../../../../shared/schemas/pricing/references.schema';
import { listAllPricingReferenceClassification } from '@/services/pricingReferences';
import { pricingReferenceClassificationAllKey } from '@/services/query/queryKeys';
import { Badge } from '@/components/ui/data-display/Badge';
import { Button } from '@/components/ui/inputs/basic/Button';
import { Input } from '@/components/ui/inputs/basic/Input';
import { cn } from '@/lib/utils';
import { handleUiError } from '@/services/errors/handleUiError';
import { formatCount } from '../../utils/pricing-references-formatters';

type ClassificationRow = PricingReferenceClassificationListResponse['rows'][number];

interface ClassificationDrillDownProps {
  importId?: string | null;
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

const ClassificationQueryErrorState = ({ onRetry }: { onRetry: () => void }) => (
  <div className="flex min-h-48 flex-1 items-center justify-center rounded-xl border border-red-200 bg-red-50/50 p-6 text-center">
    <div className="max-w-sm">
      <div className="mx-auto grid size-10 place-items-center rounded-md bg-white text-red-700 shadow-sm">
        <AlertTriangle className="size-5" aria-hidden="true" />
      </div>
      <p className="mt-3 text-sm font-semibold text-red-950">
        Classification indisponible
      </p>
      <p className="mt-1 text-xs leading-relaxed text-red-800/80">
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
  </div>
);

/**
 * Premium Drill-down Navigation Component (Miller Columns) for Classification CIR.
 * Solves visual cognitive load by allowing hierarchical exploration.
 *
 * @param props Contains importId to filter fetched classifications.
 */
export const ClassificationDrillDown = ({ importId }: ClassificationDrillDownProps) => {
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
    navigator.clipboard.writeText(key);
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

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 min-h-0 flex-1 overflow-hidden border border-stone-200/80 rounded-xl bg-stone-50/20 p-2 animate-pulse">
        {Array.from({ length: 3 }).map((_, idx) => (
          <div key={idx} className="flex flex-col min-h-0 bg-background border border-stone-200/60 rounded-lg p-3 space-y-3">
            <div className="h-4 bg-stone-100 rounded w-1/3" />
            <div className="h-8 bg-stone-100 rounded w-full" />
            <div className="flex-1 space-y-2 pt-2">
              {Array.from({ length: 6 }).map((_, itemIdx) => (
                <div key={itemIdx} className="h-7 bg-stone-50 rounded w-full" />
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (classificationQuery.isError) {
    return <ClassificationQueryErrorState onRetry={() => void classificationQuery.refetch()} />;
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden">
      {isTruncated ? (
        <div
          role="status"
          className="shrink-0 rounded-lg border border-amber-200 bg-amber-50 px-3.5 py-2 text-xs font-medium text-amber-900"
        >
          Vue hiérarchique limitée aux {formatCount(rows.length)} premières lignes sur {formatCount(totalRows)}.
          Utilisez la vue tableau ou affinez la source si une clé CIR manque.
        </div>
      ) : null}
      {/* 3-Column Staircase layout */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 min-h-0 flex-1 overflow-hidden border border-stone-200/80 rounded-xl bg-stone-50/20 p-2">
        
        {/* Level 1: Méga-Familles */}
        <section className="flex flex-col min-h-0 bg-background border border-stone-200/60 rounded-lg p-3 shadow-[0_1px_2px_rgba(0,0,0,0.01)]">
          <div className="flex items-center justify-between border-b border-stone-100 pb-2 mb-2 select-none">
            <h3 className="text-[10px] font-bold uppercase tracking-wider text-stone-800 flex items-center gap-1.5 font-sans">
              <span>Méga-Familles</span>
              <Badge variant="secondary" className="px-1.5 py-0 text-[9px] font-semibold font-mono">
                {filteredMegas.length}
              </Badge>
            </h3>
          </div>
          <div className="relative shrink-0">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground/60" />
            <Input
              value={megaSearch}
              onChange={(e) => setMegaSearch(e.target.value)}
              placeholder="Filtrer méga..."
              className="h-8 pl-8 text-xs bg-background"
            />
          </div>
          <div className="flex-1 overflow-y-auto mt-3 space-y-1 pr-1">
            {filteredMegas.map((mega) => {
              const isActive = selectedMega === mega.id;
              return (
                <button
                  key={mega.id}
                  type="button"
                  onClick={() => handleSelectMega(mega.id)}
                  className={cn(
                    'w-full flex items-center justify-between px-2.5 py-2 text-xs rounded-lg border border-transparent text-left transition-all active:scale-[0.99]',
                    isActive
                      ? 'bg-primary/5 border-primary/20 text-primary font-semibold'
                      : 'hover:bg-stone-50 text-stone-700'
                  )}
                >
                  <span className="truncate">
                    <span className="font-mono text-stone-400 mr-1.5 font-medium">{mega.id}</span>
                    {mega.label}
                  </span>
                  <div className="flex items-center gap-1 shrink-0 pl-2">
                    <Badge variant="secondary" className="px-1 py-0 text-[8px] font-mono text-stone-500">
                      {mega.familyCount}
                    </Badge>
                    <ChevronRight className={cn('size-3.5', isActive ? 'text-primary' : 'text-stone-400')} />
                  </div>
                </button>
              );
            })}
            {filteredMegas.length === 0 && (
              <p className="text-center text-[10px] text-muted-foreground py-8">Aucun résultat</p>
            )}
          </div>
        </section>

        {/* Level 2: Familles */}
        <section className={cn(
          "flex flex-col min-h-0 bg-background border border-stone-200/60 rounded-lg p-3 shadow-[0_1px_2px_rgba(0,0,0,0.01)] transition-opacity duration-200",
          !selectedMega && "opacity-50 pointer-events-none"
        )}>
          <div className="flex items-center justify-between border-b border-stone-100 pb-2 mb-2 select-none">
            <h3 className="text-[10px] font-bold uppercase tracking-wider text-stone-800 flex items-center gap-1.5 font-sans">
              <span>Familles</span>
              {selectedMega && (
                <Badge variant="secondary" className="px-1.5 py-0 text-[9px] font-semibold font-mono">
                  {filteredFams.length}
                </Badge>
              )}
            </h3>
          </div>
          <div className="relative shrink-0">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground/60" />
            <Input
              value={famSearch}
              onChange={(e) => setFamSearch(e.target.value)}
              placeholder="Filtrer famille..."
              disabled={!selectedMega}
              className="h-8 pl-8 text-xs bg-background"
            />
          </div>
          <div className="flex-1 overflow-y-auto mt-3 space-y-1 pr-1">
            {selectedMega ? (
              filteredFams.map((fam) => {
                const isActive = selectedFam === fam.id;
                return (
                  <button
                    key={fam.id}
                    type="button"
                    onClick={() => handleSelectFam(fam.id)}
                    className={cn(
                      'w-full flex items-center justify-between px-2.5 py-2 text-xs rounded-lg border border-transparent text-left transition-all active:scale-[0.99]',
                      isActive
                        ? 'bg-primary/5 border-primary/20 text-primary font-semibold'
                        : 'hover:bg-stone-50 text-stone-700'
                    )}
                  >
                    <span className="truncate">
                      <span className="font-mono text-stone-400 mr-1.5 font-medium">{fam.id}</span>
                      {fam.label}
                    </span>
                    <div className="flex items-center gap-1 shrink-0 pl-2">
                      <Badge variant="secondary" className="px-1 py-0 text-[8px] font-mono text-stone-500">
                        {fam.subfamilyCount}
                      </Badge>
                      <ChevronRight className={cn('size-3.5', isActive ? 'text-primary' : 'text-stone-400')} />
                    </div>
                  </button>
                );
              })
            ) : (
              <p className="text-center text-[10px] text-muted-foreground py-8">Sélectionnez une méga-famille</p>
            )}
            {selectedMega && filteredFams.length === 0 && (
              <p className="text-center text-[10px] text-muted-foreground py-8">Aucun résultat</p>
            )}
          </div>
        </section>

        {/* Level 3: Sous-Familles */}
        <section className={cn(
          "flex flex-col min-h-0 bg-background border border-stone-200/60 rounded-lg p-3 shadow-[0_1px_2px_rgba(0,0,0,0.01)] transition-opacity duration-200",
          !selectedFam && "opacity-50 pointer-events-none"
        )}>
          <div className="flex items-center justify-between border-b border-stone-100 pb-2 mb-2 select-none">
            <h3 className="text-[10px] font-bold uppercase tracking-wider text-stone-800 flex items-center gap-1.5 font-sans">
              <span>Sous-Familles</span>
              {selectedFam && (
                <Badge variant="secondary" className="px-1.5 py-0 text-[9px] font-semibold font-mono">
                  {filteredSfas.length}
                </Badge>
              )}
            </h3>
          </div>
          <div className="relative shrink-0">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground/60" />
            <Input
              value={sfaSearch}
              onChange={(e) => setSfaSearch(e.target.value)}
              placeholder="Filtrer sous-famille..."
              disabled={!selectedFam}
              className="h-8 pl-8 text-xs bg-background"
            />
          </div>
          <div className="flex-1 overflow-y-auto mt-3 space-y-1 pr-1">
            {selectedFam ? (
              filteredSfas.map((sfa) => {
                const isActive = selectedSfa === sfa.id;
                return (
                  <button
                    key={sfa.id}
                    type="button"
                    onClick={() => setSelectedSfa(sfa.id)}
                    className={cn(
                      'w-full flex items-center justify-between px-2.5 py-2 text-xs rounded-lg border border-transparent text-left transition-all active:scale-[0.99]',
                      isActive
                        ? 'bg-primary/5 border-primary/20 text-primary font-semibold'
                        : 'hover:bg-stone-50 text-stone-700'
                    )}
                  >
                    <span className="truncate">
                      <span className="font-mono text-stone-400 mr-1.5 font-medium">{sfa.id}</span>
                      {sfa.label}
                    </span>
                    <span className="font-mono text-[9px] text-stone-400 bg-stone-50 px-1 py-0.5 rounded border ml-2 shrink-0">
                      {sfa.cir_key}
                    </span>
                  </button>
                );
              })
            ) : (
              <p className="text-center text-[10px] text-muted-foreground py-8">Sélectionnez une famille</p>
            )}
            {selectedFam && filteredSfas.length === 0 && (
              <p className="text-center text-[10px] text-muted-foreground py-8">Aucun résultat</p>
            )}
          </div>
        </section>
      </div>

      {/* Selected Leaf Detail Panel */}
      {selectedSfaDetails && (
        <div className="border border-stone-200/80 bg-background p-4 rounded-xl shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 shrink-0 animate-in fade-in slide-in-from-bottom-2 duration-300">
          <div className="space-y-1">
            <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground/80 flex items-center gap-1 select-none">
              <Sparkles className="size-3 text-stone-500" />
              Détail de la sélection
            </span>
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-xs font-semibold bg-stone-100 border border-stone-200/60 px-2 py-0.5 rounded text-stone-800">
                {selectedSfaDetails.cir_key}
              </span>
              <span className="text-xs text-stone-900 font-bold font-sans">
                {selectedSfaDetails.label}
              </span>
            </div>
            <p className="text-[10px] text-muted-foreground">
              Méga-Famille : <span className="font-medium text-stone-600">{selectedMega} - {tree[selectedMega!].label}</span> &middot; Famille : <span className="font-medium text-stone-600">{selectedFam} - {tree[selectedMega!].families[selectedFam!].label}</span>
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => handleCopyKey(selectedSfaDetails.cir_key)}
              className="h-8 text-xs font-semibold bg-background border-stone-200 hover:bg-stone-50 active:scale-[0.98] transition-all flex items-center gap-1.5"
            >
              {copiedKey === selectedSfaDetails.cir_key ? (
                <>
                  <Check className="size-3.5 text-emerald-600" /> Copié
                </>
              ) : (
                <>
                  <Copy className="size-3.5 text-stone-500" /> Copier la clé CIR
                </>
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
