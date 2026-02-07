import { invokeAdminFunction } from './invokeAdminFunction';

export type ResetPasswordResponse = {
  ok: true;
  user_id: string;
  temporary_password: string;
};

export const adminUsersResetPassword = (userId: string, password?: string) =>
  invokeAdminFunction<ResetPasswordResponse>(
    'admin-users',
    {
      action: 'reset_password',
      user_id: userId,
      password
    },
    'Impossible de reinitialiser le mot de passe.'
  );
