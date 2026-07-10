import type { CSSProperties, ReactNode } from 'react';
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type Column,
  type ColumnDef,
  type ColumnPinningState,
  type ColumnSizingState,
  type OnChangeFn,
  type Updater,
  type VisibilityState
} from '@tanstack/react-table';
import { ArrowDown, ArrowUp, ArrowUpDown, CheckCircle2, Search } from 'lucide-react';

import type {
  PricingReferenceSegmentsSortBy,
  PricingReferenceSortDirection
} from '../../../../../../shared/schemas/pricing/references.schema';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/data-display/Table';
import { APP_SHELL_CLASSES } from '@/components/app-shell/appShellTokens';
import { cn } from '@/lib/utils';
import { PaginationBar } from '../table/pagination-bar';
import { formatCount, linkStatusLabels } from '../../utils/pricing-references-formatters';
import {
  SEGMENT_COLUMN_CONFIGS,
  getSegmentColumnConfig,
  normalizeSegmentColumnOrder,
  type SegmentColumnId,
  type SegmentGridDensity,
  type SegmentRow
} from './segment-grid-config';

interface SegmentsDataGridProps {
  rows: SegmentRow[];
  isLoading: boolean;
  isFetching: boolean;
  page: number;
  pageSize: number;
  total: number;
  sortBy: PricingReferenceSegmentsSortBy;
  sortDirection: PricingReferenceSortDirection;
  density: SegmentGridDensity;
  columnVisibility: VisibilityState;
  columnOrder: string[];
  columnSizing: ColumnSizingState;
  columnPinning: ColumnPinningState;
  toolbar?: ReactNode;
  onSort: (sortBy: PricingReferenceSegmentsSortBy) => void;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  onRowClick: (row: SegmentRow) => void;
  onColumnVisibilityChange: (visibility: VisibilityState) => void;
  onColumnOrderChange: (order: string[]) => void;
  onColumnSizingChange: (sizing: ColumnSizingState) => void;
  onColumnPinningChange: (pinning: ColumnPinningState) => void;
}

const sortableColumnIds = new Set<string>([
  'marque',
  'cat_fab',
  'segment',
  'idnumerique',
  'link_status',
  'purchase_grid_rows_count',
  'source_row_number'
]);

const updateState = <TState,>(current: TState, updater: Updater<TState>): TState =>
  typeof updater === 'function' ? (updater as (old: TState) => TState)(current) : updater;

const missingValue = <span className="text-muted-foreground/45">-</span>;

const segmentColumns: Array<ColumnDef<SegmentRow>> = SEGMENT_COLUMN_CONFIGS.map((config) => ({
  id: config.id,
  accessorFn: (row) => row[config.id as keyof SegmentRow],
  header: config.label,
  minSize: config.minSize,
  size: config.size,
  maxSize: config.maxSize,
  enableHiding: !config.required,
  enableResizing: true,
  cell: ({ row }) => {
    const value = row.original[config.id as keyof SegmentRow];
    if (config.id === 'link_status') {
      if (!row.original.link_status) {
        return (
          <span className="text-muted-foreground/45" aria-label="Liaison inconnue">-</span>
        );
      }
      if (row.original.link_status === 'complete_valid') {
        return (
          <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-[11px] font-medium text-success">
            <CheckCircle2 className="size-3" aria-hidden="true" />
            Lié
          </span>
        );
      }
      return (
        <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-[11px] font-medium text-amber-800">
          <span className="size-1.5 rounded-full bg-amber-500" aria-hidden="true" />
          {linkStatusLabels[row.original.link_status]}
        </span>
      );
    }
    if (config.id === 'purchase_grid_rows_count') {
      return formatCount(row.original.purchase_grid_rows_count);
    }
    if (value === null || value === undefined || value === '') {
      return missingValue;
    }
    return String(value);
  }
}));

const getPinnedStyle = (column: Column<SegmentRow>): CSSProperties => {
  const pinnedSide = column.getIsPinned();
  const isLastLeft = pinnedSide === 'left' && column.getIsLastColumn('left');
  const isFirstRight = pinnedSide === 'right' && column.getIsFirstColumn('right');

  return {
    width: column.getSize(),
    left: pinnedSide === 'left' ? `${column.getStart('left')}px` : undefined,
    right: pinnedSide === 'right' ? `${column.getAfter('right')}px` : undefined,
    position: pinnedSide ? 'sticky' : 'relative',
    zIndex: pinnedSide ? 20 : 1,
    boxShadow: isLastLeft
      ? '1px 0 0 hsl(var(--border))'
      : isFirstRight
        ? '-1px 0 0 hsl(var(--border))'
        : undefined
  };
};

const HeaderSortIcon = ({
  active,
  direction
}: {
  active: boolean;
  direction: PricingReferenceSortDirection;
}) => {
  if (!active) return <ArrowUpDown className="size-3 text-muted-foreground/55" aria-hidden="true" />;
  return direction === 'asc'
    ? <ArrowUp className="size-3 text-foreground" aria-hidden="true" />
    : <ArrowDown className="size-3 text-foreground" aria-hidden="true" />;
};

export const SegmentsDataGrid = ({
  rows,
  isLoading,
  isFetching,
  page,
  pageSize,
  total,
  sortBy,
  sortDirection,
  density,
  columnVisibility,
  columnOrder,
  columnSizing,
  columnPinning,
  toolbar,
  onSort,
  onPageChange,
  onPageSizeChange,
  onRowClick,
  onColumnVisibilityChange,
  onColumnOrderChange,
  onColumnSizingChange,
  onColumnPinningChange
}: SegmentsDataGridProps) => {
  const normalizedColumnOrder = normalizeSegmentColumnOrder(columnOrder);

  const handleColumnVisibilityChange: OnChangeFn<VisibilityState> = (updater) => {
    onColumnVisibilityChange(updateState(columnVisibility, updater));
  };
  const handleColumnSizingChange: OnChangeFn<ColumnSizingState> = (updater) => {
    onColumnSizingChange(updateState(columnSizing, updater));
  };
  const handleColumnPinningChange: OnChangeFn<ColumnPinningState> = (updater) => {
    onColumnPinningChange(updateState(columnPinning, updater));
  };

  // eslint-disable-next-line react-hooks/incompatible-library -- TanStack Table is the project standard for controlled server-side grids.
  const table = useReactTable({
    data: rows,
    columns: segmentColumns,
    getCoreRowModel: getCoreRowModel(),
    manualSorting: true,
    manualPagination: true,
    columnResizeMode: 'onChange',
    state: {
      columnVisibility,
      columnOrder: normalizedColumnOrder,
      columnSizing,
      columnPinning
    },
    onColumnVisibilityChange: handleColumnVisibilityChange,
    onColumnOrderChange: (updater) => onColumnOrderChange(updateState(normalizedColumnOrder, updater)),
    onColumnSizingChange: handleColumnSizingChange,
    onColumnPinningChange: handleColumnPinningChange
  });

  const visibleColumnCount = table.getVisibleLeafColumns().length;
  const rowHeightClass = density === 'compact' ? 'h-8' : 'h-10';

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border border-stone-200/70 bg-white">
      {toolbar ? (
        <div className="flex min-h-11 shrink-0 flex-wrap items-center gap-2 border-b border-stone-200/70 bg-stone-50/25 px-3 py-1.5">
          {toolbar}
        </div>
      ) : null}
      <div className="min-h-0 flex-1 overflow-auto">
        <Table
          scrollArea={false}
          className="border-collapse"
          style={{ width: table.getTotalSize(), minWidth: '100%' }}
        >
          <TableHeader className="sticky top-0 z-30 bg-white">
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id} className="hover:bg-transparent">
                {headerGroup.headers.map((header) => {
                  const columnId = header.column.id as SegmentColumnId;
                  const config = getSegmentColumnConfig(columnId);
                  const isSortable = sortableColumnIds.has(columnId);
                  const isActiveSort = sortBy === columnId;

                  return (
                    <TableHead
                      key={header.id}
                      className={cn(
                        'relative h-9 border-b border-stone-200/70 bg-stone-50/55 px-2 font-medium normal-case text-stone-500 first:pl-4 last:pr-4',
                        header.column.getIsPinned() && 'bg-stone-50'
                      )}
                      style={getPinnedStyle(header.column)}
                    >
                      {isSortable ? (
                        <button
                          type="button"
                          className="flex w-full min-w-0 items-center gap-1.5 text-left text-[11px] font-medium text-stone-500 hover:text-stone-950"
                          onClick={() => onSort(columnId as PricingReferenceSegmentsSortBy)}
                        >
                          <span className="truncate">{flexRender(header.column.columnDef.header, header.getContext())}</span>
                          <HeaderSortIcon active={isActiveSort} direction={sortDirection} />
                        </button>
                      ) : (
                        <span className="block truncate text-[11px] font-medium text-stone-500">
                          {flexRender(header.column.columnDef.header, header.getContext())}
                        </span>
                      )}
                      <button
                        type="button"
                        aria-label={`Redimensionner ${config?.label ?? columnId}`}
                        className={cn(
                          'absolute right-0 top-1/2 h-5 w-1 -translate-y-1/2 cursor-col-resize touch-none rounded-full',
                          header.column.getIsResizing() ? 'bg-primary' : 'bg-transparent hover:bg-border'
                        )}
                        tabIndex={-1}
                        onClick={(event) => event.stopPropagation()}
                        onDoubleClick={() => header.column.resetSize()}
                        onMouseDown={header.getResizeHandler()}
                        onTouchStart={header.getResizeHandler()}
                      />
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody className="divide-y divide-stone-100">
            {isLoading ? (
              Array.from({ length: Math.min(pageSize, 12) }).map((_, rowIndex) => (
                <TableRow key={`segments-skeleton-${rowIndex}`} className="animate-pulse">
                  {table.getVisibleLeafColumns().map((column, columnIndex) => (
                    <TableCell
                      key={`${column.id}-${rowIndex}`}
                      className={cn(rowHeightClass, 'bg-white px-2 py-2 first:pl-4 last:pr-4')}
                      style={getPinnedStyle(column)}
                    >
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
                <TableCell colSpan={Math.max(visibleColumnCount, 1)} className="py-16 text-center">
                  <div className="mx-auto flex max-w-sm flex-col items-center gap-2.5 text-muted-foreground">
                    <div className="rounded-full bg-muted/50 p-3 text-muted-foreground">
                      <Search className="size-6" aria-hidden="true" />
                    </div>
                    <p className="font-sans text-xs font-medium text-foreground">Aucun segment trouvé</p>
                    <p className="max-w-[30ch] text-[11px] leading-relaxed">
                      Ajustez la recherche ou les filtres pour élargir le résultat.
                    </p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.original.id}
                  tabIndex={0}
                  aria-label="Voir le détail du segment"
                  onClick={() => onRowClick(row.original)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      onRowClick(row.original);
                    }
                  }}
                  className={cn(
                    'group border-stone-100 hover:bg-primary/[0.025] focus-visible:bg-primary/[0.035]',
                    APP_SHELL_CLASSES.dataRowInteractive,
                    isFetching && 'opacity-70'
                  )}
                >
                  {row.getVisibleCells().map((cell) => {
                    const config = getSegmentColumnConfig(cell.column.id);
                    return (
                      <TableCell
                        key={cell.id}
                        title={typeof cell.getValue() === 'string' ? String(cell.getValue()) : undefined}
                        className={cn(
                          rowHeightClass,
                          'max-w-0 truncate bg-white px-2 py-1.5 text-[12.5px] text-foreground group-hover:bg-primary/[0.025] first:pl-4 last:pr-4',
                          cell.column.id === 'marque' && 'font-semibold',
                          config?.mono && 'font-mono tabular-nums',
                          config?.numeric && 'text-right'
                        )}
                        style={getPinnedStyle(cell.column)}
                      >
                        <span className="block truncate">
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </span>
                      </TableCell>
                    );
                  })}
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
};
