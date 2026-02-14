import { useMemo, useState } from 'react';

import { Check, ChevronsUpDown, X } from 'lucide-react';

import type { Agency } from '@/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

type UserCreateAgenciesSectionProps = {
  agencies: Agency[];
  selectedAgencyIds: string[];
  onAgencyIdsChange: (agencyIds: string[]) => void;
};

const UserCreateAgenciesSection = ({
  agencies,
  selectedAgencyIds,
  onAgencyIdsChange
}: UserCreateAgenciesSectionProps) => {
  const [open, setOpen] = useState(false);

  const selectedSet = useMemo(() => new Set(selectedAgencyIds), [selectedAgencyIds]);
  const selectedAgencies = useMemo(
    () => agencies.filter((agency) => selectedSet.has(agency.id)),
    [agencies, selectedSet]
  );
  const triggerLabel = selectedAgencies.length === 0
    ? 'Selectionner les agences'
    : `${selectedAgencies.length} agence${selectedAgencies.length > 1 ? 's' : ''} selectionnee${selectedAgencies.length > 1 ? 's' : ''}`;

  const toggleAgency = (agencyId: string) => {
    if (selectedSet.has(agencyId)) {
      onAgencyIdsChange(selectedAgencyIds.filter((id) => id !== agencyId));
      return;
    }
    onAgencyIdsChange([...selectedAgencyIds, agencyId]);
  };

  const removeAgency = (agencyId: string) => {
    onAgencyIdsChange(selectedAgencyIds.filter((id) => id !== agencyId));
  };

  return (
    <div data-testid="admin-user-create-agencies">
      <label htmlFor="create-user-agencies-trigger" className="text-xs font-medium text-slate-500">
        Agences
      </label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            id="create-user-agencies-trigger"
            type="button"
            variant="outline"
            role="combobox"
            aria-expanded={open}
            disabled={agencies.length === 0}
            className="mt-2 w-full justify-between"
          >
            <span className="truncate text-left">{triggerLabel}</span>
            <ChevronsUpDown className="size-4 text-slate-400" aria-hidden="true" />
          </Button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-[--radix-popover-trigger-width] p-0">
          <Command>
            <CommandInput placeholder="Rechercher une agence..." className="h-9" />
            <CommandList>
              <CommandEmpty>Aucune agence disponible.</CommandEmpty>
              <CommandGroup>
                {agencies.map((agency) => {
                  const isSelected = selectedSet.has(agency.id);
                  return (
                    <CommandItem
                      key={agency.id}
                      value={agency.name}
                      onSelect={() => {
                        toggleAgency(agency.id);
                      }}
                    >
                      <span className="flex-1">{agency.name}</span>
                      <Check
                        className={`size-4 text-cir-red transition-opacity ${isSelected ? 'opacity-100' : 'opacity-0'}`}
                        aria-hidden="true"
                      />
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      <div className="mt-2 flex min-h-8 flex-wrap gap-2">
        {selectedAgencies.map((agency) => (
          <Badge key={agency.id} variant="secondary" className="flex items-center gap-1 pr-1 text-xs">
            <span>{agency.name}</span>
            <button
              type="button"
              onClick={() => removeAgency(agency.id)}
              className="rounded-sm p-0.5 text-slate-500 transition-colors hover:bg-slate-200 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              aria-label={`Retirer l'agence ${agency.name}`}
            >
              <X className="size-3" aria-hidden="true" />
            </button>
          </Badge>
        ))}
        {selectedAgencies.length === 0 && (
          <p className="text-xs text-slate-400">Aucune agence selectionnee.</p>
        )}
      </div>
    </div>
  );
};

export default UserCreateAgenciesSection;
