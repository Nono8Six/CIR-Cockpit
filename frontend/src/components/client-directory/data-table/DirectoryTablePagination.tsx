import { DIRECTORY_PAGE_SIZES } from 'shared/schemas/directory.schema';
import { ChevronsLeft, ChevronsRight } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';

interface DirectoryTablePaginationProps {
  page: number;
  pageSize: number;
  total?: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
}

const buildPageItems = (page: number, totalPages: number): Array<number | 'ellipsis'> => {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  if (page <= 3) {
    return [1, 2, 3, 4, 'ellipsis', totalPages];
  }

  if (page >= totalPages - 2) {
    return [1, 'ellipsis', totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
  }

  return [1, 'ellipsis', page - 1, page, page + 1, 'ellipsis', totalPages];
};

const DirectoryTablePagination = ({
  page,
  pageSize,
  total,
  onPageChange,
  onPageSizeChange
}: DirectoryTablePaginationProps) => {
  const hasTotal = typeof total === 'number';
  const totalPages = hasTotal ? Math.max(1, Math.ceil(total / pageSize)) : page + 1;
  const pageStart = hasTotal && total === 0 ? 0 : ((page - 1) * pageSize) + 1;
  const pageEnd = hasTotal ? Math.min(total, page * pageSize) : page * pageSize;
  const pageItems = buildPageItems(page, totalPages);

  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
        <span className="tabular-nums">{hasTotal ? `${pageStart}-${pageEnd} / ${total}` : `${pageStart}-${pageEnd}`}</span>
        <div className="flex items-center gap-2">
          <span>Lignes</span>
          <Select value={String(pageSize)} onValueChange={(value) => onPageSizeChange(Number(value))}>
            <SelectTrigger
              density="dense"
              className="w-[72px]"
              aria-label="Nombre de lignes par page"
            >
              <SelectValue placeholder="50" />
            </SelectTrigger>
            <SelectContent>
              {DIRECTORY_PAGE_SIZES.map((size) => (
                <SelectItem key={size} value={String(size)}>
                  {size}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-1">
        <Button
          type="button"
          variant="outline"
          size="sm"
          aria-label="Première page"
          onClick={() => onPageChange(1)}
          disabled={page <= 1}
        >
          <ChevronsLeft className="size-4" />
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          aria-label="Page précédente"
          onClick={() => onPageChange(Math.max(1, page - 1))}
          disabled={page <= 1}
        >
          <span className="hidden sm:inline">Précédent</span>
          <span className="sm:hidden">‹</span>
        </Button>
        <span className="px-2 text-sm text-muted-foreground tabular-nums sm:hidden">{`${page} / ${totalPages}`}</span>
        {pageItems.map((item, index) => item === 'ellipsis' ? (
          <span key={`ellipsis-${index}`} className="hidden px-2 text-sm text-muted-foreground sm:inline-flex">…</span>
        ) : (
          <Button
            key={item}
            type="button"
            variant={item === page ? 'default' : 'outline'}
            size="sm"
            className="hidden sm:inline-flex"
            aria-label={`Aller à la page ${item}`}
            onClick={() => onPageChange(item)}
          >
            {item}
          </Button>
        ))}
        <Button
          type="button"
          variant="outline"
          size="sm"
          aria-label="Page suivante"
          onClick={() => onPageChange(Math.min(totalPages, page + 1))}
          disabled={page >= totalPages}
        >
          <span className="hidden sm:inline">Suivant</span>
          <span className="sm:hidden">›</span>
        </Button>
        {hasTotal ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            aria-label="Dernière page"
            onClick={() => onPageChange(totalPages)}
            disabled={page >= totalPages}
          >
            <ChevronsRight className="size-4" />
          </Button>
        ) : null}
      </div>
    </div>
  );
};

export default DirectoryTablePagination;
