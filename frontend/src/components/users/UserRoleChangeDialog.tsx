import { useState } from 'react';
import { ArrowRight, ShieldAlert } from 'lucide-react';

import { ROLE_LABELS, ROLE_PERMISSIONS } from '@/app/appConstants';
import type { AdminUserSummary } from '@/services/admin/getAdminUsers';
import type { UserRole } from '@/types';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from '../ui/feedback/AlertDialog';
import UserRoleSelect from './controls/UserRoleSelect';

type UserRoleChangeDialogProps = {
  /** Monte seulement a l'ouverture : l'etat repart toujours du role courant. */
  user: AdminUserSummary;
  onCancel: () => void;
  onConfirm: (role: UserRole) => void;
};

const UserRoleChangeDialog = ({ user, onCancel, onConfirm }: UserRoleChangeDialogProps) => {
  const [nextRole, setNextRole] = useState<UserRole>(user.role);

  const identityLabel = `${user.last_name ?? ''} ${user.first_name ?? ''}`.trim()
    || user.display_name
    || user.email;
  const isUnchanged = nextRole === user.role;
  const isElevationToSuperAdmin = nextRole === 'super_admin' && user.role !== 'super_admin';

  return (
    <AlertDialog
      open
      onOpenChange={(open) => {
        if (!open) onCancel();
      }}
    >
      <AlertDialogContent
        className="max-w-md gap-3 p-5"
        data-testid="admin-user-role-dialog"
      >
        <AlertDialogHeader>
          <AlertDialogTitle className="text-sm font-semibold">
            Modifier le rôle de {identityLabel}
          </AlertDialogTitle>
          <AlertDialogDescription className="text-xs">
            {identityLabel} ({user.email}) est actuellement {ROLE_LABELS[user.role]}.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="flex flex-col gap-1.5">
          <label
            className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground"
            htmlFor="admin-user-next-role"
          >
            Nouveau rôle
          </label>
          <UserRoleSelect
            id="admin-user-next-role"
            role={nextRole}
            onRoleChange={setNextRole}
            className="h-8 w-full text-xs"
          />
        </div>

        <div className="rounded-md border border-border-subtle bg-surface-1 p-3">
          <p className="flex items-center gap-2 text-xs font-medium text-foreground">
            <span>{ROLE_LABELS[user.role]}</span>
            <ArrowRight size={13} className="text-muted-foreground" aria-hidden="true" />
            <span>{ROLE_LABELS[nextRole]}</span>
          </p>
          <p className="mt-1.5 text-[11px] leading-relaxed text-muted-foreground">
            Ce que {ROLE_LABELS[nextRole]} autorise : {ROLE_PERMISSIONS[nextRole]}
          </p>
        </div>

        {isElevationToSuperAdmin ? (
          <p
            className="flex items-start gap-2 rounded-md border border-warning/25 bg-warning/10 p-2.5 text-[11px] leading-relaxed text-warning-strong"
            role="alert"
          >
            <ShieldAlert size={14} className="mt-px shrink-0" aria-hidden="true" />
            <span>
              Élévation de privilège : {identityLabel} pourra gérer les rôles de tous les
              utilisateurs, y compris le vôtre, sur toutes les agences.
            </span>
          </p>
        ) : null}

        <AlertDialogFooter className="gap-2">
          <AlertDialogCancel className="h-8 px-3 text-xs">Annuler</AlertDialogCancel>
          <AlertDialogAction
            className="h-8 px-3 text-xs"
            disabled={isUnchanged}
            onClick={() => onConfirm(nextRole)}
            data-testid="admin-user-role-confirm"
          >
            Confirmer le changement de rôle
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default UserRoleChangeDialog;
