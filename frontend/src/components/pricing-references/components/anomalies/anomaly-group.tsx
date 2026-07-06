import { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ChevronRight } from 'lucide-react';

import type {
  PricingReferenceAnomaliesListInput,
  PricingReferenceAnomaliesSummaryGroupByType,
  PricingReferenceAnomalySeverity
} from '../../../../../../shared/schemas/pricing/references.schema';
import { Button } from '@/components/ui/inputs/basic/Button';
import { cn } from '@/lib/utils';
import { handleUiError } from '@/services/errors/handleUiError';
import { listPricingReferenceAnomalies } from '@/services/pricingReferences';
import { pricingReferenceAnomaliesKey } from '@/services/query/queryKeys';
import { formatCount } from '../../utils/pricing-references-formatters';
import { anomalySeverityDotClassName } from './anomaly-utils';
import { AnomalyRowButton } from './anomaly-row';
import { AnomalyDetailDialog } from './anomaly-detail-dialog';

export interface AnomalyGroupFilters {
  import_id?: string;
  search?: string;
  severities?: PricingReferenceAnomalySeverity[];
  marques?: string[];
}

interface AnomalyGroupProps {
  group: PricingReferenceAnomaliesSummaryGroupByType;
  filters: AnomalyGroupFilters;
  isOpen: boolean;
  onToggle: () => void;
}

const GROUP_PAGE_SIZE = 100;

/**
 * Collapsible triage section for one anomaly type: 32px header (chevron, label,
 * mono counter, truncated correction action) and lazily fetched rows, loaded only
 * once the group is opened. The detail dialog navigates within this group and
 * returns focus to the last active row on close.
 */
export const AnomalyGroup = ({ group, filters, isOpen, onToggle }: AnomalyGroupProps) => {
  const [activeAnomalyId, setActiveAnomalyId] = useState<string | null>(null);
  const lastActiveAnomalyIdRef = useRef<string | null>(null);
  const rowRefs = useRef(new Map<string, HTMLButtonElement>());

  const listInput = useMemo(
    (): PricingReferenceAnomaliesListInput => ({
      ...(filters.import_id ? { import_id: filters.import_id } : {}),
      ...(filters.search ? { search: filters.search } : {}),
      ...(filters.severities && filters.severities.length > 0
        ? { severities: filters.severities }
        : {}),
      ...(filters.marques && filters.marques.length > 0 ? { marques: filters.marques } : {}),
      types: [group.type],
      page: 1,
      page_size: GROUP_PAGE_SIZE,
      sort_by: 'source_row_number',
      sort_direction: 'asc'
    }),
    [filters, group.type]
  );

  const listQuery = useQuery({
    queryKey: pricingReferenceAnomaliesKey(listInput),
    queryFn: () => listPricingReferenceAnomalies(listInput),
    enabled: isOpen
  });

  useEffect(() => {
    if (listQuery.error) {
      handleUiError(listQuery.error, 'Impossible de charger les anomalies de ce groupe.');
    }
  }, [listQuery.error]);

  const rows = listQuery.data?.rows ?? [];
  const total = listQuery.data?.total ?? group.count;
  const activeIndex = activeAnomalyId
    ? rows.findIndex((row) => row.id === activeAnomalyId)
    : -1;
  const activeAnomaly = activeIndex >= 0 ? rows[activeIndex] ?? null : null;

  const handleSelect = (anomalyId: string) => {
    lastActiveAnomalyIdRef.current = anomalyId;
    setActiveAnomalyId(anomalyId);
  };

  const handleNavigate = (delta: -1 | 1) => {
    const next = rows[activeIndex + delta];
    if (next) {
      lastActiveAnomalyIdRef.current = next.id;
      setActiveAnomalyId(next.id);
    }
  };

  const handleCloseAutoFocus = (event: Event) => {
    const lastActiveId = lastActiveAnomalyIdRef.current;
    const rowNode = lastActiveId ? rowRefs.current.get(lastActiveId) : undefined;
    if (rowNode) {
      event.preventDefault();
      rowNode.focus();
    }
  };

  return (
    <section aria-label={`Groupe d'anomalies : ${group.label}`}>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={isOpen}
        className="flex h-8 w-full items-center gap-2 border-b border-stone-100 bg-stone-50/80 px-4 text-left transition-colors hover:bg-stone-100/70 focus-visible:bg-stone-100/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring/45"
      >
        <ChevronRight
          className={cn(
            'size-3.5 shrink-0 text-stone-400 transition-transform',
            isOpen && 'rotate-90'
          )}
          aria-hidden="true"
        />
        <span
          className={cn(
            'size-1.5 shrink-0 rounded-full',
            anomalySeverityDotClassName[group.max_severity]
          )}
          aria-hidden="true"
        />
        <span className="shrink-0 whitespace-nowrap text-xs font-medium text-stone-950">
          {group.label}
        </span>
        <span className="shrink-0 font-mono text-[11px] tabular-nums text-stone-500">
          {formatCount(group.count)}
        </span>
        {group.action_label ? (
          <span className="min-w-0 flex-1 truncate text-right text-[11px] text-stone-500">
            {group.action_label}
          </span>
        ) : null}
      </button>

      {isOpen ? (
        listQuery.isLoading ? (
          <div aria-hidden="true">
            {Array.from({ length: Math.min(group.count, 3) }).map((_, index) => (
              <div
                key={index}
                className="flex h-9 items-center border-b border-stone-100 px-4 last:border-b-0"
              >
                <div className="h-3.5 w-2/3 animate-pulse rounded bg-stone-100" />
              </div>
            ))}
          </div>
        ) : listQuery.isError ? (
          <div className="flex items-center justify-between gap-3 border-b border-stone-100 px-4 py-3 text-xs text-red-800">
            <span>Les anomalies de ce groupe n&apos;ont pas pu être chargées.</span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-7 shrink-0 border-red-200 bg-white px-2.5 text-xs text-red-900 hover:bg-red-50"
              onClick={() => void listQuery.refetch()}
            >
              Réessayer
            </Button>
          </div>
        ) : rows.length === 0 ? (
          <p className="border-b border-stone-100 px-4 py-3 text-xs text-muted-foreground">
            Aucune ligne pour ce groupe avec les filtres actifs.
          </p>
        ) : (
          <>
            {rows.map((row) => (
              <AnomalyRowButton
                key={row.id}
                ref={(node) => {
                  if (node) {
                    rowRefs.current.set(row.id, node);
                  } else {
                    rowRefs.current.delete(row.id);
                  }
                }}
                anomaly={row}
                onSelect={handleSelect}
              />
            ))}
            {total > rows.length ? (
              <p className="border-b border-stone-100 px-4 py-2 text-[11px] text-stone-500">
                Affichage des {formatCount(rows.length)} premières anomalies sur {formatCount(total)}.
                Affinez la recherche ou les facettes pour cibler les autres.
              </p>
            ) : null}
          </>
        )
      ) : null}

      <AnomalyDetailDialog
        anomaly={activeAnomaly}
        position={activeAnomaly ? { index: activeIndex, total: rows.length } : null}
        onNavigate={handleNavigate}
        onClose={() => setActiveAnomalyId(null)}
        onCloseAutoFocus={handleCloseAutoFocus}
      />
    </section>
  );
};
