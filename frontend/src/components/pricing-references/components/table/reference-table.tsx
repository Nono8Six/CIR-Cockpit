import type { ReactNode } from 'react';
import { Search } from 'lucide-react';

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/data-display/Table';
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
  onPageSizeChange
}: ReferenceTableProps<TRow>) => (
  <div className="flex min-h-0 flex-1 flex-col overflow-hidden border border-slate-200/80 bg-background rounded-xl shadow-sm">
    <div className="min-h-0 flex-1 overflow-auto">
      <Table className="min-w-[860px] border-collapse">
        <TableHeader className="bg-slate-50/75 backdrop-blur-sm sticky top-0 z-10 border-b border-slate-200">
          <TableRow className="hover:bg-transparent">
            {columns.map((column) => (
              <TableHead
                key={column.id}
                className={cn(
                  'h-9 bg-slate-50/75 px-3 border-b border-slate-200 py-1.5',
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
                  <span className="block px-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/90">
                    {column.label}
                  </span>
                )}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody className="divide-y divide-slate-100">
          {isLoading ? (
            Array.from({ length: Math.min(pageSize, 12) }).map((_, index) => (
              <TableRow key={`skeleton-${index}`} className="animate-pulse">
                {columns.map((column, columnIndex) => (
                  <TableCell key={`${column.id}-${index}`} className="px-3 py-3">
                    <div
                      className={cn(
                        'h-3.5 rounded bg-slate-100',
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
                  <div className="p-3 rounded-full bg-slate-50 text-slate-400">
                    <Search className="size-6" aria-hidden="true" />
                  </div>
                  <p className="text-xs font-bold text-foreground font-sans">{emptyLabel}</p>
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
                className={cn(
                  'hover:bg-slate-50/50 transition-colors border-slate-100',
                  isFetching && 'opacity-70'
                )}
              >
                {columns.map((column) => (
                  <TableCell
                    key={column.id}
                    className={cn(
                      'px-3 py-2.5 text-xs text-foreground font-medium',
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
