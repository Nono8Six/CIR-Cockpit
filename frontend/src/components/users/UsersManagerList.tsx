import { Inbox, Loader2, TriangleAlert, MoreVertical, Pencil, KeyRound, Archive, ArchiveRestore, Trash2, UserCog } from 'lucide-react';
import type { UseQueryResult } from '@tanstack/react-query';

import type { AdminUserSummary } from '@/services/admin/getAdminUsers';
import type { UserRole } from '@/types';
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
import { Badge } from '../ui/data-display/Badge';
import AvatarInitials from '../ui/data-display/AvatarInitials';
import UserRoleSelect from './controls/UserRoleSelect';
import UserMembershipPills from './controls/UserMembershipPills';

type UsersManagerListProps = {
  usersQuery: UseQueryResult<AdminUserSummary[]>;
  users: AdminUserSummary[];
  onRetry: () => void;
  onResetPassword: (user: AdminUserSummary) => void;
  onArchiveToggle: (user: AdminUserSummary) => void;
  onRoleChange: (userId: string, role: UserRole) => void;
  onEditMemberships: (user: AdminUserSummary) => void;
  onEditIdentity: (user: AdminUserSummary) => void;
  onDeleteUser: (user: AdminUserSummary) => void;
  selectedUserIds: string[];
  onSelectToggle: (userId: string) => void;
  onSelectAllToggle: (visibleUsers: AdminUserSummary[]) => void;
};

const UsersManagerList = ({
  usersQuery,
  users,
  onRetry,
  onResetPassword,
  onArchiveToggle,
  onRoleChange,
  onEditMemberships,
  onEditIdentity,
  onDeleteUser,
  selectedUserIds,
  onSelectToggle,
  onSelectAllToggle
}: UsersManagerListProps) => {

  return (
    <div className="space-y-4" data-testid="admin-users-list">
      {usersQuery.isLoading && (
        <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground bg-muted/20">
          <span className="inline-flex flex-col items-center gap-3">
            <Loader2 size={24} className="animate-spin text-primary" />
            <span>Chargement des utilisateurs en cours...</span>
          </span>
        </div>
      )}

      {usersQuery.isError && !usersQuery.isLoading && (
        <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-6 text-center text-sm text-destructive">
          <p className="inline-flex flex-col items-center gap-2 font-medium">
            <TriangleAlert size={24} className="text-destructive" />
            <span>La liste des utilisateurs est temporairement indisponible.</span>
          </p>
          <div className="mt-4">
            <Button type="button" variant="outline" size="sm" onClick={onRetry}>
              Réessayer le chargement
            </Button>
          </div>
        </div>
      )}

      {!usersQuery.isLoading && !usersQuery.isError && users.length === 0 && (
        <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground bg-muted/10">
          <span className="inline-flex flex-col items-center gap-2">
            <Inbox size={24} className="text-muted-foreground/60" />
            <span>Aucun utilisateur trouvé.</span>
          </span>
        </div>
      )}

      {!usersQuery.isLoading && !usersQuery.isError && users.length > 0 && (
        <>
          {/* Desktop Table View */}
          <div className="hidden md:block rounded-2xl border border-border/50 bg-card overflow-hidden shadow-[0_8px_30px_rgba(0,0,0,0.015)]">
            <Table>
              <TableHeader className="bg-muted/5 border-b border-border/40">
                <TableRow className="hover:bg-transparent">
                  <TableHead className="w-[48px] py-3 pl-6">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-border bg-background text-primary focus:ring-ring focus:ring-offset-background accent-primary cursor-pointer transition-colors"
                      checked={users.length > 0 && users.every((u) => selectedUserIds.includes(u.id))}
                      onChange={() => onSelectAllToggle(users)}
                      aria-label="Sélectionner tous les utilisateurs"
                    />
                  </TableHead>
                  <TableHead className="w-[28%] py-3 pl-2 font-semibold text-[10px] tracking-wider uppercase text-muted-foreground/80">Utilisateur</TableHead>
                  <TableHead className="w-[20%] py-3 font-semibold text-[10px] tracking-wider uppercase text-muted-foreground/80">Rôle</TableHead>
                  <TableHead className="w-[35%] py-3 font-semibold text-[10px] tracking-wider uppercase text-muted-foreground/80">Agences</TableHead>
                  <TableHead className="w-[12%] py-3 font-semibold text-[10px] tracking-wider uppercase text-muted-foreground/80">Statut</TableHead>
                  <TableHead className="w-[5%] py-3 text-right"></TableHead>
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
                      className={`group relative transition-all duration-200 hover:bg-muted/15 ${isSelected ? 'bg-muted/20' : ''}`}
                      data-testid={`admin-user-row-${user.id}`}
                    >
                      <TableCell className="py-3.5 pl-6 w-[48px]">
                        <input
                          type="checkbox"
                          className="h-4 w-4 rounded border-border bg-background text-primary focus:ring-ring focus:ring-offset-background accent-primary cursor-pointer transition-colors"
                          checked={isSelected}
                          onChange={() => onSelectToggle(user.id)}
                          aria-label={`Sélectionner ${identityLabel}`}
                        />
                      </TableCell>
                      <TableCell className="py-3.5 pl-2 relative">
                        <span className="absolute left-0 top-[20%] bottom-[20%] w-[3px] rounded-r-full bg-primary opacity-0 group-hover:opacity-100 transition-all duration-200" />
                        <div className="flex items-center gap-3">
                          <AvatarInitials name={identityLabel} size="md" className="shadow-xs" />
                          <div className="flex flex-col min-w-0">
                            <span className="text-sm font-semibold text-foreground truncate max-w-[200px]">
                              {identityLabel}
                            </span>
                            <span className="text-xs text-muted-foreground truncate max-w-[200px]">
                              {user.email}
                            </span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="py-3.5">
                        <UserRoleSelect
                          role={user.role}
                          onRoleChange={(role) => onRoleChange(user.id, role)}
                          className="h-8 w-[140px] text-xs bg-muted/30 border-border/40 hover:bg-background hover:border-border/80 transition-colors rounded-xl"
                        />
                      </TableCell>
                      <TableCell className="py-3.5">
                        <UserMembershipPills
                          memberships={user.memberships}
                          onEdit={() => onEditMemberships(user)}
                        />
                      </TableCell>
                      <TableCell className="py-3.5">
                        {user.archived_at ? (
                          <Badge variant="warning" className="inline-flex items-center gap-1.5 text-[10px] bg-warning/10 text-warning border-warning/20 hover:bg-warning hover:text-warning-foreground transition-all duration-200 uppercase font-semibold">
                            <span className="h-1.5 w-1.5 rounded-full bg-current"></span>
                            Archivé
                          </Badge>
                        ) : (
                          <Badge variant="success" className="inline-flex items-center gap-1.5 text-[10px] bg-success/10 text-success border-success/20 hover:bg-success hover:text-success-foreground transition-all duration-200 uppercase font-semibold">
                            <span className="relative flex h-1.5 w-1.5">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-current opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-current"></span>
                            </span>
                            Actif
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="py-3.5 text-right pr-4">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              type="button"
                              variant="ghost"
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
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          {/* Mobile Grid View */}
          <div className="grid grid-cols-1 gap-4 md:hidden">
            {users.map((user) => (
              <UserCard
                key={user.id}
                user={user}
                onResetPassword={onResetPassword}
                onArchiveToggle={onArchiveToggle}
                onRoleChange={onRoleChange}
                onEditMemberships={onEditMemberships}
                onEditIdentity={onEditIdentity}
                onDeleteUser={onDeleteUser}
                isSelected={selectedUserIds.includes(user.id)}
                onSelectToggle={() => onSelectToggle(user.id)}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default UsersManagerList;
