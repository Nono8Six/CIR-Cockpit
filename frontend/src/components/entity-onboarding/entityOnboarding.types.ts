import type { z } from 'zod/v4';

import {
  type DirectoryCompanySearchEstablishmentStatus,
  type DirectoryCompanySearchMatchQuality,
  type DirectoryCompanySearchResult,
  type DirectoryListRow
} from 'shared/schemas/directory.schema';
import { accountTypeSchema } from 'shared/schemas/client.schema';

export type OnboardingIntent = 'client' | 'prospect';
export type OnboardingMode = 'create' | 'convert';
export type AccountType = z.infer<typeof accountTypeSchema>;
export type EntityOnboardingSeed = {
  id?: string;
  entity_type?: string | null;
  client_kind?: string | null;
  name?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  postal_code?: string | null;
  department?: string | null;
  city?: string | null;
  siret?: string | null;
  siren?: string | null;
  naf_code?: string | null;
  official_name?: string | null;
  official_data_source?: string | null;
  official_data_synced_at?: string | null;
  notes?: string | null;
  agency_id?: string | null;
  client_number?: string | null;
  account_type?: AccountType | null;
  cir_commercial_id?: string | null;
};

export type CompanySearchGroup = {
  id: string;
  siren: string | null;
  label: string;
  subtitle: string | null;
  match_quality: DirectoryCompanySearchMatchQuality;
  match_explanation: string | null;
  primaryEstablishmentStatus: DirectoryCompanySearchEstablishmentStatus;
  totalEstablishmentCount: number;
  openEstablishmentCount: number;
  closedEstablishmentCount: number;
  unknownEstablishmentCount: number;
  establishments: DirectoryCompanySearchResult[];
};

export type CompanySearchStatusFilter =
  | 'all'
  | DirectoryCompanySearchEstablishmentStatus;

export type DuplicateMatch = {
  record: DirectoryListRow;
  reason: string;
};
