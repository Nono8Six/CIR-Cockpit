import { invokeAdminFunction } from './invokeAdminFunction';
import { UserRole } from '@/types';

export type CreateAdminUserPayload = {
  email: string;
  display_name?: string;
  role?: UserRole;
  agency_ids?: string[];
  password?: string;
};

export type CreateAdminUserResponse = {
  ok: true;
  user_id: string;
  account_state: 'created' | 'existing';
  role: UserRole;
  agency_ids: string[];
  temporary_password?: string;
};

export const adminUsersCreate = (payload: CreateAdminUserPayload) =>
  invokeAdminFunction<CreateAdminUserResponse>(
    'admin-users',
    {
      action: 'create',
      ...payload
    },
    "Impossible de creer l'utilisateur."
  );
