import type { Agency } from '@/types';
import type {
  DirectoryCompanySearchEstablishmentStatus,
  DirectoryCompanySearchResult,
  DirectoryListRow
} from 'shared/schemas/directory.schema';

import type { OnboardingValues } from './entityOnboarding.schema';
import type {
  CompanySearchGroup,
  CompanySearchStatusFilter,
  EntityOnboardingSeed,
  OnboardingIntent
} from './entityOnboarding.types';

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
  const leftBucket = getEstablishmentSortBucket(left);
  const rightBucket = getEstablishmentSortBucket(right);
  if (leftBucket !== rightBucket) {
    return leftBucket - rightBucket;
  }

  if (left.is_head_office !== right.is_head_office) {
    return left.is_head_office ? -1 : 1;
  }

  if (left.is_former_head_office !== right.is_former_head_office) {
    return left.is_former_head_office ? -1 : 1;
  }

  return [left.city ?? '', left.address ?? '', left.siret ?? '']
    .join(' ')
    .localeCompare([right.city ?? '', right.address ?? '', right.siret ?? ''].join(' '), 'fr');
};

const getEstablishmentSortBucket = (company: DirectoryCompanySearchResult): number => {
  if (company.establishment_status === 'open' && company.is_head_office) {
    return 0;
  }

  if (company.establishment_status === 'open') {
    return 1;
  }

  if (company.establishment_status === 'unknown') {
    return 2;
  }

  return 3;
};

const resolveOfficialCount = (
  companies: DirectoryCompanySearchResult[],
  key: 'company_establishments_count' | 'company_open_establishments_count'
): number | null => companies.find((company) => company[key] != null)?.[key] ?? null;

const countEstablishmentsByStatus = (
  companies: DirectoryCompanySearchResult[],
  status: DirectoryCompanySearchEstablishmentStatus
): number => companies.filter((company) => company.establishment_status === status).length;

export const getCompanySearchStatusLabel = (
  status: DirectoryCompanySearchEstablishmentStatus
): string => {
  if (status === 'open') {
    return 'Actif';
  }

  if (status === 'closed') {
    return 'Ferme';
  }

  return 'Statut inconnu';
};

export const formatOfficialDate = (value: string | null | undefined): string | null => {
  const trimmed = value?.trim() ?? '';
  if (!trimmed) {
    return null;
  }

  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) {
    return trimmed;
  }

  return new Intl.DateTimeFormat('fr-FR', { dateStyle: 'short' }).format(parsed);
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
      primaryEstablishmentStatus: company.establishment_status,
      totalEstablishmentCount: company.company_establishments_count ?? 1,
      openEstablishmentCount: company.company_open_establishments_count ?? Number(company.establishment_status === 'open'),
      closedEstablishmentCount: Number(company.establishment_status === 'closed'),
      unknownEstablishmentCount: Number(company.establishment_status === 'unknown'),
      establishments: [company]
    });
  }

  return Array.from(groups.values())
    .map((group) => {
      const establishments = [...group.establishments].sort(sortEstablishments);
      const totalEstablishmentCount = resolveOfficialCount(establishments, 'company_establishments_count') ?? establishments.length;
      const openEstablishmentCount = resolveOfficialCount(establishments, 'company_open_establishments_count')
        ?? countEstablishmentsByStatus(establishments, 'open');
      const unknownEstablishmentCount = countEstablishmentsByStatus(establishments, 'unknown');
      const observedClosedEstablishmentCount = countEstablishmentsByStatus(establishments, 'closed');
      const derivedClosedEstablishmentCount = unknownEstablishmentCount === 0
        ? Math.max(totalEstablishmentCount - openEstablishmentCount, 0)
        : observedClosedEstablishmentCount;
      const closedEstablishmentCount = Math.max(
        observedClosedEstablishmentCount,
        derivedClosedEstablishmentCount
      );

      return {
        ...group,
        establishments,
        primaryEstablishmentStatus: establishments[0]?.establishment_status ?? 'unknown',
        totalEstablishmentCount,
        openEstablishmentCount,
        closedEstablishmentCount,
        unknownEstablishmentCount
      };
    });
};

export const filterCompanySearchGroups = (
  groups: CompanySearchGroup[],
  statusFilter: CompanySearchStatusFilter
): CompanySearchGroup[] => {
  if (statusFilter === 'all') {
    return groups;
  }

  return groups.flatMap((group) => {
    const establishments = group.establishments.filter(
      (company) => company.establishment_status === statusFilter
    );

    if (establishments.length === 0) {
      return [];
    }

    return [{
      ...group,
      establishments
    }];
  });
};

export const getAgencyLabel = (agencies: Agency[], agencyId: string | null | undefined): string =>
  agencies.find((agency) => agency.id === agencyId)?.name ?? 'Aucune';
