import { useEffect, useMemo, useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import { Agency, Client } from '@/types';
import { formatClientNumber } from '@/utils/clients/formatClientNumber';

interface ClientListProps {
  clients: Client[];
  selectedClientId: string | null;
  onSelect: (clientId: string) => void;
  agencies?: Agency[];
  isOrphansFilterActive?: boolean;
  onReassignEntity?: (entityId: string, targetAgencyId: string) => Promise<void>;
  isReassignPending?: boolean;
}

const ROW_ESTIMATED_SIZE = 64;
const ROW_OVERSCAN = 8;

const ClientList = ({
  clients,
  selectedClientId,
  onSelect,
  agencies = [],
  isOrphansFilterActive = false,
  onReassignEntity,
  isReassignPending = false
}: ClientListProps) => {
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

  const columns = useMemo<ColumnDef<Client>[]>(
    () => {
      const baseColumns: ColumnDef<Client>[] = [
        {
          accessorFn: (client) => formatClientNumber(client.client_number),
          id: 'client_number',
          header: ({ column }) => (
            <Button
              type="button"
              variant="ghost"
              className="-ml-3 h-8 px-3 text-xs text-muted-foreground"
              onClick={column.getToggleSortingHandler()}
            >
              No client
              <ArrowUpDown size={14} className="ml-1 text-muted-foreground/80" />
            </Button>
          ),
          cell: ({ row }) => (
            <span className="text-xs uppercase tracking-wider text-muted-foreground">
              {formatClientNumber(row.original.client_number)}
            </span>
          )
        },
        {
          accessorKey: 'name',
          header: ({ column }) => (
            <Button
              type="button"
              variant="ghost"
              className="-ml-3 h-8 px-3 text-xs text-muted-foreground"
              onClick={column.getToggleSortingHandler()}
            >
              Client
              <ArrowUpDown size={14} className="ml-1 text-muted-foreground/80" />
            </Button>
          ),
          cell: ({ row }) => (
            <span className="block truncate font-semibold text-foreground">
              {row.original.name}
            </span>
          )
        },
        {
          accessorFn: (client) => client.city ?? '',
          id: 'city',
          header: ({ column }) => (
            <Button
              type="button"
              variant="ghost"
              className="-ml-3 h-8 px-3 text-xs text-muted-foreground"
              onClick={column.getToggleSortingHandler()}
            >
              Ville
              <ArrowUpDown size={14} className="ml-1 text-muted-foreground/80" />
            </Button>
          ),
          cell: ({ row }) => (
            <span className="block truncate text-xs text-muted-foreground">
              {row.original.city || 'Sans ville'}
            </span>
          )
        },
        {
          accessorFn: (client) =>
            client.account_type === 'cash' ? 'Comptant' : 'Compte a terme',
          id: 'account_type',
          header: 'Compte',
          cell: ({ row }) => (
            <span className="hidden text-xs text-muted-foreground sm:inline">
              {row.original.account_type === 'cash' ? 'Comptant' : 'Compte a terme'}
            </span>
          )
        },
        {
          id: 'archived',
          header: 'Etat',
          enableSorting: false,
          cell: ({ row }) =>
            row.original.archived_at ? (
              <span className="inline-flex items-center gap-1 text-xs uppercase text-warning">
                <Archive size={12} /> Archive
              </span>
            ) : (
              <span className="text-xs text-success">Actif</span>
            )
        }
      ];

      if (!showReassignAction) {
        return baseColumns;
      }

      baseColumns.push({
        id: 'reassign',
        header: 'Reassignation',
        enableSorting: false,
        cell: ({ row }) => {
          if (row.original.agency_id !== null || !onReassignEntity) {
            return null;
          }

          const selectedAgencyId = targetAgencyByEntityId[row.original.id];
          const handleReassignClick = () => {
            if (!selectedAgencyId || isReassignPending) {
              return;
            }

            void onReassignEntity(row.original.id, selectedAgencyId).then(() => {
              setTargetAgencyByEntityId((current) => {
                const next = { ...current };
                delete next[row.original.id];
                return next;
              });
            });
          };

          return (
            <div className="flex min-w-[220px] items-center gap-2">
              <Select
                value={selectedAgencyId}
                onValueChange={(agencyId) =>
                  setTargetAgencyByEntityId((current) => ({ ...current, [row.original.id]: agencyId }))}
              >
                <SelectTrigger
                  className="h-8 w-[150px] text-xs"
                  density="dense"
                  onPointerDown={(event) => event.stopPropagation()}
                  onClick={(event) => event.stopPropagation()}
                  data-testid={`client-reassign-select-${row.original.id}`}
                >
                  <SelectValue placeholder="Agence cible" />
                </SelectTrigger>
                <SelectContent>
                  {availableAgencies.map((agency) => (
                    <SelectItem key={agency.id} value={agency.id}>
                      {agency.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                type="button"
                className="h-8 px-2 text-xs"
                disabled={!selectedAgencyId || isReassignPending}
                onPointerDown={(event) => event.stopPropagation()}
                onClick={(event) => {
                  event.stopPropagation();
                  handleReassignClick();
                }}
                data-testid={`client-reassign-button-${row.original.id}`}
              >
                Reassigner
              </Button>
            </div>
          );
        }
      });

      return baseColumns;
    },
    [availableAgencies, isReassignPending, onReassignEntity, showReassignAction, targetAgencyByEntityId]
  );

  // eslint-disable-next-line react-hooks/incompatible-library -- TanStack Table is required for P05 data grid and intentionally opts out of React Compiler memoization.
  const table = useReactTable({
    data: clients,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel()
  });

  const rows = table.getRowModel().rows;
  const selectedIndex = useMemo(
    () => rows.findIndex((row) => row.original.id === selectedClientId),
    [rows, selectedClientId]
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

  if (clients.length === 0) {
    return (
      <div className="text-sm text-muted-foreground/80 border border-dashed border-border rounded-lg p-4">
        Aucun client trouve.
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
        data-testid="clients-list"
      >
        <Table className="table-fixed">
          <TableBody>
            {topSpacer > 0 && (
              <TableRow aria-hidden="true">
                <TableCell colSpan={columns.length} style={{ height: `${topSpacer}px` }} />
              </TableRow>
            )}
            {visibleRows.map(({ key, size, row }) => {
              const isSelected = row.original.id === selectedClientId;
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
                  data-testid={`clients-list-row-${row.original.id}`}
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

export default ClientList;
