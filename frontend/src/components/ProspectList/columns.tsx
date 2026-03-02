import type { Dispatch, SetStateAction } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { Archive, ArrowUpDown } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import type { Agency, Entity } from '@/types';

type CreateProspectColumnsParams = {
  availableAgencies: Agency[];
  showReassignAction: boolean;
  onReassignEntity?: (entityId: string, targetAgencyId: string) => Promise<void>;
  targetAgencyByEntityId: Record<string, string>;
  setTargetAgencyByEntityId: Dispatch<SetStateAction<Record<string, string>>>;
  isReassignPending: boolean;
};

export const createProspectColumns = ({
  availableAgencies,
  showReassignAction,
  onReassignEntity,
  targetAgencyByEntityId,
  setTargetAgencyByEntityId,
  isReassignPending
}: CreateProspectColumnsParams): ColumnDef<Entity>[] => {
  const baseColumns: ColumnDef<Entity>[] = [
    {
      accessorFn: (prospect) => prospect.entity_type || 'Prospect',
      id: 'entity_type',
      header: 'Type',
      cell: ({ row }) => (
        <span className="text-xs uppercase tracking-wider text-muted-foreground">
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
          className="-ml-3 h-8 px-3 text-xs text-muted-foreground"
          onClick={column.getToggleSortingHandler()}
        >
          Prospect
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
      accessorFn: (prospect) => prospect.city ?? '',
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
      accessorFn: (prospect) => prospect.siret ?? '',
      id: 'siret',
      header: 'Siret',
      cell: ({ row }) => (
        <span className="hidden text-xs text-muted-foreground md:inline">
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
              data-testid={`prospect-reassign-select-${row.original.id}`}
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
            data-testid={`prospect-reassign-button-${row.original.id}`}
          >
            Reassigner
          </Button>
        </div>
      );
    }
  });

  return baseColumns;
};
