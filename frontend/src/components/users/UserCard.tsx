import { Archive, ArchiveRestore, KeyRound, Pencil, Trash2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import type { AdminUserSummary } from '@/services/admin/getAdminUsers';
import type { UserRole } from '@/types';
import UserRoleSelect from './UserRoleSelect';
import UserMembershipPills from './UserMembershipPills';

type UserCardProps = {
  user: AdminUserSummary;
  onResetPassword: (user: AdminUserSummary) => void;
  onArchiveToggle: (user: AdminUserSummary) => void;
  onRoleChange: (userId: string, role: UserRole) => void;
  onEditMemberships: (user: AdminUserSummary) => void;
  onEditIdentity: (user: AdminUserSummary) => void;
  onDeleteUser: (user: AdminUserSummary) => void;
};

const UserCard = ({
  user,
  onResetPassword,
  onArchiveToggle,
  onRoleChange,
  onEditMemberships,
  onEditIdentity,
  onDeleteUser
}: UserCardProps) => {
  const identityLabel = `${user.last_name ?? ''} ${user.first_name ?? ''}`.trim()
    || user.display_name
    || user.email;

  return (
  <div className="flex flex-col gap-3 rounded-md border border-border p-3" data-testid={`admin-user-card-${user.id}`}>
    <div className="flex items-start justify-between gap-3">
      <div>
        <p className="text-sm font-semibold text-foreground">{identityLabel}</p>
        <p className="text-xs text-muted-foreground">{user.email}</p>
        {user.archived_at && (
          <p className="text-xs text-warning">Archive</p>
        )}
      </div>
      <div className="flex flex-wrap items-center justify-end gap-2">
        <Button
          type="button"
          variant="outline"
          className="h-9 px-3 text-xs sm:text-sm"
          onClick={() => onEditIdentity(user)}
          aria-label="Modifier l'utilisateur"
          data-testid={`admin-user-edit-identity-${user.id}`}
        >
          <Pencil size={14} className="mr-1" /> Modifier
        </Button>
        <Button
          type="button"
          variant="outline"
          className="h-9 px-3 text-xs sm:text-sm"
          onClick={() => onResetPassword(user)}
          aria-label="Reinitialiser le mot de passe"
          data-testid={`admin-user-reset-password-${user.id}`}
        >
          <KeyRound size={14} className="mr-1" /> Reinitialiser
        </Button>
        <Button
          type="button"
          variant="outline"
          className="h-9 px-3 text-xs sm:text-sm"
          onClick={() => onArchiveToggle(user)}
          aria-label={user.archived_at ? "Restaurer l'utilisateur" : "Archiver l'utilisateur"}
          data-testid={`admin-user-archive-toggle-${user.id}`}
        >
          {user.archived_at ? <ArchiveRestore size={14} className="mr-1" /> : <Archive size={14} className="mr-1" />}
          {user.archived_at ? 'Restaurer' : 'Archiver'}
        </Button>
        <Button
          type="button"
          variant="outline"
          className="h-9 border-destructive/30 px-3 text-xs text-destructive hover:bg-destructive/10 sm:text-sm"
          onClick={() => onDeleteUser(user)}
          aria-label="Supprimer l'utilisateur"
          data-testid={`admin-user-delete-${user.id}`}
        >
          <Trash2 size={14} className="mr-1" /> Supprimer
        </Button>
      </div>
    </div>

    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
      <div>
        <label className="text-xs font-semibold text-muted-foreground/80 uppercase">Role</label>
        <UserRoleSelect role={user.role} onRoleChange={(role) => onRoleChange(user.id, role)} />
      </div>
      <div className="md:col-span-2">
        <label className="text-xs font-semibold text-muted-foreground/80 uppercase">Agences</label>
        <UserMembershipPills memberships={user.memberships} onEdit={() => onEditMemberships(user)} />
      </div>
    </div>
  </div>
  );
};

export default UserCard;
