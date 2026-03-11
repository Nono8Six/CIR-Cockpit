import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import type { Client } from '@/types';
import type {
  UiPocClientsSortBy,
  UiPocClientsSortDirection
} from '@/services/clients/getUiPocClientsPage';
import { formatClientNumber } from '@/utils/clients/formatClientNumber';

type UiPocClientsTableProps = {
  clients: Client[];
  selectedClientId: string | null;
  onSelectClient: (clientId: string) => void;
  sortBy: UiPocClientsSortBy;
  sortDirection: UiPocClientsSortDirection;
  onSortChange: (sortBy: UiPocClientsSortBy) => void;
  page: number;
  totalPages: number;
  total: number;
  pageSize: number;
  isFetching: boolean;
  agencyNameById: Record<string, string>;
  onPageChange: (page: number) => void;
};

type SortableHeader = {
  key: UiPocClientsSortBy;
  label: string;
};

const SORTABLE_HEADERS: SortableHeader[] = [
  { key: 'client_number', label: 'N° Client' },
  { key: 'name', label: 'Nom' },
  { key: 'city', label: 'Ville' },
  { key: 'department', label: 'Département' },
  { key: 'commercial', label: 'Commercial' },
  { key: 'account_type', label: 'Compte' }
];

const getSortIcon = (
  active: boolean,
  direction: UiPocClientsSortDirection
) => {
  if (!active) {
    return <ArrowUpDown size={12} className="text-muted-foreground/80" />;
  }
  return direction === 'asc'
    ? <ArrowUp size={12} className="text-primary" />
    : <ArrowDown size={12} className="text-primary" />;
};

const formatCommercialLabel = (createdBy: string | null): string => {
  if (!createdBy) {
    return 'Non défini';
  }
  return createdBy.length > 12 ? `${createdBy.slice(0, 12)}...` : createdBy;
};

const UiPocClientsTable = ({
  clients,
  selectedClientId,
  onSelectClient,
  sortBy,
  sortDirection,
  onSortChange,
  page,
  totalPages,
  total,
  pageSize,
  isFetching,
  agencyNameById,
  onPageChange
}: UiPocClientsTableProps) => {
  const pageStart = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const pageEnd = total === 0 ? 0 : Math.min(total, page * pageSize);

  return (
    <section className="rounded-lg border border-border/70 bg-card p-3">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">
          {`Affichage ${pageStart}-${pageEnd} sur ${total} clients`}
        </p>
        <p className="text-xs text-muted-foreground">
          {isFetching ? 'Mise à jour en cours...' : 'Données synchronisées'}
        </p>
      </div>

      <div className="rounded-md border border-border">
        <Table className="table-fixed">
          <TableHeader>
            <TableRow>
              {SORTABLE_HEADERS.map((header) => {
                const isActive = sortBy === header.key;
                return (
                  <TableHead key={header.key} className="h-9 px-2 text-xs">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="-ml-2 h-8 gap-1 px-2 text-xs"
                      onClick={() => onSortChange(header.key)}
                    >
                      {header.label}
                      {getSortIcon(isActive, sortDirection)}
                    </Button>
                  </TableHead>
                );
              })}
              <TableHead className="h-9 px-2 text-xs">Agence</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {clients.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-16 text-center text-sm text-muted-foreground">
                  Aucun client trouvé pour ces filtres.
                </TableCell>
              </TableRow>
            ) : (
              clients.map((client) => {
                const isSelected = client.id === selectedClientId;
                return (
                  <TableRow
                    key={client.id}
                    data-state={isSelected ? 'selected' : undefined}
                    className={isSelected ? 'bg-primary/5' : undefined}
                    onClick={() => onSelectClient(client.id)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        onSelectClient(client.id);
                      }
                    }}
                    tabIndex={0}
                    aria-selected={isSelected}
                  >
                    <TableCell className="px-2 py-2 text-xs uppercase tracking-wide text-muted-foreground">
                      {formatClientNumber(client.client_number)}
                    </TableCell>
                    <TableCell className="px-2 py-2 text-sm font-medium text-foreground">
                      {client.name}
                    </TableCell>
                    <TableCell className="px-2 py-2 text-sm">{client.city ?? '—'}</TableCell>
                    <TableCell className="px-2 py-2 text-sm">{client.department ?? '—'}</TableCell>
                    <TableCell className="px-2 py-2 text-sm">{formatCommercialLabel(client.created_by)}</TableCell>
                    <TableCell className="px-2 py-2 text-sm">
                      {client.account_type === 'cash' ? 'Comptant' : 'Compte à terme'}
                    </TableCell>
                    <TableCell className="px-2 py-2 text-sm">
                      {client.agency_id ? (agencyNameById[client.agency_id] ?? client.agency_id) : 'Non rattaché'}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      <div className="mt-3 flex items-center justify-end gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => onPageChange(Math.max(1, page - 1))}
          disabled={page <= 1}
        >
          Précédent
        </Button>
        <span className="text-xs text-muted-foreground">{`Page ${page} / ${totalPages}`}</span>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => onPageChange(Math.min(totalPages, page + 1))}
          disabled={page >= totalPages}
        >
          Suivant
        </Button>
      </div>
    </section>
  );
};

export default UiPocClientsTable;
