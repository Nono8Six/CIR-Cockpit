import { useEffect, useMemo, useState } from 'react';
import { Check, ChevronRight, Copy, Search, Sparkles } from 'lucide-react';

import type { PricingReferenceClassificationListResponse } from '../../../../../../shared/schemas/pricing/references.schema';
import { listPricingReferenceClassification } from '@/services/pricingReferences';
import { Badge } from '@/components/ui/data-display/Badge';
import { Button } from '@/components/ui/inputs/basic/Button';
import { Input } from '@/components/ui/inputs/basic/Input';
import { cn } from '@/lib/utils';
import { handleUiError } from '@/services/errors/handleUiError';

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

/**
 * Premium Drill-down Navigation Component (Miller Columns) for Classification CIR.
 * Solves visual cognitive load by allowing hierarchical exploration.
 *
 * @param props Contains importId to filter fetched classifications.
 */
export const ClassificationDrillDown = ({ importId }: ClassificationDrillDownProps) => {
  const [rows, setRows] = useState<ClassificationRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);

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

  // Fetch all classification rows for client-side hierarchical rendering
  useEffect(() => {
    let active = true;
    setIsLoading(true);

    const loadData = async () => {
      try {
        // Page 1 fetch
        const firstPage = await listPricingReferenceClassification({
          import_id: importId ?? undefined,
          page: 1,
          page_size: 100,
          sort_by: 'mega',
          sort_direction: 'asc'
        });

        if (!active) return;
        const allRows = [...firstPage.rows];
        const total = firstPage.total;

        // Fetch remaining pages in parallel if there are more than 100 records
        if (total > 100) {
          const remainingPages = Math.ceil(total / 100);
          const promises = [];
          for (let p = 2; p <= remainingPages; p++) {
            promises.push(
              listPricingReferenceClassification({
                import_id: importId ?? undefined,
                page: p,
                page_size: 100,
                sort_by: 'mega',
                sort_direction: 'asc'
              })
            );
          }
          const results = await Promise.all(promises);
          if (!active) return;
          results.forEach((res) => {
            allRows.push(...res.rows);
          });
        }

        setRows(allRows);
      } catch (error) {
        if (active) {
          handleUiError(error, 'Impossible de charger la vue hiérarchique.');
        }
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    };

    loadData();

    return () => {
      active = false;
    };
  }, [importId]);

  // Reset child selections on parent change
  useEffect(() => {
    setSelectedFam(null);
    setSelectedSfa(null);
  }, [selectedMega]);

  useEffect(() => {
    setSelectedSfa(null);
  }, [selectedFam]);

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
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 min-h-0 flex-1 overflow-hidden border border-slate-200/80 rounded-xl bg-slate-50/20 p-2 animate-pulse">
        {Array.from({ length: 3 }).map((_, idx) => (
          <div key={idx} className="flex flex-col min-h-0 bg-background border border-slate-200/60 rounded-lg p-3 space-y-3">
            <div className="h-4 bg-slate-100 rounded w-1/3" />
            <div className="h-8 bg-slate-100 rounded w-full" />
            <div className="flex-1 space-y-2 pt-2">
              {Array.from({ length: 6 }).map((_, itemIdx) => (
                <div key={itemIdx} className="h-7 bg-slate-50 rounded w-full" />
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden">
      {/* 3-Column Staircase layout */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 min-h-0 flex-1 overflow-hidden border border-slate-200/80 rounded-xl bg-slate-50/20 p-2">
        
        {/* Level 1: Méga-Familles */}
        <section className="flex flex-col min-h-0 bg-background border border-slate-200/60 rounded-lg p-3 shadow-[0_1px_2px_rgba(0,0,0,0.01)]">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-2 select-none">
            <h3 className="text-[10px] font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5 font-sans">
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
                  onClick={() => setSelectedMega(mega.id)}
                  className={cn(
                    'w-full flex items-center justify-between px-2.5 py-2 text-xs rounded-lg border border-transparent text-left transition-all active:scale-[0.99]',
                    isActive
                      ? 'bg-primary/5 border-primary/20 text-primary font-semibold'
                      : 'hover:bg-slate-50 text-slate-700'
                  )}
                >
                  <span className="truncate">
                    <span className="font-mono text-slate-400 mr-1.5 font-medium">{mega.id}</span>
                    {mega.label}
                  </span>
                  <div className="flex items-center gap-1 shrink-0 pl-2">
                    <Badge variant="secondary" className="px-1 py-0 text-[8px] font-mono text-slate-500">
                      {mega.familyCount}
                    </Badge>
                    <ChevronRight className={cn('size-3.5', isActive ? 'text-primary' : 'text-slate-400')} />
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
          "flex flex-col min-h-0 bg-background border border-slate-200/60 rounded-lg p-3 shadow-[0_1px_2px_rgba(0,0,0,0.01)] transition-opacity duration-200",
          !selectedMega && "opacity-50 pointer-events-none"
        )}>
          <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-2 select-none">
            <h3 className="text-[10px] font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5 font-sans">
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
                    onClick={() => setSelectedFam(fam.id)}
                    className={cn(
                      'w-full flex items-center justify-between px-2.5 py-2 text-xs rounded-lg border border-transparent text-left transition-all active:scale-[0.99]',
                      isActive
                        ? 'bg-primary/5 border-primary/20 text-primary font-semibold'
                        : 'hover:bg-slate-50 text-slate-700'
                    )}
                  >
                    <span className="truncate">
                      <span className="font-mono text-slate-400 mr-1.5 font-medium">{fam.id}</span>
                      {fam.label}
                    </span>
                    <div className="flex items-center gap-1 shrink-0 pl-2">
                      <Badge variant="secondary" className="px-1 py-0 text-[8px] font-mono text-slate-500">
                        {fam.subfamilyCount}
                      </Badge>
                      <ChevronRight className={cn('size-3.5', isActive ? 'text-primary' : 'text-slate-400')} />
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
          "flex flex-col min-h-0 bg-background border border-slate-200/60 rounded-lg p-3 shadow-[0_1px_2px_rgba(0,0,0,0.01)] transition-opacity duration-200",
          !selectedFam && "opacity-50 pointer-events-none"
        )}>
          <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-2 select-none">
            <h3 className="text-[10px] font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5 font-sans">
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
                        : 'hover:bg-slate-50 text-slate-700'
                    )}
                  >
                    <span className="truncate">
                      <span className="font-mono text-slate-400 mr-1.5 font-medium">{sfa.id}</span>
                      {sfa.label}
                    </span>
                    <span className="font-mono text-[9px] text-slate-400 bg-slate-50 px-1 py-0.5 rounded border ml-2 shrink-0">
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
        <div className="border border-slate-200/80 bg-background p-4 rounded-xl shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 shrink-0 animate-in fade-in slide-in-from-bottom-2 duration-300">
          <div className="space-y-1">
            <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground/80 flex items-center gap-1 select-none">
              <Sparkles className="size-3 text-slate-500" />
              Détail de la sélection
            </span>
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-xs font-semibold bg-slate-100 border border-slate-200/60 px-2 py-0.5 rounded text-slate-800">
                {selectedSfaDetails.cir_key}
              </span>
              <span className="text-xs text-slate-900 font-bold font-sans">
                {selectedSfaDetails.label}
              </span>
            </div>
            <p className="text-[10px] text-muted-foreground">
              Méga-Famille : <span className="font-medium text-slate-600">{selectedMega} - {tree[selectedMega!].label}</span> &middot; Famille : <span className="font-medium text-slate-600">{selectedFam} - {tree[selectedMega!].families[selectedFam!].label}</span>
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => handleCopyKey(selectedSfaDetails.cir_key)}
              className="h-8 text-xs font-semibold bg-background border-slate-200 hover:bg-slate-50 active:scale-[0.98] transition-all flex items-center gap-1.5"
            >
              {copiedKey === selectedSfaDetails.cir_key ? (
                <>
                  <Check className="size-3.5 text-emerald-600" /> Copié
                </>
              ) : (
                <>
                  <Copy className="size-3.5 text-slate-500" /> Copier la clé CIR
                </>
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
