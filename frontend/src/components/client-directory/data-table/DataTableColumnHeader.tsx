import type { Column } from '@tanstack/react-table';
import { ArrowDown, ArrowUp, ChevronsUpDown } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface DataTableColumnHeaderProps<TData, TValue> {
  column: Column<TData, TValue>;
  title: string;
  sortingIndex: number;
}

const DataTableColumnHeader = <TData, TValue>({
  column,
  title,
  sortingIndex
}: DataTableColumnHeaderProps<TData, TValue>) => {
  const sorted = column.getIsSorted();
  const canSort = column.getCanSort();
  const toggleSorting = column.getToggleSortingHandler();

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      disabled={!canSort}
      aria-label={canSort ? `Trier la colonne ${title}` : `${title} non triable`}
      className="h-10 w-full justify-between rounded-lg px-2.5 text-xs font-semibold text-foreground hover:bg-accent hover:text-accent-foreground disabled:pointer-events-none disabled:opacity-50"
      onClick={(event) => {
        event.stopPropagation();
        toggleSorting?.(event);
      }}
    >
      <span className="flex min-w-0 items-center gap-2">
        <span className="truncate">{title}</span>
        {sortingIndex >= 0 ? (
          <Badge variant="secondary" className="min-w-5 justify-center px-1.5 text-[10px]">
            {sortingIndex + 1}
          </Badge>
        ) : null}
      </span>
      {sorted === 'asc' ? <ArrowUp className="size-4 text-primary" /> : null}
      {sorted === 'desc' ? <ArrowDown className="size-4 text-primary" /> : null}
      {!sorted ? <ChevronsUpDown className="size-4 text-muted-foreground/80" /> : null}
    </Button>
  );
};

DataTableColumnHeader.displayName = 'DataTableColumnHeader';

export default DataTableColumnHeader;
