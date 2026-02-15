import { Inbox, Loader2, TriangleAlert } from 'lucide-react';
import type { UseQueryResult } from '@tanstack/react-query';

import type { AdminUserSummary } from '@/services/admin/getAdminUsers';
import type { UserRole } from '@/types';
import { Button } from '@/components/ui/button';
import UserCard from './UserCard';

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
  onDeleteUser
}: UsersManagerListProps) => (
  <div className="space-y-2" data-testid="admin-users-list">
    {usersQuery.isLoading && (
      <div className="rounded-md border border-dashed border-slate-200 p-4 text-sm text-slate-500">
        <span className="inline-flex items-center gap-2">
          <Loader2 size={16} className="animate-spin" /> Chargement des utilisateurs...
        </span>
      </div>
    )}
    {usersQuery.isError && !usersQuery.isLoading && (
      <div className="rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
        <p className="inline-flex items-center gap-2 font-medium">
          <TriangleAlert size={16} /> La liste des utilisateurs est indisponible.
        </p>
        <Button type="button" variant="outline" size="sm" className="mt-3" onClick={onRetry}>
          Reessayer
        </Button>
      </div>
    )}
    {!usersQuery.isLoading && !usersQuery.isError && users.length === 0 && (
      <div className="rounded-md border border-dashed border-slate-200 p-4 text-sm text-slate-500">
        <span className="inline-flex items-center gap-2">
          <Inbox size={16} /> Aucun utilisateur.
        </span>
      </div>
    )}
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
      />
    ))}
  </div>
);

export default UsersManagerList;
