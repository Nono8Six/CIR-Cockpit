import { useEffect, useMemo, useRef, useState } from 'react';
import {
  type ColumnDef,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  type SortingState,
  useReactTable
} from '@tanstack/react-table';
import { useVirtualizer } from '@tanstack/react-virtual';
import { Archive, ArrowUpDown } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import { Entity } from '@/types';

interface ProspectListProps {
  prospects: Entity[];
  selectedProspectId: string | null;
  onSelect: (prospectId: string) => void;
}

const ROW_ESTIMATED_SIZE = 64;
const ROW_OVERSCAN = 8;

const ProspectList = ({ prospects, selectedProspectId, onSelect }: ProspectListProps) => {
  const [sorting, setSorting] = useState<SortingState>([]);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  const columns = useMemo<ColumnDef<Entity>[]>(
    () => [
      {
        accessorFn: (prospect) => prospect.entity_type || 'Prospect',
        id: 'entity_type',
        header: 'Type',
        cell: ({ row }) => (
          <span className="text-xs uppercase tracking-wider text-slate-500">
            {row.original.entity_type || 'Prospect'}
          </span>
        )
      },
      {
        accessorKey: 'name',
        header: ({ column }) => (
          <Button
            type="button"
            variant="ghost"
            className="-ml-3 h-8 px-3 text-xs text-slate-600"
            onClick={column.getToggleSortingHandler()}
          >
            Prospect
            <ArrowUpDown size={14} className="ml-1 text-slate-400" />
          </Button>
        ),
        cell: ({ row }) => (
          <span className="block truncate font-semibold text-slate-900">
            {row.original.name}
          </span>
        )
      },
      {
        accessorFn: (prospect) => prospect.city ?? '',
        id: 'city',
        header: ({ column }) => (
          <Button
            type="button"
            variant="ghost"
            className="-ml-3 h-8 px-3 text-xs text-slate-600"
            onClick={column.getToggleSortingHandler()}
          >
            Ville
            <ArrowUpDown size={14} className="ml-1 text-slate-400" />
          </Button>
        ),
        cell: ({ row }) => (
          <span className="block truncate text-xs text-slate-600">
            {row.original.city || 'Sans ville'}
          </span>
        )
      },
      {
        accessorFn: (prospect) => prospect.siret ?? '',
        id: 'siret',
        header: 'Siret',
        cell: ({ row }) => (
          <span className="hidden text-xs text-slate-600 md:inline">
            {row.original.siret || '-'}
          </span>
        )
      },
      {
        id: 'archived',
        header: 'Etat',
        enableSorting: false,
        cell: ({ row }) =>
          row.original.archived_at ? (
            <span className="inline-flex items-center gap-1 text-xs uppercase text-amber-600">
              <Archive size={12} /> Archive
            </span>
          ) : (
            <span className="text-xs text-emerald-700">Actif</span>
          )
      }
    ],
    []
  );

  // eslint-disable-next-line react-hooks/incompatible-library -- TanStack Table is required for P05 data grid and intentionally opts out of React Compiler memoization.
  const table = useReactTable({
    data: prospects,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel()
  });

  const rows = table.getRowModel().rows;
  const selectedIndex = useMemo(
    () => rows.findIndex((row) => row.original.id === selectedProspectId),
    [rows, selectedProspectId]
  );

  const rowVirtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => ROW_ESTIMATED_SIZE,
    overscan: ROW_OVERSCAN
  });

  useEffect(() => {
    if (selectedIndex >= 0) {
      rowVirtualizer.scrollToIndex(selectedIndex, { align: 'center' });
    }
  }, [rowVirtualizer, selectedIndex]);

  if (prospects.length === 0) {
    return (
      <div className="text-sm text-slate-400 border border-dashed border-slate-200 rounded-lg p-4">
        Aucun prospect trouve.
      </div>
    );
  }

  const virtualRows = rowVirtualizer.getVirtualItems();
  const usesVirtualRows = virtualRows.length > 0;
  const topSpacer = usesVirtualRows ? virtualRows[0].start : 0;
  const bottomSpacer = usesVirtualRows
    ? rowVirtualizer.getTotalSize() - virtualRows[virtualRows.length - 1].end
    : 0;

  const visibleRows = usesVirtualRows
    ? virtualRows.map((virtualRow) => ({
      key: virtualRow.key,
      size: virtualRow.size,
      row: rows[virtualRow.index]
    }))
    : rows.map((row) => ({
      key: `fallback-${row.id}`,
      size: ROW_ESTIMATED_SIZE,
      row
    }));

  return (
    <div className="rounded-md border border-slate-200">
      <Table className="table-fixed">
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <TableHead key={header.id} className="h-9 text-xs">
                  {header.isPlaceholder
                    ? null
                    : flexRender(header.column.columnDef.header, header.getContext())}
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>
      </Table>
      <div
        ref={scrollRef}
        className="max-h-[50vh] min-h-[260px] overflow-y-auto"
        data-testid="prospects-list"
      >
        <Table className="table-fixed">
          <TableBody>
            {topSpacer > 0 && (
              <TableRow aria-hidden="true">
                <TableCell colSpan={columns.length} style={{ height: `${topSpacer}px` }} />
              </TableRow>
            )}
            {visibleRows.map(({ key, size, row }) => {
              const isSelected = row.original.id === selectedProspectId;

              return (
                <TableRow
                  key={key}
                  data-state={isSelected ? 'selected' : undefined}
                  data-testid={`prospects-list-row-${row.original.id}`}
                  className={`cursor-pointer ${
                    isSelected ? 'border-cir-red/40 bg-cir-red/5' : 'hover:bg-slate-50'
                  }`}
                  onClick={() => onSelect(row.original.id)}
                  style={{ height: `${size}px` }}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id} className="px-2 py-2 align-middle text-sm">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              );
            })}
            {bottomSpacer > 0 && (
              <TableRow aria-hidden="true">
                <TableCell colSpan={columns.length} style={{ height: `${bottomSpacer}px` }} />
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default ProspectList;
