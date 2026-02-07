import { invokeAdminFunction } from './invokeAdminFunction';

export type AdminAgencyDeleteResponse = {
  ok: true;
  agency_id: string;
};

export const adminAgenciesHardDelete = (agencyId: string) =>
  invokeAdminFunction<AdminAgencyDeleteResponse>(
    'admin-agencies',
    {
      action: 'hard_delete',
      agency_id: agencyId
    },
    "Impossible de supprimer l'agence."
  );
