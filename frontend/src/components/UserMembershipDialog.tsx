import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';

import { Check, ChevronsUpDown, X } from 'lucide-react';

import { Agency } from '@/types';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from './ui/command';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';

interface UserMembershipDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  agencies: Agency[];
  selectedIds: string[];
  onSave: (agencyIds: string[]) => Promise<void>;
}

const UserMembershipDialog = ({
  open,
  onOpenChange,
  agencies,
  selectedIds,
  onSave
}: UserMembershipDialogProps) => {
  const [current, setCurrent] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [openCombobox, setOpenCombobox] = useState(false);

  useEffect(() => {
    if (!open) return;
    setCurrent(selectedIds);
  }, [open, selectedIds]);

  const selectedSet = useMemo(() => new Set(current), [current]);
  const selectedAgencies = useMemo(
    () => agencies.filter((agency) => selectedSet.has(agency.id)),
    [agencies, selectedSet]
  );
  const triggerLabel = selectedAgencies.length === 0
    ? 'Selectionner les agences'
    : `${selectedAgencies.length} agence${selectedAgencies.length > 1 ? 's' : ''} selectionnee${selectedAgencies.length > 1 ? 's' : ''}`;

  const toggleAgency = (agencyId: string) => {
    if (selectedSet.has(agencyId)) {
      setCurrent((prev) => prev.filter((id) => id !== agencyId));
      return;
    }
    setCurrent((prev) => [...prev, agencyId]);
  };

  const removeAgency = (agencyId: string) => {
    setCurrent((prev) => prev.filter((id) => id !== agencyId));
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setIsSubmitting(true);
    try {
      await onSave(current);
      onOpenChange(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Modifier les agences</DialogTitle>
          <DialogDescription className="sr-only">
            Selectionnez les agences rattachees a cet utilisateur.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2" data-testid="admin-user-membership-list">
            <Popover open={openCombobox} onOpenChange={setOpenCombobox}>
              <PopoverTrigger asChild>
                <Button
                  id="membership-agencies-trigger"
                  type="button"
                  variant="outline"
                  role="combobox"
                  aria-expanded={openCombobox}
                  disabled={agencies.length === 0}
                  className="w-full justify-between"
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

            <div className="flex min-h-8 flex-wrap gap-2 rounded-md border border-slate-200 p-3">
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
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              Enregistrer
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default UserMembershipDialog;
