import { invokeAdminFunction } from './invokeAdminFunction';

export type ArchiveUserResponse = {
  ok: true;
  user_id: string;
  archived: boolean;
};

export const adminUsersArchive = (userId: string) =>
  invokeAdminFunction<ArchiveUserResponse>(
    'admin-users',
    {
      action: 'archive',
      user_id: userId
    },
    "Impossible d'archiver l'utilisateur."
  );
