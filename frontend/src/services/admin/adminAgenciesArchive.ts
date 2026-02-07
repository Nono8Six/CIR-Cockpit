import { invokeAdminFunction } from './invokeAdminFunction';

export type AdminAgencyResponse = {
  ok: true;
  agency: {
    id: string;
    name: string;
    archived_at: string | null;
  };
};

export const adminAgenciesArchive = (agencyId: string) =>
  invokeAdminFunction<AdminAgencyResponse>(
    'admin-agencies',
    {
      action: 'archive',
      agency_id: agencyId
    },
    "Impossible d'archiver l'agence."
  );
