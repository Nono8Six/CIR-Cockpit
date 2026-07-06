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
    <div className="flex shrink-0 select-none items-center justify-between gap-4 border-t border-border/60 bg-muted/25 px-3 py-2 text-xs">
      <div className="flex items-center gap-2.5 text-muted-foreground">
        <span className="text-[11px] text-stone-500">
          Affichage{' '}
          <span className="font-mono tabular-nums">
            {pageStart}-{pageEnd}
          </span>{' '}
          sur <span className="font-mono tabular-nums">{numberFormatter.format(total)}</span>
        </span>
        <div className="flex items-center gap-1.5 border-l border-border/70 pl-2.5">
          <label htmlFor="pagination-page-size" className="text-[11px] text-stone-500">
            Lignes :
          </label>
          <select
            id="pagination-page-size"
            aria-label="Nombre de lignes par page"
            value={pageSize}
            onChange={(event) => onPageSizeChange(Number(event.target.value))}
            className="h-7 rounded-md border border-border bg-background px-1.5 font-mono text-[11px] text-foreground transition-colors hover:border-border/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
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
          size="dataRow"
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          className="bg-background px-2.5 text-xs font-semibold"
        >
          Précédent
        </Button>
        <span className="text-[11px] text-stone-500">
          Page{' '}
          <span className="font-mono tabular-nums">
            {page} / {totalPages}
          </span>
        </span>
        <Button
          type="button"
          variant="outline"
          size="dataRow"
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
          className="bg-background px-2.5 text-xs font-semibold"
        >
          Suivant
        </Button>
      </div>
    </div>
  );
};
