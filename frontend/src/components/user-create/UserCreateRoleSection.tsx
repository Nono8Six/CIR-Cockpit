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
        <p id="user-create-role-label" className="text-xs font-medium text-muted-foreground">Role</p>
        <Select
          value={role}
          onValueChange={(value) => { if (isUserRole(value)) onRoleChange(value); }}
        >
          <SelectTrigger aria-labelledby="user-create-role-label">
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
        <label htmlFor="user-create-temp-password" className="text-xs font-medium text-muted-foreground">Mot de passe temporaire (optionnel)</label>
        <Input
          id="user-create-temp-password"
          value={password}
          onChange={(event) => onPasswordChange(event.target.value)}
          placeholder="Laisser vide pour generer"
          type="text"
        />
      </div>
    </div>
  );
};

export default UserCreateRoleSection;
