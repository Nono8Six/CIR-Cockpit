import { invokeAdminFunction } from './invokeAdminFunction';

export type UpdateUserIdentityPayload = {
  user_id: string;
  email: string;
  first_name: string;
  last_name: string;
};

export type UpdateUserIdentityResponse = {
  ok: true;
  user_id: string;
  email: string;
  first_name: string;
  last_name: string;
  display_name?: string;
};

export const adminUsersUpdateIdentity = (payload: UpdateUserIdentityPayload) =>
  invokeAdminFunction<UpdateUserIdentityResponse>(
    'admin-users',
    {
      action: 'update_identity',
      ...payload
    },
    "Impossible de mettre a jour l'identite de l'utilisateur."
  );
