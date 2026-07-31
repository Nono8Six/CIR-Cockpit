import { Inbox, Loader2, TriangleAlert, MoreVertical, Pencil, KeyRound, Archive, ArchiveRestore, Trash2, UserCog, Shield } from 'lucide-react';
import type { UseQueryResult } from '@tanstack/react-query';

import { ROLE_LABELS } from '@/app/appConstants';
import type { AdminUserSummary } from '@/services/admin/getAdminUsers';
import { cn } from '@/lib/utils';
import { Button } from '../ui/inputs/basic/Button';
import UserCard from './UserCard';
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell
} from '../ui/data-display/Table';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel
} from '../ui/navigation/DropdownMenu';
import AvatarInitials from '../ui/data-display/AvatarInitials';

type UsersManagerListProps = {
  usersQuery: UseQueryResult<AdminUserSummary[]>;
  users: AdminUserSummary[];
  onRetry: () => void;
  onResetPassword: (user: AdminUserSummary) => void;
  onArchiveToggle: (user: AdminUserSummary) => void;
  onChangeRole: (user: AdminUserSummary) => void;
  onEditMemberships: (user: AdminUserSummary) => void;
  onEditIdentity: (user: AdminUserSummary) => void;
  onDeleteUser: (user: AdminUserSummary) => void;
  selectedUserIds: string[];
  onSelectToggle: (userId: string) => void;
  onSelectAllToggle: (visibleUsers: AdminUserSummary[]) => void;
};

const CHECKBOX_CLASS =
  'h-3.5 w-3.5 cursor-pointer rounded border-border bg-background accent-primary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/45';

const UsersManagerList = ({
  usersQuery,
  users,
  onRetry,
  onResetPassword,
  onArchiveToggle,
  onChangeRole,
  onEditMemberships,
  onEditIdentity,
  onDeleteUser,
  selectedUserIds,
  onSelectToggle,
  onSelectAllToggle
}: UsersManagerListProps) => {
  const isEmpty = !usersQuery.isLoading && !usersQuery.isError && users.length === 0;
  const hasRows = !usersQuery.isLoading && !usersQuery.isError && users.length > 0;

  /** Menu d'actions de ligne : voie d'action unique, identique en table et en carte. */
  const renderRowMenu = (user: AdminUserSummary) => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          className="h-7 w-7 rounded-md p-0 hover:bg-muted"
          aria-label={`Actions pour ${user.email}`}
          data-testid={`admin-user-actions-${user.id}`}
        >
          <MoreVertical size={15} />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="text-[11px] text-muted-foreground">
          Options de compte
        </DropdownMenuLabel>
        <DropdownMenuItem
          onClick={() => onEditIdentity(user)}
          data-testid={`admin-user-edit-identity-${user.id}`}
        >
          <Pencil size={14} className="mr-2 text-muted-foreground" />
          <span>Modifier l&apos;identité</span>
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => onChangeRole(user)}
          data-testid={`admin-user-change-role-${user.id}`}
        >
          <Shield size={14} className="mr-2 text-muted-foreground" />
          <span>Modifier le rôle</span>
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
  );

  return (
    <div
      className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-border-subtle bg-card"
      data-testid="admin-users-list"
    >
      <div className="min-h-0 flex-1 overflow-y-auto">
        {usersQuery.isLoading && (
          <div
            className="flex h-full flex-col items-center justify-center gap-2 p-8 text-xs text-muted-foreground"
            aria-busy="true"
          >
            <Loader2 size={20} className="animate-spin text-primary" aria-hidden="true" />
            <span>Chargement des utilisateurs en cours…</span>
          </div>
        )}

        {usersQuery.isError && !usersQuery.isLoading && (
          <div
            className="flex h-full flex-col items-center justify-center gap-2 p-8 text-center text-xs text-destructive"
            role="alert"
          >
            <TriangleAlert size={20} aria-hidden="true" />
            <span>La liste des utilisateurs est temporairement indisponible.</span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="mt-1 h-8 rounded-md px-3 text-xs"
              onClick={onRetry}
            >
              Réessayer le chargement
            </Button>
          </div>
        )}

        {isEmpty && (
          <div className="flex h-full flex-col items-center justify-center gap-2 p-8 text-xs text-muted-foreground">
            <Inbox size={20} className="text-muted-foreground/60" aria-hidden="true" />
            <span>Aucun utilisateur ne correspond à votre recherche.</span>
          </div>
        )}

        {hasRows && (
          <>
            {/* Vue table (desktop) : lecture seule, une seule voie d'action par ligne. */}
            <div className="hidden md:block">
              <Table>
                <TableHeader className="sticky top-0 z-10 bg-card">
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="w-10 pl-4">
                      <input
                        type="checkbox"
                        className={CHECKBOX_CLASS}
                        checked={users.every((user) => selectedUserIds.includes(user.id))}
                        onChange={() => onSelectAllToggle(users)}
                        aria-label="Sélectionner tous les utilisateurs"
                      />
                    </TableHead>
                    <TableHead className="w-[34%]">Utilisateur</TableHead>
                    <TableHead className="w-[16%]">Rôle</TableHead>
                    <TableHead className="w-[32%]">Agences</TableHead>
                    <TableHead className="w-[12%]">Statut</TableHead>
                    <TableHead className="w-10 pr-4" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => {
                    const identityLabel = `${user.last_name ?? ''} ${user.first_name ?? ''}`.trim()
                      || user.display_name
                      || user.email;
                    const isSelected = selectedUserIds.includes(user.id);

                    return (
                      <TableRow
                        key={user.id}
                        className={cn('group', isSelected && 'bg-muted/40')}
                        data-state={isSelected ? 'selected' : undefined}
                        data-testid={`admin-user-row-${user.id}`}
                      >
                        <TableCell className="pl-4">
                          <input
                            type="checkbox"
                            className={CHECKBOX_CLASS}
                            checked={isSelected}
                            onChange={() => onSelectToggle(user.id)}
                            aria-label={`Sélectionner ${identityLabel}`}
                          />
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2.5">
                            <AvatarInitials name={identityLabel} size="sm" />
                            <div className="flex min-w-0 flex-col">
                              <span className="truncate font-medium text-foreground" title={identityLabel}>
                                {identityLabel}
                              </span>
                              <span className="truncate text-[11px] text-muted-foreground" title={user.email}>
                                {user.email}
                              </span>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span
                            className={cn(
                              user.role === 'super_admin'
                                ? 'font-medium text-foreground'
                                : 'text-muted-foreground'
                            )}
                          >
                            {ROLE_LABELS[user.role]}
                          </span>
                        </TableCell>
                        <TableCell>
                          {user.memberships.length === 0 ? (
                            <span className="text-muted-foreground/70">Aucune agence</span>
                          ) : (
                            <span
                              className="block truncate text-muted-foreground"
                              title={user.memberships.map((m) => m.agency_name).join(', ')}
                            >
                              {user.memberships.map((m) => m.agency_name).join(', ')}
                            </span>
                          )}
                        </TableCell>
                        <TableCell>
                          <span
                            className={cn(
                              'inline-flex items-center gap-1.5 text-[11px]',
                              user.archived_at ? 'text-warning-strong' : 'text-muted-foreground'
                            )}
                          >
                            <span
                              className={cn(
                                'size-1.5 rounded-full',
                                user.archived_at ? 'bg-warning' : 'bg-success'
                              )}
                              aria-hidden="true"
                            />
                            {user.archived_at ? 'Archivé' : 'Actif'}
                          </span>
                        </TableCell>
                        <TableCell className="pr-4 text-right">{renderRowMenu(user)}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>

            {/* Vue cartes (mobile) : meme grammaire, meme menu. */}
            <div className="grid grid-cols-1 gap-3 p-3 md:hidden">
              {users.map((user) => (
                <UserCard
                  key={user.id}
                  user={user}
                  isSelected={selectedUserIds.includes(user.id)}
                  onSelectToggle={() => onSelectToggle(user.id)}
                  renderActions={() => renderRowMenu(user)}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default UsersManagerList;
