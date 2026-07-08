import { useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

import type {
  PricingReferenceDiffObjectType,
  PricingReferenceDiffRow
} from '../../../../../../shared/schemas/pricing/references.schema';
import { Button } from '@/components/ui/inputs/basic/Button';
import { cn } from '@/lib/utils';
import { diffObjectTypeLabels, formatCount } from '../../utils/pricing-references-formatters';
import { ChangeRowButton } from './change-row';
import { ChangeDetailDialog } from './change-detail-dialog';

interface ChangesGroupProps {
  objectType: PricingReferenceDiffObjectType;
  rows: readonly PricingReferenceDiffRow[];
  total: number;
  page: number;
  pageSize: number;
  isLoading: boolean;
  isError: boolean;
  isOpen: boolean;
  onToggle: () => void;
  onPageChange: (page: number) => void;
  onRetry: () => void;
}

/**
 * Section de triage pour un type d'objet : en-tête 32 px (chevron, libellé,
 * compteur mono filtré), lignes servies par le parent et pagination serveur par
 * groupe. Le dialog de détail navigue dans les lignes chargées du groupe et rend
 * le focus à la dernière ligne active à la fermeture.
 */
export const ChangesGroup = ({
  objectType,
  rows,
  total,
  page,
  pageSize,
  isLoading,
  isError,
  isOpen,
  onToggle,
  onPageChange,
  onRetry
}: ChangesGroupProps) => {
  const [activeChangeId, setActiveChangeId] = useState<string | null>(null);
  const lastActiveChangeIdRef = useRef<string | null>(null);
  const rowRefs = useRef(new Map<string, HTMLButtonElement>());

  const label = diffObjectTypeLabels[objectType];
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const pageStart = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const pageEnd = Math.min(total, page * pageSize);
  const activeIndex = activeChangeId
    ? rows.findIndex((row) => row.id === activeChangeId)
    : -1;
  const activeChange = activeIndex >= 0 ? rows[activeIndex] ?? null : null;

  const handleSelect = (changeId: string) => {
    lastActiveChangeIdRef.current = changeId;
    setActiveChangeId(changeId);
  };

  const handleNavigate = (delta: -1 | 1) => {
    const next = rows[activeIndex + delta];
    if (next) {
      lastActiveChangeIdRef.current = next.id;
      setActiveChangeId(next.id);
    }
  };

  const handleCloseAutoFocus = (event: Event) => {
    const lastActiveId = lastActiveChangeIdRef.current;
    const rowNode = lastActiveId ? rowRefs.current.get(lastActiveId) : undefined;
    if (rowNode) {
      event.preventDefault();
      rowNode.focus();
    }
  };

  return (
    <section aria-label={`Groupe de changements : ${label}`}>
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
        <span className="shrink-0 whitespace-nowrap text-xs font-medium text-stone-950">
          {label}
        </span>
        <span className="shrink-0 font-mono text-[11px] tabular-nums text-stone-500">
          {formatCount(total)}
        </span>
      </button>

      {isOpen ? (
        isLoading ? (
          <div aria-hidden="true">
            {Array.from({ length: 3 }).map((_, index) => (
              <div
                key={index}
                className="flex h-9 items-center border-b border-stone-100 px-4 last:border-b-0"
              >
                <div className="h-3.5 w-2/3 animate-pulse rounded bg-stone-100" />
              </div>
            ))}
          </div>
        ) : isError ? (
          <div className="flex items-center justify-between gap-3 border-b border-stone-100 px-4 py-3 text-xs text-red-800">
            <span>Les changements de ce groupe n&apos;ont pas pu être chargés.</span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-7 shrink-0 border-red-200 bg-white px-2.5 text-xs text-red-900 hover:bg-red-50"
              onClick={onRetry}
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
              <ChangeRowButton
                key={row.id}
                ref={(node) => {
                  if (node) {
                    rowRefs.current.set(row.id, node);
                  } else {
                    rowRefs.current.delete(row.id);
                  }
                }}
                change={row}
                onSelect={handleSelect}
              />
            ))}
            {totalPages > 1 ? (
              <div className="flex items-center justify-between gap-3 border-b border-stone-100 bg-stone-50/40 px-4 py-1.5">
                <span className="text-[11px] text-stone-500">
                  <span className="font-mono tabular-nums">
                    {pageStart}-{pageEnd}
                  </span>{' '}
                  sur <span className="font-mono tabular-nums">{formatCount(total)}</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-6 rounded-md text-stone-500 hover:bg-stone-100 hover:text-stone-950"
                    disabled={page <= 1}
                    onClick={() => onPageChange(page - 1)}
                    aria-label={`Page précédente du groupe ${label}`}
                  >
                    <ChevronLeft className="size-3.5" aria-hidden="true" />
                  </Button>
                  <span className="font-mono text-[11px] tabular-nums text-stone-500">
                    {page} / {totalPages}
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-6 rounded-md text-stone-500 hover:bg-stone-100 hover:text-stone-950"
                    disabled={page >= totalPages}
                    onClick={() => onPageChange(page + 1)}
                    aria-label={`Page suivante du groupe ${label}`}
                  >
                    <ChevronRight className="size-3.5" aria-hidden="true" />
                  </Button>
                </span>
              </div>
            ) : null}
          </>
        )
      ) : null}

      <ChangeDetailDialog
        change={activeChange}
        position={activeChange ? { index: activeIndex, total: rows.length } : null}
        onNavigate={handleNavigate}
        onClose={() => setActiveChangeId(null)}
        onCloseAutoFocus={handleCloseAutoFocus}
      />
    </section>
  );
};
