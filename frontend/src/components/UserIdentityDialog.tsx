import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';

import type { UpdateUserIdentityPayload } from '@/services/admin/adminUsersUpdateIdentity';
import type { AdminUserSummary } from '@/services/admin/getAdminUsers';
import { normalizeError } from '@/services/errors/normalizeError';
import { Button } from './ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog';
import { Input } from './ui/input';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type UserIdentityDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: AdminUserSummary | null;
  onSave: (payload: UpdateUserIdentityPayload) => Promise<void>;
};

const UserIdentityDialog = ({ open, onOpenChange, user, onSave }: UserIdentityDialogProps) => {
  const [email, setEmail] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!open || !user) return;
    setEmail(user.email);
    setFirstName(user.first_name ?? '');
    setLastName(user.last_name ?? '');
    setError(null);
  }, [open, user]);

  const canSubmit = useMemo(
    () => Boolean(email.trim() && firstName.trim() && lastName.trim()),
    [email, firstName, lastName]
  );

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!user) return;

    const normalizedEmail = email.trim().toLowerCase();
    const normalizedFirstName = firstName.trim();
    const normalizedLastName = lastName.trim();

    if (!EMAIL_REGEX.test(normalizedEmail)) {
      setError('Email invalide.');
      return;
    }
    if (!normalizedFirstName || !normalizedLastName) {
      setError('Nom et prenom requis.');
      return;
    }

    setError(null);
    setIsSubmitting(true);
    try {
      await onSave({
        user_id: user.id,
        email: normalizedEmail,
        first_name: normalizedFirstName,
        last_name: normalizedLastName
      });
      onOpenChange(false);
    } catch (err) {
      const appError = normalizeError(err, "Impossible de mettre a jour l'utilisateur.");
      setError(appError.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Modifier un utilisateur</DialogTitle>
          <DialogDescription className="sr-only">
            Modifiez les informations de profil de cet utilisateur.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="md:col-span-3">
              <label htmlFor="edit-user-email" className="text-xs font-medium text-slate-500">
                Email
              </label>
              <Input
                id="edit-user-email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="email@entreprise.fr"
              />
            </div>
            <div>
              <label htmlFor="edit-user-last-name" className="text-xs font-medium text-slate-500">
                Nom
              </label>
              <Input
                id="edit-user-last-name"
                value={lastName}
                onChange={(event) => setLastName(event.target.value)}
                placeholder="FERRON"
              />
            </div>
            <div>
              <label htmlFor="edit-user-first-name" className="text-xs font-medium text-slate-500">
                Prenom
              </label>
              <Input
                id="edit-user-first-name"
                value={firstName}
                onChange={(event) => setFirstName(event.target.value)}
                placeholder="Arnaud"
              />
            </div>
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            <Button type="submit" disabled={!canSubmit || isSubmitting}>
              Enregistrer
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default UserIdentityDialog;
