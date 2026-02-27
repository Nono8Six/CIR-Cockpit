import { Input } from '@/components/ui/input';
import type { UserRole } from '@/types';
import { isUserRole } from '@/utils/typeGuards';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';

type UserCreateRoleSectionProps = {
  role: UserRole;
  password: string;
  onRoleChange: (value: UserRole) => void;
  onPasswordChange: (value: string) => void;
};

const UserCreateRoleSection = ({ role, password, onRoleChange, onPasswordChange }: UserCreateRoleSectionProps) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div>
        <label className="text-xs font-medium text-muted-foreground">Role</label>
        <Select
          value={role}
          onValueChange={(value) => { if (isUserRole(value)) onRoleChange(value); }}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="super_admin">Super admin</SelectItem>
            <SelectItem value="agency_admin">Admin agence</SelectItem>
            <SelectItem value="tcs">TCS</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div>
        <label className="text-xs font-medium text-muted-foreground">Mot de passe temporaire (optionnel)</label>
        <Input value={password} onChange={(event) => onPasswordChange(event.target.value)} placeholder="Laisser vide pour generer" type="text" />
      </div>
    </div>
  );
};

export default UserCreateRoleSection;
