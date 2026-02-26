import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import type { UpdateUserIdentityPayload } from '@/services/admin/adminUsersUpdateIdentity';
import type { AdminUserSummary } from '@/services/admin/getAdminUsers';
import { handleUiError } from '@/services/errors/handleUiError';
import { userIdentityFormSchema, type UserIdentityFormValues } from '../../../shared/schemas/user.schema';
import { Button } from './ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog';
import { Input } from './ui/input';

type UserIdentityDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: AdminUserSummary | null;
  onSave: (payload: UpdateUserIdentityPayload) => Promise<void>;
};

const UserIdentityDialog = ({ open, onOpenChange, user, onSave }: UserIdentityDialogProps) => {
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    reset,
    handleSubmit,
    formState: { errors, isSubmitting, isValid }
  } = useForm<UserIdentityFormValues>({
    resolver: zodResolver(userIdentityFormSchema),
    defaultValues: {
      email: '',
      first_name: '',
      last_name: ''
    },
    mode: 'onChange'
  });

  useEffect(() => {
    if (!open || !user) return;
    setServerError(null);
    reset({
      email: user.email,
      first_name: user.first_name ?? '',
      last_name: user.last_name ?? ''
    });
  }, [open, reset, user]);

  const emailField = register('email');
  const lastNameField = register('last_name');
  const firstNameField = register('first_name');
  const fieldError = errors.email?.message ?? errors.last_name?.message ?? errors.first_name?.message;

  const handleFormSubmit = handleSubmit(async (values) => {
    if (!user) return;

    setServerError(null);
    try {
      await onSave({
        user_id: user.id,
        email: values.email,
        first_name: values.first_name,
        last_name: values.last_name
      });
      onOpenChange(false);
    } catch (err) {
      const appError = handleUiError(err, "Impossible de mettre a jour l'utilisateur.", {
        source: 'UserIdentityDialog.submit'
      });
      setServerError(appError.message);
    }
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Modifier un utilisateur</DialogTitle>
          <DialogDescription className="sr-only">
            Modifiez les informations de profil de cet utilisateur.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleFormSubmit} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="md:col-span-3">
              <label htmlFor="edit-user-email" className="text-xs font-medium text-slate-500">
                Email
              </label>
              <Input
                id="edit-user-email"
                type="email"
                {...emailField}
                placeholder="email@entreprise.fr"
              />
            </div>
            <div>
              <label htmlFor="edit-user-last-name" className="text-xs font-medium text-slate-500">
                Nom
              </label>
              <Input
                id="edit-user-last-name"
                {...lastNameField}
                placeholder="FERRON"
              />
            </div>
            <div>
              <label htmlFor="edit-user-first-name" className="text-xs font-medium text-slate-500">
                Prenom
              </label>
              <Input
                id="edit-user-first-name"
                {...firstNameField}
                placeholder="Arnaud"
              />
            </div>
          </div>

          {fieldError ? <p className="text-sm text-red-600">{fieldError}</p> : null}
          {serverError ? <p className="text-sm text-red-600">{serverError}</p> : null}

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            <Button type="submit" disabled={!isValid || isSubmitting}>
              Enregistrer
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default UserIdentityDialog;
