import { Archive, ArchiveRestore, KeyRound, Pencil, Trash2, MoreVertical, Shield, Building2, UserCog } from 'lucide-react';

import { Button } from '../ui/inputs/basic/Button';
import type { AdminUserSummary } from '@/services/admin/getAdminUsers';
import type { UserRole } from '@/types';
import UserRoleSelect from './controls/UserRoleSelect';
import UserMembershipPills from './controls/UserMembershipPills';
import AvatarInitials from '../ui/data-display/AvatarInitials';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel
} from '../ui/navigation/DropdownMenu';
import { Badge } from '../ui/data-display/Badge';

type UserCardProps = {
  user: AdminUserSummary;
  onResetPassword: (user: AdminUserSummary) => void;
  onArchiveToggle: (user: AdminUserSummary) => void;
  onRoleChange: (userId: string, role: UserRole) => void;
  onEditMemberships: (user: AdminUserSummary) => void;
  onEditIdentity: (user: AdminUserSummary) => void;
  onDeleteUser: (user: AdminUserSummary) => void;
  isSelected?: boolean;
  onSelectToggle?: () => void;
};

const UserCard = ({
  user,
  onResetPassword,
  onArchiveToggle,
  onRoleChange,
  onEditMemberships,
  onEditIdentity,
  onDeleteUser,
  isSelected = false,
  onSelectToggle
}: UserCardProps) => {
  const identityLabel = `${user.last_name ?? ''} ${user.first_name ?? ''}`.trim()
    || user.display_name
    || user.email;

  const getRoleLabelAndColor = (role: UserRole) => {
    switch (role) {
      case 'super_admin':
        return { label: 'Super Admin', color: 'border-destructive/20 bg-destructive/10 text-destructive' };
      case 'agency_admin':
        return { label: 'Admin Agence', color: 'border-primary/20 bg-primary/10 text-primary' };
      default:
        return { label: 'TCS', color: 'border-border bg-muted/30 text-muted-foreground' };
    }
  };

  const { color: roleColor, label: roleLabel } = getRoleLabelAndColor(user.role);

  return (
    <div
      className={`flex flex-col gap-4 rounded-xl border p-4 transition-all hover:shadow-md ${isSelected ? 'border-primary/50 bg-muted/20 shadow-xs' : 'border-border bg-card shadow-sm hover:border-border/80'}`}
      data-testid={`admin-user-card-${user.id}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          {onSelectToggle && (
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-border bg-background text-primary focus:ring-ring focus:ring-offset-background accent-primary cursor-pointer transition-colors"
              checked={isSelected}
              onChange={onSelectToggle}
              aria-label={`Sélectionner ${identityLabel}`}
            />
          )}
          <AvatarInitials name={identityLabel} size="md" className="shadow-inner" />
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-semibold text-foreground tracking-tight">{identityLabel}</span>
              {user.archived_at ? (
                <Badge variant="warning" className="text-[10px] px-1.5 py-0">Archivé</Badge>
              ) : (
                <Badge variant="outline" className={`text-[10px] px-1.5 py-0 border ${roleColor}`}>{roleLabel}</Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">{user.email}</p>
          </div>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 hover:bg-muted rounded-full"
              aria-label="Actions"
            >
              <MoreVertical size={16} />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel className="text-xs text-muted-foreground">Options de compte</DropdownMenuLabel>
            <DropdownMenuItem
              onClick={() => onEditIdentity(user)}
              data-testid={`admin-user-edit-identity-${user.id}`}
            >
              <Pencil size={14} className="mr-2 text-muted-foreground" />
              <span>Modifier l&apos;identité</span>
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => onEditMemberships(user)}
              data-testid={`admin-user-edit-memberships-${user.id}`}
            >
              <UserCog size={14} className="mr-2 text-muted-foreground" />
              <span>Gérer les agences</span>
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => onResetPassword(user)}
              data-testid={`admin-user-reset-password-${user.id}`}
            >
              <KeyRound size={14} className="mr-2 text-muted-foreground" />
              <span>Réinitialiser mot de passe</span>
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => onArchiveToggle(user)}
              data-testid={`admin-user-archive-toggle-${user.id}`}
            >
              {user.archived_at ? (
                <>
                  <ArchiveRestore size={14} className="mr-2 text-muted-foreground" />
                  <span>Restaurer l&apos;utilisateur</span>
                </>
              ) : (
                <>
                  <Archive size={14} className="mr-2 text-muted-foreground" />
                  <span>Archiver l&apos;utilisateur</span>
                </>
              )}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => onDeleteUser(user)}
              className="text-destructive focus:bg-destructive/10 focus:text-destructive"
              data-testid={`admin-user-delete-${user.id}`}
            >
              <Trash2 size={14} className="mr-2" />
              <span>Supprimer l&apos;utilisateur</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="grid grid-cols-1 gap-4 pt-3 border-t border-border/50">
        <div className="flex flex-col gap-1">
          <span className="text-[10px] font-semibold text-muted-foreground/80 uppercase tracking-wider flex items-center gap-1">
            <Shield size={10} /> Modifier le rôle
          </span>
          <UserRoleSelect
            role={user.role}
            onRoleChange={(role) => onRoleChange(user.id, role)}
            className="h-8.5 w-full max-w-[160px] text-xs bg-muted/40"
          />
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-[10px] font-semibold text-muted-foreground/80 uppercase tracking-wider flex items-center gap-1">
            <Building2 size={10} /> Agences associées
          </span>
          <UserMembershipPills memberships={user.memberships} onEdit={() => onEditMemberships(user)} />
        </div>
      </div>
    </div>
  );
};

export default UserCard;
