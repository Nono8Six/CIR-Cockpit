import { invokeAdminFunction } from './invokeAdminFunction';

export type AdminAgencyResponse = {
  ok: true;
  agency: {
    id: string;
    name: string;
    archived_at: string | null;
  };
};

export const adminAgenciesUnarchive = (agencyId: string) =>
  invokeAdminFunction<AdminAgencyResponse>(
    'admin-agencies',
    {
      action: 'unarchive',
      agency_id: agencyId
    },
    "Impossible de reactiver l'agence."
  );
