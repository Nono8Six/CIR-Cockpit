import type { UseQueryResult } from '@tanstack/react-query';

import type { AdminUserSummary } from '@/services/admin/getAdminUsers';
import type { UserRole } from '@/types';
import UserCard from './UserCard';

type UsersManagerListProps = {
  usersQuery: UseQueryResult<AdminUserSummary[]>;
  users: AdminUserSummary[];
  onResetPassword: (user: AdminUserSummary) => void;
  onArchiveToggle: (user: AdminUserSummary) => void;
  onRoleChange: (userId: string, role: UserRole) => void;
  onEditMemberships: (user: AdminUserSummary) => void;
};

const UsersManagerList = ({
  usersQuery,
  users,
  onResetPassword,
  onArchiveToggle,
  onRoleChange,
  onEditMemberships
}: UsersManagerListProps) => (
  <div className="space-y-2">
    {usersQuery.isLoading && (
      <div className="text-sm text-slate-400 border border-dashed border-slate-200 rounded-md p-4">
        Chargement des utilisateurs...
      </div>
    )}
    {!usersQuery.isLoading && users.length === 0 && (
      <div className="text-sm text-slate-400 border border-dashed border-slate-200 rounded-md p-4">
        Aucun utilisateur.
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
      />
    ))}
  </div>
);

export default UsersManagerList;
