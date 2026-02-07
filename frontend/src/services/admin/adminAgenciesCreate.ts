import { invokeAdminFunction } from './invokeAdminFunction';

export type AdminAgencyResponse = {
  ok: true;
  agency: {
    id: string;
    name: string;
    archived_at: string | null;
  };
};

export const adminAgenciesCreate = (name: string) =>
  invokeAdminFunction<AdminAgencyResponse>(
    'admin-agencies',
    {
      action: 'create',
      name
    },
    "Impossible de creer l'agence."
  );
