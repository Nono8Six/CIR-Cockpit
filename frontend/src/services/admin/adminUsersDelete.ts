import { invokeAdminFunction } from './invokeAdminFunction';

export type DeleteUserResponse = {
  ok: true;
  user_id: string;
  deleted: boolean;
  anonymized_interactions?: number;
  anonymized_agency_ids?: string[];
  anonymized_orphan_interactions?: number;
};

export const adminUsersDelete = (userId: string) =>
  invokeAdminFunction<DeleteUserResponse>(
    'admin-users',
    {
      action: 'delete',
      user_id: userId
    },
    "Impossible de supprimer l'utilisateur."
  );
