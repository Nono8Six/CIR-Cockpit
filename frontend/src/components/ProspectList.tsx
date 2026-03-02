import { useEffect, useMemo, useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';
import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  type SortingState,
  useReactTable
} from '@tanstack/react-table';
import { useVirtualizer } from '@tanstack/react-virtual';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import { Agency, Entity } from '@/types';
import { createProspectColumns } from '@/components/ProspectList/columns';

interface ProspectListProps {
  prospects: Entity[];
  selectedProspectId: string | null;
  onSelect: (prospectId: string) => void;
  agencies?: Agency[];
  isOrphansFilterActive?: boolean;
  onReassignEntity?: (entityId: string, targetAgencyId: string) => Promise<void>;
  isReassignPending?: boolean;
}

const ROW_ESTIMATED_SIZE = 64;
const ROW_OVERSCAN = 8;

const ProspectList = ({
  prospects,
  selectedProspectId,
  onSelect,
  agencies = [],
  isOrphansFilterActive = false,
  onReassignEntity,
  isReassignPending = false
}: ProspectListProps) => {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [targetAgencyByEntityId, setTargetAgencyByEntityId] = useState<Record<string, string>>({});
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const availableAgencies = useMemo(
    () => agencies.filter((agency) => !agency.archived_at),
    [agencies]
  );
  const showReassignAction = isOrphansFilterActive
    && Boolean(onReassignEntity)
    && availableAgencies.length > 0;

  const columns = useMemo(
    () =>
      createProspectColumns({
        availableAgencies,
        showReassignAction,
        onReassignEntity,
        targetAgencyByEntityId,
        setTargetAgencyByEntityId,
        isReassignPending
      }),
    [
      availableAgencies,
      isReassignPending,
      onReassignEntity,
      showReassignAction,
      targetAgencyByEntityId
    ]
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
    if (selectedIndex < 0 || !selectedProspectId) {
      return;
    }

    const container = scrollRef.current;
    if (!container) {
      return;
    }

    const selectedRow = container.querySelector(
      `[data-testid="prospects-list-row-${selectedProspectId}"]`
    );

    if (!selectedRow) {
      rowVirtualizer.scrollToIndex(selectedIndex, { align: 'center' });
    }
  }, [rowVirtualizer, selectedIndex, selectedProspectId]);

  if (prospects.length === 0) {
    return (
      <div className="text-sm text-muted-foreground/80 border border-dashed border-border rounded-lg p-4">
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
    <div className="rounded-md border border-border">
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
              const handleRowKeyDown = (event: KeyboardEvent<HTMLTableRowElement>) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  onSelect(row.original.id);
                }
              };

              return (
                <TableRow
                  key={key}
                  data-state={isSelected ? 'selected' : undefined}
                  data-testid={`prospects-list-row-${row.original.id}`}
                  className={`cursor-pointer ${
                    isSelected ? 'border-ring/40 bg-primary/5' : 'hover:bg-surface-1'
                  }`}
                  tabIndex={0}
                  aria-selected={isSelected}
                  onClick={() => onSelect(row.original.id)}
                  onKeyDown={handleRowKeyDown}
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
