import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import { agencyFormSchema, type AgencyFormValues } from '../../../shared/schemas/agency.schema';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';

interface AgencyFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  initialValue?: string;
  onSubmit: (name: string) => Promise<void>;
}

const AgencyFormDialog = ({
  open,
  onOpenChange,
  title,
  initialValue,
  onSubmit
}: AgencyFormDialogProps) => {
  const {
    register,
    reset,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting }
  } = useForm<AgencyFormValues>({
    resolver: zodResolver(agencyFormSchema),
    defaultValues: {
      name: initialValue ?? ''
    }
  });

  useEffect(() => {
    if (!open) return;
    reset({ name: initialValue ?? '' });
  }, [initialValue, open, reset]);

  const nameField = register('name');
  const rootError = errors.root?.message;

  const handleFormSubmit = handleSubmit(async (values) => {
    try {
      await onSubmit(values.name.trim());
      onOpenChange(false);
    } catch {
      setError('root', { type: 'server', message: "Impossible d'enregistrer l'agence." });
    }
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription className="sr-only">
            Formulaire de creation ou de modification d une agence.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleFormSubmit} className="space-y-4">
          <div>
            <label htmlFor="agency-name" className="text-xs font-medium text-slate-500">Nom de l&apos;agence</label>
            <Input id="agency-name" {...nameField} placeholder="Nom" />
            {errors.name?.message ? <p className="mt-1 text-xs text-red-600">{errors.name.message}</p> : null}
          </div>
          {rootError ? <p className="text-sm text-red-600">{rootError}</p> : null}
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

export default AgencyFormDialog;
