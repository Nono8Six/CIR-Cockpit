import React, { useEffect, useState } from 'react';

import { Agency } from '@/types';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';

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

  useEffect(() => {
    if (!open) return;
    setCurrent(selectedIds);
  }, [open, selectedIds]);

  const toggleAgency = (agencyId: string) => {
    setCurrent(prev =>
      prev.includes(agencyId)
        ? prev.filter(id => id !== agencyId)
        : [...prev, agencyId]
    );
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsSubmitting(true);
    await onSave(current);
    setIsSubmitting(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Modifier les agences</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2 max-h-64 overflow-y-auto border border-slate-200 rounded-md p-3">
            {agencies.map(agency => (
              <label key={agency.id} className="flex items-center gap-2 text-sm text-slate-600">
                <input
                  type="checkbox"
                  checked={current.includes(agency.id)}
                  onChange={() => toggleAgency(agency.id)}
                />
                {agency.name}
              </label>
            ))}
            {agencies.length === 0 && (
              <p className="text-xs text-slate-400">Aucune agence disponible.</p>
            )}
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
