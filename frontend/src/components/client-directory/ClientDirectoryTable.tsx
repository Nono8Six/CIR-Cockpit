import { useMemo } from 'react';
import {
  createColumnHelper,
  type Column,
  type OnChangeFn,
  type SortingState,
  type VisibilityState,
  flexRender,
  getCoreRowModel,
  useReactTable
} from '@tanstack/react-table';
import { SearchX } from 'lucide-react';
import type {
  DirectoryDensity,
  DirectoryListRow,
  DirectorySortBy,
  DirectorySortingRule
} from 'shared/schemas/directory.schema';

import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { formatClientNumber } from '@/utils/clients/formatClientNumber';
import { formatDate } from '@/utils/date/formatDate';
import { getDirectoryTypeLabel } from './clientDirectorySearch';
import DataTableColumnHeader from './data-table/DataTableColumnHeader';
import DirectoryTablePagination from './data-table/DirectoryTablePagination';
import { DIRECTORY_COLUMN_LABELS, DIRECTORY_COLUMN_ORDER } from './directoryGridConfig';

type ClientDirectoryTableProps = {
  rows: DirectoryListRow[];
  sorting: DirectorySortingRule[];
  page: number;
  pageSize: number;
  total: number;
  isFetching: boolean;
  isInitialLoading: boolean;
  columnVisibility: VisibilityState;
  density: DirectoryDensity;
  onSortChange: (sorting: DirectorySortingRule[]) => void;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  onOpenRecord: (row: DirectoryListRow) => void;
};

const toDirectorySortBy = (value: string): DirectorySortBy =>
  DIRECTORY_COLUMN_ORDER.find((candidate) => candidate === value) ?? 'name';

const columnHelper = createColumnHelper<DirectoryListRow>();

const renderHeader = (
  column: Column<DirectoryListRow, unknown>,
  title: string,
  sorting: DirectorySortingRule[]
) => (
  <DataTableColumnHeader
    column={column}
    title={title}
    sortingIndex={sorting.findIndex((rule) => rule.id === column.id)}
  />
);

const ClientDirectoryTable = ({
  rows,
  sorting,
  page,
  pageSize,
  total,
  isFetching,
  isInitialLoading,
  columnVisibility,
  density,
  onSortChange,
  onPageChange,
  onPageSizeChange,
  onOpenRecord
}: ClientDirectoryTableProps) => {
  const tableSorting = useMemo<SortingState>(
    () => sorting.map((rule) => ({ id: rule.id, desc: rule.desc })),
    [sorting]
  );

  const columns = useMemo(() => [
    columnHelper.accessor((row) => row.entity_type, {
      id: 'entity_type',
      header: ({ column }) => renderHeader(column, DIRECTORY_COLUMN_LABELS.entity_type, sorting),
      cell: ({ row }) => (
        <Badge variant="secondary" className="text-[11px]">
          {getDirectoryTypeLabel(row.original.entity_type)}
        </Badge>
      )
    }),
    columnHelper.accessor((row) => row.client_number ?? '', {
      id: 'client_number',
      header: ({ column }) => renderHeader(column, DIRECTORY_COLUMN_LABELS.client_number, sorting),
      cell: ({ row }) => row.original.client_number ? formatClientNumber(row.original.client_number) : '—'
    }),
    columnHelper.accessor((row) => row.name, {
      id: 'name',
      header: ({ column }) => renderHeader(column, DIRECTORY_COLUMN_LABELS.name, sorting),
      enableHiding: false,
      cell: ({ row }) => (
        <button
          type="button"
          aria-label={`Ouvrir la fiche ${row.original.name}`}
          className="inline-flex min-w-0 max-w-full items-center rounded-md font-semibold text-foreground transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          onClick={() => onOpenRecord(row.original)}
        >
          <span className="truncate">{row.original.name}</span>
        </button>
      )
    }),
    columnHelper.accessor((row) => row.city ?? '', {
      id: 'city',
      header: ({ column }) => renderHeader(column, DIRECTORY_COLUMN_LABELS.city, sorting),
      cell: ({ row }) => row.original.city ?? '—'
    }),
    columnHelper.accessor((row) => row.department ?? '', {
      id: 'department',
      header: ({ column }) => renderHeader(column, DIRECTORY_COLUMN_LABELS.department, sorting),
      cell: ({ row }) => row.original.department ?? '—'
    }),
    columnHelper.accessor((row) => row.agency_name ?? '', {
      id: 'agency_name',
      header: ({ column }) => renderHeader(column, DIRECTORY_COLUMN_LABELS.agency_name, sorting),
      cell: ({ row }) => row.original.agency_name ?? 'Non rattaché'
    }),
    columnHelper.accessor((row) => row.cir_commercial_name ?? '', {
      id: 'cir_commercial_name',
      header: ({ column }) => renderHeader(column, DIRECTORY_COLUMN_LABELS.cir_commercial_name, sorting),
      cell: ({ row }) => row.original.cir_commercial_name ?? 'Non affecté'
    }),
    columnHelper.accessor((row) => row.updated_at, {
      id: 'updated_at',
      header: ({ column }) => renderHeader(column, DIRECTORY_COLUMN_LABELS.updated_at, sorting),
      cell: ({ row }) => formatDate(row.original.updated_at)
    })
  ], [onOpenRecord, sorting]);

  const handleSortingChange: OnChangeFn<SortingState> = (updater) => {
    const nextSorting = typeof updater === 'function' ? updater(tableSorting) : updater;
    const nextDirectorySorting = nextSorting
      .map((item) => ({
        id: toDirectorySortBy(item.id),
        desc: item.desc
      }))
      .slice(0, 3);

    onSortChange(nextDirectorySorting.length > 0 ? nextDirectorySorting : [{ id: 'name', desc: false }]);
  };

  // eslint-disable-next-line react-hooks/incompatible-library -- TanStack Table is the project standard for controlled server-side grids.
  const table = useReactTable({
    data: rows,
    columns,
    state: {
      sorting: tableSorting,
      columnVisibility
    },
    manualSorting: true,
    manualPagination: true,
    enableMultiSort: true,
    maxMultiSortColCount: 3,
    onSortingChange: handleSortingChange,
    getCoreRowModel: getCoreRowModel()
  });

  const rowPaddingClassName = density === 'compact' ? 'px-3 py-2 text-xs' : 'px-3 py-3 text-sm';
  const visibleColumnCount = table.getVisibleLeafColumns().length;

  return (
    <>
      <div className="min-h-0 flex-1 overflow-auto rounded-b-xl">
        <Table className="min-w-[420px] sm:min-w-[720px]">
          <TableHeader className="bg-card/98 backdrop-blur-sm">
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead
                    key={header.id}
                    className="sticky top-0 z-10 h-10 whitespace-nowrap border-b border-border/50 bg-card/98 px-2 text-xs backdrop-blur-sm"
                  >
                    {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {isInitialLoading ? (
              Array.from({ length: pageSize }).map((_, index) => (
                <TableRow key={`skeleton-${index}`} className="animate-pulse">
                  {table.getVisibleLeafColumns().map((column, cellIndex) => (
                    <TableCell key={`${column.id}-${index}`} className={rowPaddingClassName}>
                      <div
                        className={cn(
                          'h-4 rounded bg-muted/60',
                          cellIndex === 2 ? 'w-3/4' : cellIndex % 2 === 0 ? 'w-1/2' : 'w-2/3'
                        )}
                      />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={Math.max(visibleColumnCount, 1)} className="py-12">
                  <div className="flex flex-col items-center gap-2 text-center text-muted-foreground">
                    <SearchX className="size-10 text-muted-foreground/35" />
                    <p className="text-sm font-medium text-foreground">Aucun résultat</p>
                    <p className="text-xs">Modifiez vos filtres ou créez un client ou un prospect.</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              table.getRowModel().rows.map((row, index) => (
                <TableRow
                  key={row.id}
                  className={cn(
                    'group/row transition-colors hover:bg-accent/35 focus-within:bg-accent/40',
                    index % 2 === 1 && 'bg-muted/20'
                  )}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell
                      key={cell.id}
                      className={cn(
                        rowPaddingClassName,
                        isFetching && 'opacity-80',
                        (cell.column.id === 'client_number'
                          || cell.column.id === 'department'
                          || cell.column.id === 'updated_at') && 'tabular-nums'
                      )}
                    >
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <div className="border-t border-border/40 px-3 py-2">
        <DirectoryTablePagination
          page={page}
          pageSize={pageSize}
          total={total}
          onPageChange={onPageChange}
          onPageSizeChange={onPageSizeChange}
        />
      </div>
    </>
  );
};

export default ClientDirectoryTable;
