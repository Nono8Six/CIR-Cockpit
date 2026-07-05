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
        <span className="font-mono text-[11px] font-medium tabular-nums">
          Affichage {pageStart}-{pageEnd} sur {numberFormatter.format(total)}
        </span>
        <div className="flex items-center gap-1.5 border-l border-border/70 pl-2.5">
          <label htmlFor="pagination-page-size" className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground/60">
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
        <span className="font-mono text-[11px] text-muted-foreground/80 font-medium tabular-nums">
          Page {page} / {totalPages}
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
