import { invokeAdminFunction } from './invokeAdminFunction';

export type UnarchiveUserResponse = {
  ok: true;
  user_id: string;
  archived: boolean;
};

export const adminUsersUnarchive = (userId: string) =>
  invokeAdminFunction<UnarchiveUserResponse>(
    'admin-users',
    {
      action: 'unarchive',
      user_id: userId
    },
    "Impossible de reactiver l'utilisateur."
  );
