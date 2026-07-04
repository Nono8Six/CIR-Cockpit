import { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useVirtualizer } from '@tanstack/react-virtual';
import { AlertTriangle, ChevronRight, Search } from 'lucide-react';

import type {
  PricingReferenceAnomaliesListResponse,
  PricingReferenceAnomaliesSummaryMarque,
  PricingReferenceAnomaliesSummaryType,
  PricingReferenceAnomalyType
} from '../../../../../../shared/schemas/pricing/references.schema';
import {
  getPricingReferenceAnomaliesSummary,
  listPricingReferenceAnomalies
} from '@/services/pricingReferences';
import {
  pricingReferenceAnomaliesKey,
  pricingReferenceAnomaliesSummaryKey
} from '@/services/query/queryKeys';
import { Badge } from '@/components/ui/data-display/Badge';
import { Dialog, DialogContent } from '@/components/ui/feedback/Dialog';
import { Button } from '@/components/ui/inputs/basic/Button';
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

interface AnomalyRowButtonProps {
  item: AnomalyNode;
  isActive: boolean;
  onSelect: (row: AnomalyRow) => void;
}

const ANOMALY_LEAF_PAGE_SIZE = 100;

const panelBaseClassName =
  'flex min-h-0 flex-col overflow-hidden rounded-lg border border-stone-200/70 bg-white/95 shadow-none';

const panelHeaderClassName =
  'flex min-h-[4rem] items-start justify-between gap-3 border-b border-stone-100/80 px-4 py-3.5';

const searchInputClassName =
  'h-9 rounded-md border-transparent bg-stone-100/80 pl-9 text-xs shadow-none transition-[border-color,background-color,box-shadow] placeholder:text-stone-400 hover:bg-stone-100 focus-visible:bg-white focus-visible:ring-2 focus-visible:ring-stone-200';

const selectedItemClassName =
  'border-stone-300 bg-stone-100 text-stone-950 shadow-[inset_0_0_0_1px_rgba(120,113,108,0.08)]';

const inactiveItemClassName =
  'border-transparent text-stone-700 hover:border-stone-200 hover:bg-stone-50';

const EmptyColumnState = ({ label }: { label: string }) => (
  <div className="flex min-h-32 flex-1 items-center justify-center px-4 text-center text-xs text-muted-foreground">
    {label}
  </div>
);

const ColumnLoadingState = () => (
  <div className="space-y-1.5 px-2 pb-2">
    {Array.from({ length: 6 }).map((_, itemIdx) => (
      <div key={itemIdx} className="h-9 w-full animate-pulse rounded bg-stone-50" />
    ))}
  </div>
);

const QueryErrorState = ({
  title,
  description,
  onRetry
}: {
  title: string;
  description: string;
  onRetry: () => void;
}) => (
  <div className="flex min-h-32 flex-1 items-center justify-center px-4 text-center">
    <div className="max-w-sm">
      <div className="mx-auto grid size-9 place-items-center rounded-md bg-red-50 text-red-700">
        <AlertTriangle className="size-4" aria-hidden="true" />
      </div>
      <p className="mt-3 text-sm font-semibold text-red-950">{title}</p>
      <p className="mt-1 text-xs leading-relaxed text-red-800/80">{description}</p>
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

const AnomalyRowButton = ({ item, isActive, onSelect }: AnomalyRowButtonProps) => {
  const { row, lineContext } = item;

  return (
    <button
      type="button"
      onClick={() => onSelect(row)}
      className={cn(
        'group grid w-full grid-cols-[5.5rem_minmax(0,1fr)_auto] items-center gap-3 rounded-md border px-3 py-2.5 text-left text-xs transition-[background-color,border-color,color,transform,box-shadow] active:scale-[0.995]',
        isActive ? selectedItemClassName : 'border-stone-200/60 bg-white text-stone-700 hover:border-stone-300 hover:bg-stone-50'
      )}
      aria-pressed={isActive}
    >
      <span className={cn('font-mono text-[11px] font-semibold tabular-nums', isActive ? 'text-stone-700' : 'text-stone-500')}>
        Ligne {row.source_row_number ?? EMPTY_VALUE}
      </span>
      <span className="min-w-0">
        <span className="block truncate font-semibold text-stone-950">
          {row.message}
        </span>
        <span className={cn('mt-0.5 block truncate font-mono text-[10px]', isActive ? 'text-stone-600' : 'text-stone-400')}>
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
 * Columns marques/types come from the server-side summary aggregate; source rows
 * are fetched lazily for the selected (marque, type) pair only.
 *
 * @param props Component properties containing optional importId.
 */
export const AnomalyDrillDown = ({ importId }: AnomalyDrillDownProps) => {
  const anomalyListRef = useRef<HTMLDivElement>(null);

  // Column search terms
  const [marqueSearch, setMarqueSearch] = useState('');
  const [typeSearch, setTypeSearch] = useState('');
  const [anomalySearch, setAnomalySearch] = useState('');

  // Selection states
  const [selectedMarque, setSelectedMarque] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState<PricingReferenceAnomalyType | null>(null);
  const [selectedAnomaly, setSelectedAnomaly] = useState<AnomalyRow | null>(null);

  const summaryInput = useMemo(
    () => (importId ? { import_id: importId } : {}),
    [importId]
  );

  const summaryQuery = useQuery({
    queryKey: pricingReferenceAnomaliesSummaryKey(summaryInput),
    queryFn: () => getPricingReferenceAnomaliesSummary(summaryInput)
  });

  const leafInput = useMemo(
    () => ({
      ...(importId ? { import_id: importId } : {}),
      ...(selectedMarque ? { marque: selectedMarque } : {}),
      ...(selectedType ? { type: selectedType } : {}),
      search: anomalySearch || undefined,
      page: 1,
      page_size: ANOMALY_LEAF_PAGE_SIZE,
      sort_by: 'source_row_number' as const,
      sort_direction: 'asc' as const
    }),
    [anomalySearch, importId, selectedMarque, selectedType]
  );

  const anomaliesQuery = useQuery({
    queryKey: pricingReferenceAnomaliesKey(leafInput),
    queryFn: () => listPricingReferenceAnomalies(leafInput),
    enabled: Boolean(selectedMarque && selectedType)
  });

  useEffect(() => {
    if (summaryQuery.error) {
      handleUiError(summaryQuery.error, 'Impossible de charger la vue hiérarchique des anomalies.');
    }
  }, [summaryQuery.error]);

  useEffect(() => {
    if (anomaliesQuery.error) {
      handleUiError(anomaliesQuery.error, 'Impossible de charger les lignes source des anomalies.');
    }
  }, [anomaliesQuery.error]);

  // Reset dependent selections when a parent level changes
  const handleSelectMarque = (marque: string) => {
    setSelectedMarque(marque);
    setSelectedType(null);
    setSelectedAnomaly(null);
  };

  const handleSelectType = (type: PricingReferenceAnomalyType) => {
    setSelectedType(type);
    setSelectedAnomaly(null);
  };

  const marques = useMemo(
    () => summaryQuery.data?.marques ?? [],
    [summaryQuery.data]
  );
  const totalAnomalies = summaryQuery.data?.total ?? 0;

  // Filtered lists per column level
  const filteredMarques = useMemo((): PricingReferenceAnomaliesSummaryMarque[] => {
    const normalizedSearch = marqueSearch.trim().toLowerCase();
    return marques
      .filter((entry) => entry.marque.toLowerCase().includes(normalizedSearch))
      .sort((a, b) => {
        if (a.marque === 'Général') return -1;
        if (b.marque === 'Général') return 1;
        return a.marque.localeCompare(b.marque);
      });
  }, [marques, marqueSearch]);

  const selectedMarqueNode = useMemo(
    () => (selectedMarque ? marques.find((entry) => entry.marque === selectedMarque) ?? null : null),
    [marques, selectedMarque]
  );

  const filteredTypes = useMemo((): Array<PricingReferenceAnomaliesSummaryType & { label: string }> => {
    if (!selectedMarqueNode) return [];
    const normalizedSearch = typeSearch.trim().toLowerCase();
    return selectedMarqueNode.types
      .map((entry) => ({ ...entry, label: anomalyTypeLabels[entry.type] || entry.type }))
      .filter((entry) => entry.label.toLowerCase().includes(normalizedSearch));
  }, [selectedMarqueNode, typeSearch]);

  const selectedTypeNode = useMemo(
    () => (selectedType ? filteredTypes.find((entry) => entry.type === selectedType)
      ?? (selectedMarqueNode?.types.find((entry) => entry.type === selectedType)
        ? {
          ...selectedMarqueNode.types.find((entry) => entry.type === selectedType) as PricingReferenceAnomaliesSummaryType,
          label: anomalyTypeLabels[selectedType] || selectedType
        }
        : null)
      : null),
    [filteredTypes, selectedMarqueNode, selectedType]
  );

  const leafRows = useMemo(
    () => anomaliesQuery.data?.rows ?? [],
    [anomaliesQuery.data]
  );
  const leafTotal = anomaliesQuery.data?.total ?? 0;

  const filteredAnomalies = useMemo((): AnomalyNode[] => {
    if (!selectedMarque || !selectedType) return [];
    const normalizedSearch = anomalySearch.trim().toLowerCase();
    return leafRows
      .map((row) => ({ row, lineContext: getAnomalyLineContext(row) }))
      .filter((item) => {
        if (!normalizedSearch) return true;
        return (
          item.row.message.toLowerCase().includes(normalizedSearch) ||
          (item.row.source_row_number?.toString() ?? '').includes(normalizedSearch) ||
          (item.lineContext.segment?.toLowerCase() ?? '').includes(normalizedSearch) ||
          (item.lineContext.idnumerique?.toLowerCase() ?? '').includes(normalizedSearch)
        );
      });
  }, [anomalySearch, leafRows, selectedMarque, selectedType]);

  // eslint-disable-next-line react-hooks/incompatible-library -- TanStack Virtual is the project standard for long scrollable lists.
  const anomalyVirtualizer = useVirtualizer({
    count: filteredAnomalies.length,
    getItemKey: (index) => filteredAnomalies[index]?.row.id ?? index,
    getScrollElement: () => anomalyListRef.current,
    estimateSize: () => 58,
    overscan: 8
  });
  const virtualAnomalyRows = anomalyVirtualizer.getVirtualItems();

  const visibleSelectedAnomaly = useMemo(
    () => (
      selectedAnomaly && filteredAnomalies.some(({ row }) => row.id === selectedAnomaly.id)
        ? selectedAnomaly
        : null
    ),
    [filteredAnomalies, selectedAnomaly]
  );

  if (summaryQuery.isLoading) {
    return (
      <div className="grid min-h-0 flex-1 grid-cols-1 gap-2 overflow-hidden rounded-lg border border-stone-200/70 bg-white p-1.5 md:grid-cols-3">
        {Array.from({ length: 3 }).map((_, idx) => (
          <div key={idx} className="flex min-h-0 flex-col space-y-3 rounded-md border border-stone-200/60 bg-stone-50/50 p-3">
            <div className="h-4 w-1/3 animate-pulse rounded bg-stone-100" />
            <div className="h-8 w-full animate-pulse rounded bg-stone-100" />
            <div className="flex-1 space-y-2 pt-2">
              {Array.from({ length: 6 }).map((_, itemIdx) => (
                <div key={itemIdx} className="h-7 w-full animate-pulse rounded bg-stone-50" />
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (summaryQuery.isError) {
    return (
      <div className="flex min-h-0 flex-1 overflow-hidden rounded-lg border border-red-200 bg-white p-1.5">
        <QueryErrorState
          title="Anomalies indisponibles"
          description="La synthèse hiérarchique n'a pas pu être chargée. Le problème a été transmis au pipeline d'erreurs."
          onRetry={() => void summaryQuery.refetch()}
        />
      </div>
    );
  }

  if (totalAnomalies === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-stone-200/70 bg-white p-12 text-center shadow-[0_22px_70px_-56px_rgba(15,23,42,0.45)]">
        <div className="max-w-sm">
          <div className="mx-auto grid size-10 place-items-center rounded-md bg-emerald-50 text-emerald-700">
            <AlertTriangle className="size-5" aria-hidden="true" />
          </div>
          <p className="mt-4 text-sm font-semibold text-stone-950">Aucune anomalie détectée</p>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            Toutes les données du référentiel semblent saines pour cet import.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-0 flex-1 overflow-hidden rounded-lg border border-stone-200/70 bg-white p-1.5 shadow-[0_20px_60px_-54px_rgba(15,23,42,0.45)]">
      <div
        className="grid h-full min-h-0 grid-cols-1 gap-1.5 overflow-hidden lg:grid-cols-[15rem_17rem_minmax(0,1fr)]"
      >
        <section className={panelBaseClassName}>
          <div className={panelHeaderClassName}>
            <div className="min-w-0">
              <h3 className="text-[9px] font-bold uppercase tracking-[0.18em] text-stone-500">
                Marques
              </h3>
              <p className="mt-1.5 font-mono text-2xl font-semibold leading-none text-stone-950 tabular-nums">
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
                  onClick={() => handleSelectMarque(item.marque)}
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
                        anomalySeverityToneClassName[item.max_severity],
                        isActive && 'border-stone-300 bg-white/70 text-stone-700'
                      )}
                    >
                      {severityLabels[item.max_severity]}
                    </Badge>
                    <span className={cn('font-mono text-[10px] tabular-nums', isActive ? 'text-stone-700' : 'text-stone-500')}>
                      {item.anomaly_count}
                    </span>
                    <ChevronRight className={cn('size-3.5', isActive ? 'text-stone-600' : 'text-stone-400 group-hover:text-stone-700')} />
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
              <h3 className="text-[9px] font-bold uppercase tracking-[0.18em] text-stone-500">
                Types
              </h3>
              <p className="mt-1 truncate text-xs font-medium text-stone-700">
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
                    onClick={() => handleSelectType(item.type)}
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
                          anomalySeverityToneClassName[item.max_severity],
                          isActive && 'border-stone-300 bg-white/70 text-stone-700'
                        )}
                      >
                        {severityLabels[item.max_severity]}
                      </Badge>
                      <span className={cn('font-mono text-[10px] tabular-nums', isActive ? 'text-stone-700' : 'text-stone-500')}>
                        {item.anomaly_count}
                      </span>
                      <ChevronRight className={cn('size-3.5', isActive ? 'text-stone-600' : 'text-stone-400 group-hover:text-stone-700')} />
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
              <h3 className="text-[9px] font-bold uppercase tracking-[0.18em] text-stone-500">
                Lignes source
              </h3>
              <p className="mt-1 truncate text-xs font-medium text-stone-700">
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
            {selectedType && anomaliesQuery.isLoading ? (
              <ColumnLoadingState />
            ) : selectedType && anomaliesQuery.isError ? (
              <QueryErrorState
                title="Lignes source indisponibles"
                description="Le détail de ce groupe d'anomalies n'a pas pu être chargé."
                onRetry={() => void anomaliesQuery.refetch()}
              />
            ) : selectedType && filteredAnomalies.length > 0 ? (
              <>
                {leafTotal > leafRows.length && (
                  <p className="px-1 pb-2 text-[10px] text-muted-foreground">
                    Affichage des {leafRows.length} premières lignes sur {leafTotal}. Affinez la recherche pour cibler les autres.
                  </p>
                )}
                {virtualAnomalyRows.length > 0 ? (
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
                            isActive={visibleSelectedAnomaly?.id === item.row.id}
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
                        isActive={visibleSelectedAnomaly?.id === item.row.id}
                        onSelect={setSelectedAnomaly}
                      />
                    ))}
                  </div>
                )}
              </>
            ) : (
              <EmptyColumnState label={selectedType ? 'Aucune anomalie trouvée' : 'Sélectionnez un type d’anomalie'} />
            )}
          </div>
        </section>

      </div>
      <Dialog
        open={Boolean(visibleSelectedAnomaly)}
        onOpenChange={(open) => {
          if (!open) setSelectedAnomaly(null);
        }}
      >
        <DialogContent
          className="w-[calc(100vw-1rem)] max-w-4xl gap-0 overflow-hidden border-stone-200 bg-white p-0 shadow-xl sm:w-[min(100vw-2rem,56rem)] sm:rounded-lg"
          overlayClassName="bg-foreground/30 backdrop-blur-[2px]"
          showCloseButton={false}
        >
          <AnomalyDetailPanel
            anomaly={visibleSelectedAnomaly}
            onClose={() => setSelectedAnomaly(null)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
};
