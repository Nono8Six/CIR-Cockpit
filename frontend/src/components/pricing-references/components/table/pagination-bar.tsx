import { Button } from '@/components/ui/inputs/basic/Button';

export const PAGE_SIZE_OPTIONS = [25, 50, 100] as const;

interface PaginationBarProps {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
}

const numberFormatter = new Intl.NumberFormat('fr-FR');

/**
 * Premium, minimal pagination bar aligned to Vercel/Linear design guidelines.
 *
 * @param props Pagination state and callbacks.
 */
export const PaginationBar = ({
  page,
  pageSize,
  total,
  onPageChange,
  onPageSizeChange
}: PaginationBarProps) => {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const pageStart = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const pageEnd = Math.min(total, page * pageSize);

  return (
    <div className="flex items-center justify-between gap-4 border-t border-stone-100 bg-stone-50/50 px-4 py-2 text-xs shrink-0 select-none">
      <div className="flex items-center gap-2.5 text-muted-foreground">
        <span className="font-mono text-[11px] font-medium tabular-nums">
          Affichage {pageStart}-{pageEnd} sur {numberFormatter.format(total)}
        </span>
        <div className="flex items-center gap-1.5 border-l border-stone-200 pl-2.5">
          <label htmlFor="pagination-page-size" className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60">
            Lignes :
          </label>
          <select
            id="pagination-page-size"
            aria-label="Nombre de lignes par page"
            value={pageSize}
            onChange={(event) => onPageSizeChange(Number(event.target.value))}
            className="h-6 rounded-md border border-stone-200 bg-background px-1.5 font-mono text-[11px] text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary shadow-sm hover:border-stone-300 transition-colors"
          >
            {PAGE_SIZE_OPTIONS.map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          className="h-7 text-xs font-semibold px-2.5 active:scale-[0.98] transition-all bg-background shadow-sm"
        >
          Précédent
        </Button>
        <span className="font-mono text-[11px] text-muted-foreground/80 font-medium tabular-nums">
          Page {page} / {totalPages}
        </span>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
          className="h-7 text-xs font-semibold px-2.5 active:scale-[0.98] transition-all bg-background shadow-sm"
        >
          Suivant
        </Button>
      </div>
    </div>
  );
};
