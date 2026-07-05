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
  rowKey: (row: TRow) => string;
  isLoading: boolean;
  isFetching: boolean;
  page: number;
  pageSize: number;
  total: number;
  sortBy: string;
  sortDirection: PricingReferenceSortDirection;
  emptyLabel: string;
  toolbar?: ReactNode;
  onSort: (sortBy: string) => void;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  onRowClick?: (row: TRow) => void;
  rowActionLabel?: string;
}

/**
 * Single-surface reference table: optional toolbar, column headers, rows and
 * pagination live inside one bordered container separated by hairlines.
 */
export const ReferenceTable = <TRow,>({
  rows,
  columns,
  rowKey,
  isLoading,
  isFetching,
  page,
  pageSize,
  total,
  sortBy,
  sortDirection,
  emptyLabel,
  toolbar,
  onSort,
  onPageChange,
  onPageSizeChange,
  onRowClick,
  rowActionLabel
}: ReferenceTableProps<TRow>) => (
  <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-stone-200/60 bg-white">
    {toolbar ? (
      <div className="flex min-h-11 shrink-0 flex-wrap items-center gap-2 border-b border-stone-200/60 px-4 py-1.5">
        {toolbar}
      </div>
    ) : null}
    <div className="min-h-0 flex-1 overflow-auto">
      <Table scrollArea={false} className="min-w-[860px] border-collapse">
        <TableHeader className="sticky top-0 z-10 bg-white">
          <TableRow className="hover:bg-transparent">
            {columns.map((column) => (
              <TableHead
                key={column.id}
                className="h-9 border-b border-stone-200/60 bg-white px-2 font-medium normal-case text-stone-500 first:pl-4 last:pr-4"
              >
                {column.sortBy ? (
                  <SortButton
                    label={column.label}
                    active={sortBy === column.sortBy}
                    direction={sortDirection}
                    onClick={() => onSort(column.sortBy ?? column.id)}
                  />
                ) : (
                  <span className="block text-[11px] font-medium text-stone-500">
                    {column.label}
                  </span>
                )}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody className="divide-y divide-stone-100">
          {isLoading ? (
            Array.from({ length: Math.min(pageSize, 12) }).map((_, index) => (
              <TableRow key={`skeleton-${index}`} className="animate-pulse">
                {columns.map((column, columnIndex) => (
                  <TableCell key={`${column.id}-${index}`} className="h-9 px-2 py-2 first:pl-4 last:pr-4">
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
            rows.map((row) => (
              <TableRow
                key={rowKey(row)}
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
                  'border-stone-100 transition-colors hover:bg-stone-50',
                  onRowClick
                    && APP_SHELL_CLASSES.dataRowInteractive,
                  isFetching && 'opacity-70'
                )}
              >
                {columns.map((column) => (
                  <TableCell
                    key={column.id}
                    className={cn(
                      'h-9 px-2 py-2 text-[12.5px] text-foreground first:pl-4 last:pr-4',
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
