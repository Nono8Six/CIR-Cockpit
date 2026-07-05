import type { ReactNode } from 'react';
import { Search } from 'lucide-react';

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/data-display/Table';
import { APP_SHELL_CLASSES } from '@/components/app-shell/appShellTokens';
import { cn } from '@/lib/utils';
import type { PricingReferenceSortDirection } from '../../../../../../shared/schemas/pricing/references.schema';
import { SortButton } from './sort-button';
import { PaginationBar } from './pagination-bar';

export interface DataColumn<TRow> {
  id: string;
  label: string;
  className?: string;
  sortBy?: string;
  render: (row: TRow) => ReactNode;
}

interface ReferenceTableProps<TRow> {
  rows: TRow[];
  columns: Array<DataColumn<TRow>>;
  isLoading: boolean;
  isFetching: boolean;
  page: number;
  pageSize: number;
  total: number;
  sortBy: string;
  sortDirection: PricingReferenceSortDirection;
  emptyLabel: string;
  onSort: (sortBy: string) => void;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  onRowClick?: (row: TRow) => void;
  rowActionLabel?: string;
}

/**
 * Premium Reference Table component.
 * Optimized for Cockpit visual density with sticky headers, custom scrollable areas, and refined typography.
 */
export const ReferenceTable = <TRow,>({
  rows,
  columns,
  isLoading,
  isFetching,
  page,
  pageSize,
  total,
  sortBy,
  sortDirection,
  emptyLabel,
  onSort,
  onPageChange,
  onPageSizeChange,
  onRowClick,
  rowActionLabel
}: ReferenceTableProps<TRow>) => (
  <div className={cn('flex min-h-0 flex-1 flex-col overflow-hidden', APP_SHELL_CLASSES.pagePanel)}>
    <div className="min-h-0 flex-1 overflow-auto">
      <Table scrollArea={false} className="min-w-[860px] border-collapse">
        <TableHeader className="sticky top-0 z-10 border-b border-border bg-muted/35 backdrop-blur-sm">
          <TableRow className="hover:bg-transparent">
            {columns.map((column) => (
              <TableHead
                key={column.id}
                className={cn(
                  'border-b border-border bg-muted/35',
                  column.className
                )}
              >
                {column.sortBy ? (
                  <SortButton
                    label={column.label}
                    active={sortBy === column.sortBy}
                    direction={sortDirection}
                    onClick={() => onSort(column.sortBy ?? column.id)}
                  />
                ) : (
                  <span className="block px-1.5 text-[11px] font-semibold text-muted-foreground">
                    {column.label}
                  </span>
                )}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody className="divide-y divide-border/55">
          {isLoading ? (
            Array.from({ length: Math.min(pageSize, 12) }).map((_, index) => (
              <TableRow key={`skeleton-${index}`} className="animate-pulse">
                {columns.map((column, columnIndex) => (
                  <TableCell key={`${column.id}-${index}`} className="px-2 py-2">
                    <div
                      className={cn(
                        'h-3.5 rounded bg-muted/65',
                        columnIndex % 3 === 0 ? 'w-2/3' : 'w-4/5'
                      )}
                    />
                  </TableCell>
                ))}
              </TableRow>
            ))
          ) : rows.length === 0 ? (
            <TableRow>
              <TableCell colSpan={columns.length} className="py-16 text-center">
                <div className="mx-auto flex max-w-sm flex-col items-center gap-2.5 text-muted-foreground">
                  <div className="rounded-full bg-muted/50 p-3 text-muted-foreground">
                    <Search className="size-6" aria-hidden="true" />
                  </div>
                  <p className="text-xs font-medium text-foreground font-sans">{emptyLabel}</p>
                  <p className="text-[11px] leading-relaxed max-w-[30ch]">
                    Ajustez la recherche ou les filtres pour élargir le résultat.
                  </p>
                </div>
              </TableCell>
            </TableRow>
          ) : (
            rows.map((row, index) => (
              <TableRow
                key={index}
                tabIndex={onRowClick ? 0 : undefined}
                aria-label={onRowClick ? rowActionLabel : undefined}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                onKeyDown={
                  onRowClick
                    ? (event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        onRowClick(row);
                      }
                    }
                    : undefined
                }
                className={cn(
                  'border-border/55 transition-colors hover:bg-muted/35',
                  onRowClick
                    && APP_SHELL_CLASSES.dataRowInteractive,
                  isFetching && 'opacity-70'
                )}
              >
                {columns.map((column) => (
                  <TableCell
                    key={column.id}
                    className={cn(
                      'px-2 py-1.5 text-[12.5px] font-medium text-foreground',
                      column.className
                    )}
                  >
                    {column.render(row)}
                  </TableCell>
                ))}
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
    <PaginationBar
      page={page}
      pageSize={pageSize}
      total={total}
      onPageChange={onPageChange}
      onPageSizeChange={onPageSizeChange}
    />
  </div>
);
