import { invokeAdminFunction } from './invokeAdminFunction';
import { UserRole } from '@/types';

export type SetUserRoleResponse = {
  ok: true;
  user_id: string;
  role: UserRole;
};

export const adminUsersSetRole = (userId: string, role: UserRole) =>
  invokeAdminFunction<SetUserRoleResponse>(
    'admin-users',
    {
      action: 'set_role',
      user_id: userId,
      role
    },
    'Impossible de mettre a jour le role.'
  );
