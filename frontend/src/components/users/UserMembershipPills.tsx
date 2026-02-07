import { UserCog } from 'lucide-react';

import { Button } from '@/components/ui/button';
import type { AdminUserSummary } from '@/services/admin/getAdminUsers';

type UserMembershipPillsProps = {
  memberships: AdminUserSummary['memberships'];
  onEdit: () => void;
};

const UserMembershipPills = ({ memberships, onEdit }: UserMembershipPillsProps) => (
  <div className="flex flex-wrap gap-2 mt-2">
    {memberships.length === 0 && (
      <span className="text-xs text-slate-400">Aucune agence</span>
    )}
    {memberships.map((membership) => (
      <span
        key={membership.agency_id}
        className="text-xs bg-slate-100 border border-slate-200 rounded-full px-2 py-1"
      >
        {membership.agency_name}
      </span>
    ))}
    <Button
      type="button"
      variant="outline"
      className="h-7 px-2 text-xs"
      onClick={onEdit}
    >
      <UserCog size={14} className="mr-1" /> Modifier
    </Button>
  </div>
);

export default UserMembershipPills;
