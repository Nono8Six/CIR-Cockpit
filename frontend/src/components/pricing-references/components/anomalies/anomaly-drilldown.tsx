import { useEffect, useMemo, useRef, useState } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { AlertTriangle, ChevronRight, Search } from 'lucide-react';

import type {
  PricingReferenceAnomaliesListResponse,
  PricingReferenceAnomalySeverity,
  PricingReferenceAnomalyType
} from '../../../../../../shared/schemas/pricing/references.schema';
import { listPricingReferenceAnomalies } from '@/services/pricingReferences';
import { Badge } from '@/components/ui/data-display/Badge';
import { Dialog, DialogContent } from '@/components/ui/feedback/Dialog';
import { Input } from '@/components/ui/inputs/basic/Input';
import { cn } from '@/lib/utils';
import { handleUiError } from '@/services/errors/handleUiError';
import { anomalyTypeLabels, severityLabels } from '../../utils/pricing-references-formatters';
import { EMPTY_VALUE, anomalySeverityToneClassName, getAnomalyLineContext } from './anomaly-utils';
import { AnomalyDetailPanel } from './anomaly-detail-panel';

type AnomalyRow = PricingReferenceAnomaliesListResponse['rows'][number];

interface AnomalyDrillDownProps {
  importId?: string | null;
}

interface AnomalyNode {
  row: AnomalyRow;
  lineContext: ReturnType<typeof getAnomalyLineContext>;
}

interface TypeNode {
  type: PricingReferenceAnomalyType;
  label: string;
  severity: PricingReferenceAnomalySeverity;
  anomalies: AnomalyNode[];
}

interface MarqueNode {
  marque: string;
  anomalyCount: number;
  maxSeverity: PricingReferenceAnomalySeverity;
  types: {
    [typeId: string]: TypeNode;
  };
}

interface AnomalyTree {
  [marque: string]: MarqueNode;
}

interface AnomalyRowButtonProps {
  item: AnomalyNode;
  isActive: boolean;
  onSelect: (row: AnomalyRow) => void;
}

const severityOrder: Record<PricingReferenceAnomalySeverity, number> = {
  bloquante: 4,
  haute: 3,
  moyenne: 2,
  faible: 1
};

const compareSeverity = (
  s1: PricingReferenceAnomalySeverity,
  s2: PricingReferenceAnomalySeverity
): number => {
  return severityOrder[s1] - severityOrder[s2];
};

const panelBaseClassName =
  'flex min-h-0 flex-col overflow-hidden rounded-lg border border-slate-200/70 bg-white/95 shadow-none';

const panelHeaderClassName =
  'flex min-h-[4rem] items-start justify-between gap-3 border-b border-slate-100/80 px-4 py-3.5';

const searchInputClassName =
  'h-9 rounded-md border-transparent bg-slate-100/80 pl-9 text-xs shadow-none transition-[border-color,background-color,box-shadow] placeholder:text-slate-400 hover:bg-slate-100 focus-visible:bg-white focus-visible:ring-2 focus-visible:ring-slate-200';

const selectedItemClassName =
  'border-stone-300 bg-stone-100 text-slate-950 shadow-[inset_0_0_0_1px_rgba(120,113,108,0.08)]';

const inactiveItemClassName =
  'border-transparent text-slate-700 hover:border-slate-200 hover:bg-slate-50';

const EmptyColumnState = ({ label }: { label: string }) => (
  <div className="flex min-h-32 flex-1 items-center justify-center px-4 text-center text-xs text-muted-foreground">
    {label}
  </div>
);

const AnomalyRowButton = ({ item, isActive, onSelect }: AnomalyRowButtonProps) => {
  const { row, lineContext } = item;

  return (
    <button
      type="button"
      onClick={() => onSelect(row)}
      className={cn(
        'group grid w-full grid-cols-[5.5rem_minmax(0,1fr)_auto] items-center gap-3 rounded-md border px-3 py-2.5 text-left text-xs transition-[background-color,border-color,color,transform,box-shadow] active:scale-[0.995]',
        isActive ? selectedItemClassName : 'border-slate-200/60 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50'
      )}
      aria-pressed={isActive}
    >
      <span className={cn('font-mono text-[11px] font-semibold tabular-nums', isActive ? 'text-stone-700' : 'text-slate-500')}>
        Ligne {row.source_row_number ?? EMPTY_VALUE}
      </span>
      <span className="min-w-0">
        <span className="block truncate font-semibold text-slate-950">
          {row.message}
        </span>
        <span className={cn('mt-0.5 block truncate font-mono text-[10px]', isActive ? 'text-stone-600' : 'text-slate-400')}>
          {[lineContext.segment, lineContext.idnumerique, lineContext.catFab].filter(Boolean).join(' · ') || 'Contexte Excel non renseigné'}
        </span>
      </span>
      <Badge
        variant="outline"
        className={cn(
          'px-1.5 py-0 text-[8px] font-mono leading-none shadow-none',
          anomalySeverityToneClassName[row.severity],
          isActive && 'border-stone-300 bg-white/70 text-stone-700'
        )}
      >
        {severityLabels[row.severity]}
      </Badge>
    </button>
  );
};

/**
 * Drill-down navigation for anomaly review.
 * Groups by brand, type and source line, with the detail panel rendered only after row selection.
 *
 * @param props Component properties containing optional importId.
 */
export const AnomalyDrillDown = ({ importId }: AnomalyDrillDownProps) => {
  const [rows, setRows] = useState<AnomalyRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const anomalyListRef = useRef<HTMLDivElement>(null);

  // Column search terms
  const [marqueSearch, setMarqueSearch] = useState('');
  const [typeSearch, setTypeSearch] = useState('');
  const [anomalySearch, setAnomalySearch] = useState('');

  // Selection states
  const [selectedMarque, setSelectedMarque] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [selectedAnomaly, setSelectedAnomaly] = useState<AnomalyRow | null>(null);

  // Fetch all anomalies on mount or when importId changes
  useEffect(() => {
    let active = true;
    setIsLoading(true);

    const loadData = async () => {
      try {
        const firstPage = await listPricingReferenceAnomalies({
          import_id: importId ?? undefined,
          page: 1,
          page_size: 100,
          sort_by: 'created_at',
          sort_direction: 'desc'
        });

        if (!active) return;
        const allRows = [...firstPage.rows];
        const total = firstPage.total;

        if (total > 100) {
          const remainingPages = Math.ceil(total / 100);
          const promises = [];
          for (let p = 2; p <= remainingPages; p++) {
            promises.push(
              listPricingReferenceAnomalies({
                import_id: importId ?? undefined,
                page: p,
                page_size: 100,
                sort_by: 'created_at',
                sort_direction: 'desc'
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
          handleUiError(error, 'Impossible de charger la vue hiérarchique des anomalies.');
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

  // Reset dependent selections on parent selection changes
  useEffect(() => {
    setSelectedType(null);
    setSelectedAnomaly(null);
  }, [selectedMarque]);

  useEffect(() => {
    setSelectedAnomaly(null);
  }, [selectedType]);

  // Group anomalies into a hierarchical lookup tree
  const tree = useMemo((): AnomalyTree => {
    const root: AnomalyTree = {};
    rows.forEach((row) => {
      const lineContext = getAnomalyLineContext(row);
      const rawMarque = lineContext.marque?.trim() || '';
      const marque = rawMarque || 'Général';

      if (!root[marque]) {
        root[marque] = {
          marque,
          anomalyCount: 0,
          maxSeverity: 'faible',
          types: {}
        };
      }

      const brandNode = root[marque];
      brandNode.anomalyCount += 1;

      if (compareSeverity(row.severity, brandNode.maxSeverity) > 0) {
        brandNode.maxSeverity = row.severity;
      }

      if (!brandNode.types[row.type]) {
        brandNode.types[row.type] = {
          type: row.type,
          label: anomalyTypeLabels[row.type] || row.type,
          severity: row.severity,
          anomalies: []
        };
      }

      const typeNode = brandNode.types[row.type];
      if (compareSeverity(row.severity, typeNode.severity) > 0) {
        typeNode.severity = row.severity;
      }

      typeNode.anomalies.push({
        row,
        lineContext
      });
    });

    return root;
  }, [rows]);

  // Filtered lists per column level
  const filteredMarques = useMemo(() => {
    const normalizedSearch = marqueSearch.trim().toLowerCase();
    return Object.values(tree)
      .filter((m) => m.marque.toLowerCase().includes(normalizedSearch))
      .sort((a, b) => {
        if (a.marque === 'Général') return -1;
        if (b.marque === 'Général') return 1;
        return a.marque.localeCompare(b.marque);
      });
  }, [tree, marqueSearch]);

  const filteredTypes = useMemo(() => {
    if (!selectedMarque || !tree[selectedMarque]) return [];
    const normalizedSearch = typeSearch.trim().toLowerCase();
    return Object.values(tree[selectedMarque].types)
      .filter((t) => t.label.toLowerCase().includes(normalizedSearch))
      .sort((a, b) => {
        const sevDiff = compareSeverity(b.severity, a.severity);
        if (sevDiff !== 0) return sevDiff;
        return a.label.localeCompare(b.label);
      });
  }, [tree, selectedMarque, typeSearch]);

  const filteredAnomalies = useMemo(() => {
    if (!selectedMarque || !selectedType || !tree[selectedMarque]?.types[selectedType]) return [];
    const normalizedSearch = anomalySearch.trim().toLowerCase();
    return tree[selectedMarque].types[selectedType].anomalies
      .filter((a) => {
        if (!normalizedSearch) return true;
        return (
          a.row.message.toLowerCase().includes(normalizedSearch) ||
          (a.row.source_row_number?.toString() ?? '').includes(normalizedSearch) ||
          (a.lineContext.segment?.toLowerCase() ?? '').includes(normalizedSearch) ||
          (a.lineContext.idnumerique?.toLowerCase() ?? '').includes(normalizedSearch)
        );
      })
      .sort((a, b) => {
        const rowA = a.row.source_row_number ?? 0;
        const rowB = b.row.source_row_number ?? 0;
        return rowA - rowB;
      });
  }, [tree, selectedMarque, selectedType, anomalySearch]);

  const selectedMarqueNode = selectedMarque ? tree[selectedMarque] : null;
  const selectedTypeNode = selectedMarque && selectedType
    ? tree[selectedMarque]?.types[selectedType] ?? null
    : null;

  const anomalyVirtualizer = useVirtualizer({
    count: filteredAnomalies.length,
    getItemKey: (index) => filteredAnomalies[index]?.row.id ?? index,
    getScrollElement: () => anomalyListRef.current,
    estimateSize: () => 58,
    overscan: 8
  });
  const virtualAnomalyRows = anomalyVirtualizer.getVirtualItems();

  useEffect(() => {
    if (
      selectedAnomaly
      && !filteredAnomalies.some(({ row }) => row.id === selectedAnomaly.id)
    ) {
      setSelectedAnomaly(null);
    }
  }, [filteredAnomalies, selectedAnomaly]);

  if (isLoading) {
    return (
      <div className="grid min-h-0 flex-1 grid-cols-1 gap-2 overflow-hidden rounded-lg border border-slate-200/70 bg-white p-1.5 md:grid-cols-3">
        {Array.from({ length: 3 }).map((_, idx) => (
          <div key={idx} className="flex min-h-0 flex-col space-y-3 rounded-md border border-slate-200/60 bg-slate-50/50 p-3">
            <div className="h-4 w-1/3 animate-pulse rounded bg-slate-100" />
            <div className="h-8 w-full animate-pulse rounded bg-slate-100" />
            <div className="flex-1 space-y-2 pt-2">
              {Array.from({ length: 6 }).map((_, itemIdx) => (
                <div key={itemIdx} className="h-7 w-full animate-pulse rounded bg-slate-50" />
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-slate-200/70 bg-white p-12 text-center shadow-[0_22px_70px_-56px_rgba(15,23,42,0.45)]">
        <div className="max-w-sm">
          <div className="mx-auto grid size-10 place-items-center rounded-md bg-emerald-50 text-emerald-700">
            <AlertTriangle className="size-5" aria-hidden="true" />
          </div>
          <p className="mt-4 text-sm font-semibold text-slate-950">Aucune anomalie détectée</p>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            Toutes les données du référentiel semblent saines pour cet import.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-0 flex-1 overflow-hidden rounded-lg border border-slate-200/70 bg-white p-1.5 shadow-[0_20px_60px_-54px_rgba(15,23,42,0.45)]">
      <div
        className="grid h-full min-h-0 grid-cols-1 gap-1.5 overflow-hidden lg:grid-cols-[15rem_17rem_minmax(0,1fr)]"
      >
        <section className={panelBaseClassName}>
          <div className={panelHeaderClassName}>
            <div className="min-w-0">
              <h3 className="text-[9px] font-bold uppercase tracking-[0.18em] text-slate-500">
                Marques
              </h3>
              <p className="mt-1.5 font-mono text-2xl font-semibold leading-none text-slate-950 tabular-nums">
                {filteredMarques.length}
              </p>
            </div>
          </div>
          <div className="relative shrink-0 px-3.5 pt-3">
            <Search className="absolute left-6 top-[1.475rem] h-3.5 w-3.5 text-muted-foreground/60" />
            <Input
              value={marqueSearch}
              onChange={(e) => setMarqueSearch(e.target.value)}
              placeholder="Filtrer marque..."
              className={cn(searchInputClassName, 'pl-8')}
            />
          </div>
          <div className="mt-3 flex-1 space-y-1 overflow-y-auto px-2 pb-2">
            {filteredMarques.map((item) => {
              const isActive = selectedMarque === item.marque;
              return (
                <button
                  key={item.marque}
                  type="button"
                  onClick={() => setSelectedMarque(item.marque)}
                  className={cn(
                    'group flex w-full items-center justify-between rounded-md border px-2.5 py-2 text-left text-xs transition-[background-color,border-color,color,transform,box-shadow] active:scale-[0.99]',
                    isActive ? selectedItemClassName : inactiveItemClassName
                  )}
                  aria-pressed={isActive}
                >
                  <span className="truncate font-semibold">{item.marque}</span>
                  <div className="flex shrink-0 items-center gap-1.5 pl-2">
                    <Badge
                      variant="outline"
                      className={cn(
                        'px-1.5 py-0 text-[8px] font-mono leading-none shadow-none',
                        anomalySeverityToneClassName[item.maxSeverity],
                        isActive && 'border-stone-300 bg-white/70 text-stone-700'
                      )}
                    >
                      {severityLabels[item.maxSeverity]}
                    </Badge>
                    <span className={cn('font-mono text-[10px] tabular-nums', isActive ? 'text-stone-700' : 'text-slate-500')}>
                      {item.anomalyCount}
                    </span>
                    <ChevronRight className={cn('size-3.5', isActive ? 'text-stone-600' : 'text-slate-400 group-hover:text-slate-700')} />
                  </div>
                </button>
              );
            })}
            {filteredMarques.length === 0 && (
              <EmptyColumnState label="Aucune marque correspondante" />
            )}
          </div>
        </section>

        <section className={cn(panelBaseClassName, !selectedMarque && 'opacity-60')}>
          <div className={panelHeaderClassName}>
            <div className="min-w-0">
              <h3 className="text-[9px] font-bold uppercase tracking-[0.18em] text-slate-500">
                Types
              </h3>
              <p className="mt-1 truncate text-xs font-medium text-slate-700">
                {selectedMarqueNode ? `${filteredTypes.length} groupe(s) pour ${selectedMarqueNode.marque}` : 'Sélectionnez une marque'}
              </p>
            </div>
          </div>
          <div className="relative shrink-0 px-3.5 pt-3">
            <Search className="absolute left-6 top-[1.475rem] h-3.5 w-3.5 text-muted-foreground/60" />
            <Input
              value={typeSearch}
              onChange={(e) => setTypeSearch(e.target.value)}
              placeholder="Filtrer type..."
              disabled={!selectedMarque}
              className={cn(searchInputClassName, 'pl-8')}
            />
          </div>
          <div className="mt-3 flex-1 space-y-1 overflow-y-auto px-2 pb-2">
            {selectedMarque ? (
              filteredTypes.map((item) => {
                const isActive = selectedType === item.type;
                return (
                  <button
                    key={item.type}
                    type="button"
                    onClick={() => setSelectedType(item.type)}
                    className={cn(
                      'group flex w-full items-center justify-between gap-3 rounded-md border px-2.5 py-2.5 text-left text-xs transition-[background-color,border-color,color,transform,box-shadow] active:scale-[0.99]',
                      isActive ? selectedItemClassName : inactiveItemClassName
                    )}
                    aria-pressed={isActive}
                  >
                    <span className="min-w-0 truncate font-semibold">{item.label}</span>
                    <div className="flex shrink-0 items-center gap-1.5">
                      <Badge
                        variant="outline"
                        className={cn(
                          'px-1.5 py-0 text-[8px] font-mono leading-none shadow-none',
                          anomalySeverityToneClassName[item.severity],
                          isActive && 'border-stone-300 bg-white/70 text-stone-700'
                        )}
                      >
                        {severityLabels[item.severity]}
                      </Badge>
                      <span className={cn('font-mono text-[10px] tabular-nums', isActive ? 'text-stone-700' : 'text-slate-500')}>
                        {item.anomalies.length}
                      </span>
                      <ChevronRight className={cn('size-3.5', isActive ? 'text-stone-600' : 'text-slate-400 group-hover:text-slate-700')} />
                    </div>
                  </button>
                );
              })
            ) : (
              <EmptyColumnState label="Sélectionnez une marque" />
            )}
            {selectedMarque && filteredTypes.length === 0 && (
              <EmptyColumnState label="Aucun type trouvé" />
            )}
          </div>
        </section>

        <section className={cn(panelBaseClassName, !selectedType && 'opacity-60')}>
          <div className={panelHeaderClassName}>
            <div className="min-w-0">
              <h3 className="text-[9px] font-bold uppercase tracking-[0.18em] text-slate-500">
                Lignes source
              </h3>
              <p className="mt-1 truncate text-xs font-medium text-slate-700">
                {selectedTypeNode ? `${filteredAnomalies.length} ligne(s), ${selectedTypeNode.label}` : 'Sélectionnez un type'}
              </p>
            </div>
          </div>
          <div className="relative shrink-0 px-3.5 pt-3">
            <Search className="absolute left-6 top-[1.475rem] h-3.5 w-3.5 text-muted-foreground/60" />
            <Input
              value={anomalySearch}
              onChange={(e) => setAnomalySearch(e.target.value)}
              placeholder="Filtrer par ligne, msg..."
              disabled={!selectedType}
              className={cn(searchInputClassName, 'pl-8')}
            />
          </div>
          <div ref={anomalyListRef} className="mt-3 min-h-0 flex-1 overflow-y-auto px-2 pb-2">
            {selectedType && filteredAnomalies.length > 0 ? (
              virtualAnomalyRows.length > 0 ? (
                <div
                  className="relative w-full"
                  style={{ height: `${anomalyVirtualizer.getTotalSize()}px` }}
                >
                  {virtualAnomalyRows.map((virtualRow) => {
                    const item = filteredAnomalies[virtualRow.index];
                    if (!item) return null;
                    return (
                      <div
                        key={virtualRow.key}
                        data-index={virtualRow.index}
                        ref={anomalyVirtualizer.measureElement}
                        className="absolute left-0 top-0 w-full pb-1.5"
                        style={{ transform: `translateY(${virtualRow.start}px)` }}
                      >
                        <AnomalyRowButton
                          item={item}
                          isActive={selectedAnomaly?.id === item.row.id}
                          onSelect={setSelectedAnomaly}
                        />
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="space-y-1.5">
                  {filteredAnomalies.slice(0, 50).map((item) => (
                    <AnomalyRowButton
                      key={item.row.id}
                      item={item}
                      isActive={selectedAnomaly?.id === item.row.id}
                      onSelect={setSelectedAnomaly}
                    />
                  ))}
                </div>
              )
            ) : (
              <EmptyColumnState label={selectedType ? 'Aucune anomalie trouvée' : 'Sélectionnez un type d’anomalie'} />
            )}
          </div>
        </section>

      </div>
      <Dialog
        open={Boolean(selectedAnomaly)}
        onOpenChange={(open) => {
          if (!open) setSelectedAnomaly(null);
        }}
      >
        <DialogContent
          className="w-[calc(100vw-1rem)] max-w-4xl gap-0 overflow-hidden border-slate-200 bg-white p-0 shadow-xl sm:w-[min(100vw-2rem,56rem)] sm:rounded-lg"
          overlayClassName="bg-foreground/30 backdrop-blur-[2px]"
          showCloseButton={false}
        >
          <AnomalyDetailPanel
            anomaly={selectedAnomaly}
            onClose={() => setSelectedAnomaly(null)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
};

