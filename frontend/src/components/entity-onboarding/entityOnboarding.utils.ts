import type { Agency } from '@/types';
import type { DirectoryCompanySearchResult, DirectoryListRow } from 'shared/schemas/directory.schema';

import type { OnboardingValues } from './entityOnboarding.schema';
import type { CompanySearchGroup, EntityOnboardingSeed, OnboardingIntent } from './entityOnboarding.types';

export const OFFICIAL_DEPARTMENT_OPTIONS = [
  '01', '02', '03', '04', '05', '06', '07', '08', '09', '10',
  '11', '12', '13', '14', '15', '16', '17', '18', '19', '21',
  '22', '23', '24', '25', '26', '27', '28', '29', '2A', '2B',
  '30', '31', '32', '33', '34', '35', '36', '37', '38', '39',
  '40', '41', '42', '43', '44', '45', '46', '47', '48', '49',
  '50', '51', '52', '53', '54', '55', '56', '57', '58', '59',
  '60', '61', '62', '63', '64', '65', '66', '67', '68', '69',
  '70', '71', '72', '73', '74', '75', '76', '77', '78', '79',
  '80', '81', '82', '83', '84', '85', '86', '87', '88', '89',
  '90', '91', '92', '93', '94', '95', '971', '972', '973', '974', '976'
].map((code) => ({ value: code, label: code }));

export const buildValues = (
  activeAgencyId: string | null,
  defaultIntent: OnboardingIntent,
  initialEntity: EntityOnboardingSeed | null | undefined
): OnboardingValues => ({
  intent: defaultIntent,
  client_kind: initialEntity?.client_kind === 'individual' ? 'individual' : 'company',
  name: initialEntity?.name ?? '',
  first_name: initialEntity?.first_name ?? '',
  last_name: initialEntity?.last_name ?? '',
  phone: initialEntity?.phone ?? '',
  email: initialEntity?.email ?? '',
  address: initialEntity?.address ?? '',
  postal_code: initialEntity?.postal_code ?? '',
  department: initialEntity?.department ?? '',
  city: initialEntity?.city ?? '',
  siret: initialEntity?.siret ?? '',
  siren: initialEntity?.siren ?? '',
  naf_code: initialEntity?.naf_code ?? '',
  official_name: initialEntity?.official_name ?? '',
  official_data_source: initialEntity?.official_data_source === 'api-recherche-entreprises'
    ? 'api-recherche-entreprises'
    : null,
  official_data_synced_at: initialEntity?.official_data_synced_at ?? '',
  notes: initialEntity?.notes ?? '',
  agency_id: initialEntity?.agency_id ?? activeAgencyId ?? '',
  client_number: initialEntity?.client_number ?? '',
  account_type: initialEntity?.client_kind === 'individual'
    ? 'cash'
    : initialEntity?.account_type ?? 'term',
  cir_commercial_id: initialEntity?.cir_commercial_id ?? ''
});

export const toNullable = (value: string): string | null => value.trim() ? value.trim() : null;

export const getDepartmentFromPostalCode = (postalCode: string): string =>
  postalCode.startsWith('97') ? postalCode.slice(0, 3) : postalCode.slice(0, 2);

export const getDuplicateReason = (record: DirectoryListRow, values: OnboardingValues): string | null => {
  if (values.siret && values.siret === record.siret) {
    return 'SIRET deja present';
  }

  if (values.siren && values.siren === record.siren) {
    return 'SIREN deja present';
  }

  if (
    values.name.trim().toLowerCase() === record.name.trim().toLowerCase()
    && values.city.trim().toLowerCase() === (record.city ?? '').trim().toLowerCase()
  ) {
    return 'Nom et ville deja presents';
  }

  return null;
};

const sortEstablishments = (left: DirectoryCompanySearchResult, right: DirectoryCompanySearchResult): number => {
  if (left.is_head_office !== right.is_head_office) {
    return left.is_head_office ? -1 : 1;
  }

  return [left.city ?? '', left.address ?? '', left.siret ?? '']
    .join(' ')
    .localeCompare([right.city ?? '', right.address ?? '', right.siret ?? ''].join(' '), 'fr');
};

export const groupCompanySearchResults = (
  companies: DirectoryCompanySearchResult[]
): CompanySearchGroup[] => {
  const groups = new Map<string, CompanySearchGroup>();

  for (const company of companies) {
    const groupKey = company.siren ?? company.official_name ?? company.name;
    const existing = groups.get(groupKey);

    if (existing) {
      existing.establishments.push(company);
      continue;
    }

    groups.set(groupKey, {
      id: groupKey,
      siren: company.siren ?? null,
      label: company.official_name ?? company.name,
      subtitle: company.name !== company.official_name ? company.name : null,
      match_quality: company.match_quality,
      match_explanation: company.match_explanation,
      establishments: [company]
    });
  }

  return Array.from(groups.values())
    .map((group) => ({
      ...group,
      establishments: [...group.establishments].sort(sortEstablishments)
    }));
};

export const getOfficialCitySuggestions = (groups: CompanySearchGroup[]): string[] =>
  Array.from(
    new Set(
      groups
        .flatMap((group) => group.establishments)
        .map((company) => company.city?.trim() ?? '')
        .filter((city) => city.length > 0)
    )
  ).sort((left, right) => left.localeCompare(right, 'fr'));

export const getAgencyLabel = (agencies: Agency[], agencyId: string | null | undefined): string =>
  agencies.find((agency) => agency.id === agencyId)?.name ?? 'Aucune';
