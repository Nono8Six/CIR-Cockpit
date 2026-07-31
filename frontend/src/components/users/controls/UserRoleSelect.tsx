import { ROLE_LABELS } from '@/app/appConstants';
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
  id?: string;
};

const UserRoleSelect = ({ role, onRoleChange, className, id }: UserRoleSelectProps) => (
  <Select
    value={role}
    onValueChange={(value) => { if (isUserRole(value)) onRoleChange(value); }}
  >
    <SelectTrigger id={id} className={className ?? "mt-1"}>
      <SelectValue />
    </SelectTrigger>
    <SelectContent>
      <SelectItem value="super_admin">{ROLE_LABELS.super_admin}</SelectItem>
      <SelectItem value="agency_admin">{ROLE_LABELS.agency_admin}</SelectItem>
      <SelectItem value="tcs">{ROLE_LABELS.tcs}</SelectItem>
    </SelectContent>
  </Select>
);

export default UserRoleSelect;
