import type { UserRole } from '@/types';
import { isUserRole } from '@/utils/typeGuards';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '../../ui/inputs/selects/Select';

type UserRoleSelectProps = {
  role: UserRole;
  onRoleChange: (role: UserRole) => void;
  className?: string;
};

const UserRoleSelect = ({ role, onRoleChange, className }: UserRoleSelectProps) => (
  <Select
    value={role}
    onValueChange={(value) => { if (isUserRole(value)) onRoleChange(value); }}
  >
    <SelectTrigger className={className ?? "mt-1"}>
      <SelectValue />
    </SelectTrigger>
    <SelectContent>
      <SelectItem value="super_admin">Super admin</SelectItem>
      <SelectItem value="agency_admin">Admin agence</SelectItem>
      <SelectItem value="tcs">TCS</SelectItem>
    </SelectContent>
  </Select>
);

export default UserRoleSelect;
