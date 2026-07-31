import type { ReactNode } from 'react';

import { ROLE_LABELS } from '@/app/appConstants';
import type { AdminUserSummary } from '@/services/admin/getAdminUsers';
import { cn } from '@/lib/utils';
import AvatarInitials from '../ui/data-display/AvatarInitials';

type UserCardProps = {
  user: AdminUserSummary;
  isSelected?: boolean;
  onSelectToggle?: () => void;
  /** Menu d'actions fourni par la liste, pour garder une voie d'action unique. */
  renderActions: () => ReactNode;
};

const UserCard = ({ user, isSelected = false, onSelectToggle, renderActions }: UserCardProps) => {
  const identityLabel = `${user.last_name ?? ''} ${user.first_name ?? ''}`.trim()
    || user.display_name
    || user.email;

  return (
    <div
      className={cn(
        'flex flex-col gap-2.5 rounded-lg border p-3 transition-colors',
        isSelected ? 'border-primary/45 bg-muted/30' : 'border-border-subtle bg-card'
      )}
      data-testid={`admin-user-card-${user.id}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2.5">
          {onSelectToggle && (
            <input
              type="checkbox"
              className="h-3.5 w-3.5 cursor-pointer rounded border-border bg-background accent-primary"
              checked={isSelected}
              onChange={onSelectToggle}
              aria-label={`Sélectionner ${identityLabel}`}
            />
          )}
          <AvatarInitials name={identityLabel} size="sm" />
          <div className="min-w-0">
            <p className="truncate text-xs font-medium text-foreground">{identityLabel}</p>
            <p className="truncate text-[11px] text-muted-foreground">{user.email}</p>
          </div>
        </div>
        {renderActions()}
      </div>

      <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 border-t border-border-subtle pt-2.5 text-[11px]">
        <dt className="text-muted-foreground">Rôle</dt>
        <dd
          className={cn(
            user.role === 'super_admin' ? 'font-medium text-foreground' : 'text-muted-foreground'
          )}
        >
          {ROLE_LABELS[user.role]}
        </dd>
        <dt className="text-muted-foreground">Agences</dt>
        <dd className="text-muted-foreground">
          {user.memberships.length === 0
            ? 'Aucune agence'
            : user.memberships.map((membership) => membership.agency_name).join(', ')}
        </dd>
        <dt className="text-muted-foreground">Statut</dt>
        <dd className={user.archived_at ? 'text-warning-strong' : 'text-muted-foreground'}>
          {user.archived_at ? 'Archivé' : 'Actif'}
        </dd>
      </dl>
    </div>
  );
};

export default UserCard;
