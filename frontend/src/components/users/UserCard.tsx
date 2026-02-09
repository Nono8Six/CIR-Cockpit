import { Archive, ArchiveRestore, KeyRound } from 'lucide-react';

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
};

const UserCard = ({
  user,
  onResetPassword,
  onArchiveToggle,
  onRoleChange,
  onEditMemberships
}: UserCardProps) => (
  <div className="border border-slate-200 rounded-md p-3 flex flex-col gap-3">
    <div className="flex items-start justify-between gap-3">
      <div>
        <p className="text-sm font-semibold text-slate-900">{user.display_name ?? user.email}</p>
        <p className="text-xs text-slate-500">{user.email}</p>
        {user.archived_at && (
          <p className="text-xs text-amber-600">Archive</p>
        )}
      </div>
      <div className="flex items-center gap-2">
        <Button type="button" variant="outline" className="h-8 px-2" onClick={() => onResetPassword(user)}>
          <KeyRound size={14} />
        </Button>
        <Button type="button" variant="outline" className="h-8 px-2" onClick={() => onArchiveToggle(user)}>
          {user.archived_at ? <ArchiveRestore size={14} /> : <Archive size={14} />}
        </Button>
      </div>
    </div>

    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
      <div>
        <label className="text-xs font-semibold text-slate-400 uppercase">Role</label>
        <UserRoleSelect role={user.role} onRoleChange={(role) => onRoleChange(user.id, role)} />
      </div>
      <div className="md:col-span-2">
        <label className="text-xs font-semibold text-slate-400 uppercase">Agences</label>
        <UserMembershipPills memberships={user.memberships} onEdit={() => onEditMemberships(user)} />
      </div>
    </div>
  </div>
);

export default UserCard;
