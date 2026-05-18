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
import { Archive, MoreHorizontal, Pencil, RotateCcw, SearchX, Trash2 } from 'lucide-react';
import { motion, useReducedMotion } from 'motion/react';
import type {
  DirectoryDensity,
  DirectoryListRow,
  DirectorySortBy,
  DirectorySortingRule
} from 'shared/schemas/directory.schema';

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { formatRelativeTime } from '@/utils/date/formatRelativeTime';
import DataTableColumnHeader from '@/components/client-directory/data-table/DataTableColumnHeader';
import DirectoryTablePagination from '@/components/client-directory/data-table/DirectoryTablePagination';

import { SUPPLIER_COLUMN_LABELS, SUPPLIER_COLUMN_ORDER } from './supplierGridConfig';

interface AdminSuppliersTableProps {
  rows: DirectoryListRow[];
  sorting: DirectorySortingRule[];
  page: number;
  pageSize: number;
  total?: number;
  isFetching: boolean;
  isInitialLoading: boolean;
  columnVisibility: VisibilityState;
  density: DirectoryDensity;
  onSortChange: (sorting: DirectorySortingRule[]) => void;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  onEditSupplier: (row: DirectoryListRow) => void;
  onArchiveSupplier: (row: DirectoryListRow) => void;
  onDeleteSupplier: (row: DirectoryListRow) => void;
  canHardDelete: boolean;
}

const columnHelper = createColumnHelper<DirectoryListRow>();

const toSupplierSortBy = (value: string): DirectorySortBy =>
  SUPPLIER_COLUMN_ORDER.find((candidate) => candidate === value) ?? 'name';

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

const renderSupplierBadge = (row: DirectoryListRow) => {
  if (row.archived_at) {
    return (
      <span className="inline-flex items-center rounded-full border border-warning/20 bg-warning/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-warning">
        Archive
      </span>
    );
  }

  return (
    <span className="inline-flex items-center rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-600">
      Fournisseur
    </span>
  );
};

const getSupplierIdentifier = (row: DirectoryListRow): string =>
  row.supplier_code || row.supplier_number || row.siret || row.siren || '';

const getPrimaryContact = (row: DirectoryListRow): string =>
  row.primary_phone || row.primary_email || 'Non renseigné';

const AdminSuppliersTable = ({
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
  onEditSupplier,
  onArchiveSupplier,
  onDeleteSupplier,
  canHardDelete
}: AdminSuppliersTableProps) => {
  const tableSorting = useMemo<SortingState>(
    () => sorting.map((rule) => ({ id: rule.id, desc: rule.desc })),
    [sorting]
  );

  const columns = useMemo(() => [
    columnHelper.accessor((row) => row.entity_type, {
      id: 'entity_type',
      header: ({ column }) => renderHeader(column, SUPPLIER_COLUMN_LABELS.entity_type, sorting),
      cell: ({ row }) => renderSupplierBadge(row.original)
    }),
    columnHelper.accessor((row) => row.supplier_code ?? '', {
      id: 'supplier_code',
      header: ({ column }) => renderHeader(column, SUPPLIER_COLUMN_LABELS.supplier_code, sorting),
      cell: ({ row }) => row.original.supplier_code ?? ''
    }),
    columnHelper.accessor((row) => row.supplier_number ?? '', {
      id: 'supplier_number',
      header: ({ column }) => renderHeader(column, SUPPLIER_COLUMN_LABELS.supplier_number, sorting),
      cell: ({ row }) => row.original.supplier_number ?? ''
    }),
    columnHelper.accessor((row) => row.name, {
      id: 'name',
      header: ({ column }) => renderHeader(column, SUPPLIER_COLUMN_LABELS.name, sorting),
      enableHiding: false,
      cell: ({ row }) => (
        <div className="min-w-0">
          <button
            type="button"
            aria-label={`Modifier ${row.original.name}`}
            className="inline-flex min-w-0 max-w-full items-center rounded-md font-semibold text-foreground transition-colors duration-150 hover:text-primary/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            onClick={() => onEditSupplier(row.original)}
          >
            <span className="truncate">{row.original.name}</span>
          </button>
          <p className="truncate text-[11px] text-muted-foreground">{getSupplierIdentifier(row.original) || 'Sans identifiant'}</p>
        </div>
      )
    }),
    columnHelper.accessor((row) => row.siret ?? '', {
      id: 'siret',
      header: ({ column }) => renderHeader(column, SUPPLIER_COLUMN_LABELS.siret, sorting),
      cell: ({ row }) => row.original.siret ?? ''
    }),
    columnHelper.accessor((row) => row.naf_code ?? '', {
      id: 'naf_code',
      header: ({ column }) => renderHeader(column, SUPPLIER_COLUMN_LABELS.naf_code, sorting),
      cell: ({ row }) => row.original.naf_code ?? ''
    }),
    columnHelper.accessor((row) => row.primary_phone ?? row.primary_email ?? '', {
      id: 'primary_contact',
      header: ({ column }) => renderHeader(column, SUPPLIER_COLUMN_LABELS.primary_contact, sorting),
      cell: ({ row }) => getPrimaryContact(row.original)
    }),
    columnHelper.accessor((row) => row.city ?? '', {
      id: 'city',
      header: ({ column }) => renderHeader(column, SUPPLIER_COLUMN_LABELS.city, sorting),
      cell: ({ row }) => row.original.city ?? ''
    }),
    columnHelper.accessor((row) => row.department ?? '', {
      id: 'department',
      header: ({ column }) => renderHeader(column, SUPPLIER_COLUMN_LABELS.department, sorting),
      cell: ({ row }) => row.original.department ?? ''
    }),
    columnHelper.accessor((row) => row.updated_at, {
      id: 'updated_at',
      header: ({ column }) => renderHeader(column, SUPPLIER_COLUMN_LABELS.updated_at, sorting),
      cell: ({ row }) => formatRelativeTime(row.original.updated_at)
    }),
    columnHelper.display({
      id: 'actions',
      enableHiding: false,
      header: () => <span className="sr-only">Actions</span>,
      cell: ({ row }) => {
        const supplier = row.original;
        const isArchived = Boolean(supplier.archived_at);

        return (
          <div className="flex justify-end">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-8 opacity-80 transition-opacity duration-150 group-hover/row:opacity-100"
                  aria-label={`Actions fournisseur ${supplier.name}`}
                >
                  <MoreHorizontal className="size-4" aria-hidden="true" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuItem onClick={() => onEditSupplier(supplier)}>
                  <Pencil className="mr-2 size-4" aria-hidden="true" />
                  Modifier
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onArchiveSupplier(supplier)}>
                  {isArchived ? (
                    <RotateCcw className="mr-2 size-4" aria-hidden="true" />
                  ) : (
                    <Archive className="mr-2 size-4" aria-hidden="true" />
                  )}
                  {isArchived ? 'Restaurer' : 'Archiver'}
                </DropdownMenuItem>
                {canHardDelete ? (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="text-destructive focus:text-destructive"
                      onClick={() => onDeleteSupplier(supplier)}
                    >
                      <Trash2 className="mr-2 size-4" aria-hidden="true" />
                      Supprimer définitivement
                    </DropdownMenuItem>
                  </>
                ) : null}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        );
      }
    })
  ], [canHardDelete, onArchiveSupplier, onDeleteSupplier, onEditSupplier, sorting]);

  const handleSortingChange: OnChangeFn<SortingState> = (updater) => {
    const nextSorting = typeof updater === 'function' ? updater(tableSorting) : updater;
    const nextSupplierSorting = nextSorting
      .map((item) => ({
        id: toSupplierSortBy(item.id),
        desc: item.desc
      }))
      .slice(0, 3);

    onSortChange(nextSupplierSorting.length > 0 ? nextSupplierSorting : [{ id: 'name', desc: false }]);
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

  const reducedMotion = useReducedMotion();
  const rowPaddingClassName = density === 'compact' ? 'px-3 py-1.5 text-[13px]' : 'px-3 py-2.5 text-sm';
  const visibleColumnCount = table.getVisibleLeafColumns().length;
  const TableWrapper = reducedMotion ? 'div' : motion.div;
  const wrapperProps = reducedMotion
    ? {}
    : { initial: { opacity: 0 }, animate: { opacity: 1 }, transition: { duration: 0.15 } };

  return (
    <>
      <TableWrapper {...wrapperProps} className="min-h-0 flex-1 overflow-auto rounded-b-xl bg-transparent">
        <Table className="min-w-[820px]">
          <TableHeader className="bg-card/98 backdrop-blur-sm [&_tr]:border-b-border/40">
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id} className="hover:bg-transparent">
                {headerGroup.headers.map((header) => (
                  <TableHead
                    key={header.id}
                    className="sticky top-0 z-10 h-9 whitespace-nowrap border-b border-border/50 bg-card/98 px-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground/70 backdrop-blur-sm"
                  >
                    {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody className="[&_tr]:border-b-border/40">
            {isInitialLoading ? (
              Array.from({ length: pageSize }).map((_, index) => (
                <TableRow key={`supplier-skeleton-${index}`} className="animate-pulse">
                  {table.getVisibleLeafColumns().map((column, cellIndex) => (
                    <TableCell key={`${column.id}-${index}`} className={rowPaddingClassName}>
                      <div
                        className={cn(
                          'h-4 rounded bg-muted/60',
                          cellIndex === 3 ? 'w-3/4' : cellIndex % 2 === 0 ? 'w-1/2' : 'w-2/3'
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
                    <p className="text-sm font-medium text-foreground">Aucun fournisseur trouvé</p>
                    <p className="text-xs">Essayez d&apos;élargir vos critères de recherche ou de modifier les filtres appliqués.</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  className="group/row border-b transition-colors duration-75 hover:bg-primary/[0.03] focus-within:bg-primary/[0.04]"
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell
                      key={cell.id}
                      className={cn(
                        rowPaddingClassName,
                        isFetching && 'opacity-80',
                        ['supplier_code', 'supplier_number', 'siret', 'naf_code', 'department', 'updated_at'].includes(cell.column.id)
                          && 'font-mono tracking-tight tabular-nums text-muted-foreground/90'
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
      </TableWrapper>

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

export default AdminSuppliersTable;
