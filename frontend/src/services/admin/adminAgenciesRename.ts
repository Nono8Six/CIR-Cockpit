import { invokeAdminFunction } from './invokeAdminFunction';

export type AdminAgencyResponse = {
  ok: true;
  agency: {
    id: string;
    name: string;
    archived_at: string | null;
  };
};

export const adminAgenciesRename = (agencyId: string, name: string) =>
  invokeAdminFunction<AdminAgencyResponse>(
    'admin-agencies',
    {
      action: 'rename',
      agency_id: agencyId,
      name
    },
    "Impossible de renommer l'agence."
  );
