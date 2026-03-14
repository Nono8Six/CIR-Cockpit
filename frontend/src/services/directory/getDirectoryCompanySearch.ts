import { z } from 'zod/v4';

import {
  directoryCompanySearchResponseSchema,
  type DirectoryCompanySearchResponse
} from 'shared/schemas/api-responses';
import { type DirectoryCompanySearchInput, type DirectoryCompanySearchResult } from 'shared/schemas/directory.schema';
import {
  executeCompanySearch,
  type CompanySearchPageRequest
} from 'shared/search/companySearch';

import { invokeTrpc } from '@/services/api/invokeTrpc';
import { callTrpcQuery } from '@/services/api/trpcClient';
import { createAppError, isAppError } from '@/services/errors/AppError';

const COMPANY_SEARCH_URL = 'https://recherche-entreprises.api.gouv.fr/search';
const COMPANY_SEARCH_ROUTE_KEY = 'directory.company-search:not-found';
const SHOULD_PREFER_LOCAL_COMPANY_SEARCH = import.meta.env.MODE === 'development';
const enterpriseApiNullableYearSchema = z
  .union([z.number(), z.string(), z.null(), z.undefined()])
  .transform((value) => {
    if (typeof value === 'number' && Number.isInteger(value) && value >= 0) {
      return value;
    }

    if (typeof value === 'string') {
      const normalized = Number(value.trim());
      return Number.isInteger(normalized) && normalized >= 0 ? normalized : null;
    }

    return null;
  });

const enterpriseApiEstablishmentSchema = z.object({
  siret: z.string().trim().min(1, 'SIRET requis').nullable().optional(),
  adresse: z.string().trim().nullable().optional(),
  code_postal: z.string().trim().nullable().optional(),
  libelle_commune: z.string().trim().nullable().optional(),
  departement: z.string().trim().nullable().optional(),
  region: z.string().trim().nullable().optional(),
  est_siege: z.boolean().optional(),
  activite_principale: z.string().trim().nullable().optional(),
  activite_principale_naf25: z.string().trim().nullable().optional(),
  etat_administratif: z.string().trim().nullable().optional(),
  date_creation: z.string().trim().nullable().optional(),
  date_debut_activite: z.string().trim().nullable().optional(),
  date_fermeture: z.string().trim().nullable().optional(),
  ancien_siege: z.boolean().optional(),
  nom_commercial: z.string().trim().nullable().optional(),
  tranche_effectif_salarie: z.string().trim().nullable().optional(),
  annee_tranche_effectif_salarie: enterpriseApiNullableYearSchema,
  caractere_employeur: z.union([z.boolean(), z.string(), z.number(), z.null(), z.undefined()]),
  statut_diffusion_etablissement: z.string().trim().nullable().optional(),
  liste_enseignes: z.union([z.array(z.string()), z.string(), z.null(), z.undefined()])
}).passthrough();

const enterpriseApiSearchResponseSchema = z.object({
  results: z.array(z.object({
    siren: z.string().trim().min(1, 'SIREN requis'),
    nom_complet: z.string().trim().min(1, 'Nom complet requis'),
    nom_raison_sociale: z.string().trim().nullable().optional(),
    activite_principale: z.string().trim().nullable().optional(),
    nombre_etablissements: z.number().int().nonnegative().nullable().optional(),
    nombre_etablissements_ouverts: z.number().int().nonnegative().nullable().optional(),
    siege: enterpriseApiEstablishmentSchema.nullable().optional(),
    matching_etablissements: z.array(enterpriseApiEstablishmentSchema).default([])
  })).default([])
}).passthrough();

const readUnavailableRouteFlag = (key: string): boolean => {
  if (typeof window === 'undefined') {
    return false;
  }

  return window.sessionStorage.getItem(key) === '1';
};

const writeUnavailableRouteFlag = (key: string): void => {
  if (typeof window === 'undefined') {
    return;
  }

  window.sessionStorage.setItem(key, '1');
};

let companySearchRouteUnavailable = readUnavailableRouteFlag(COMPANY_SEARCH_ROUTE_KEY);

const parseDirectoryCompanySearchResponse = (payload: unknown): DirectoryCompanySearchResponse => {
  const parsed = directoryCompanySearchResponseSchema.safeParse(payload);
  if (!parsed.success) {
    throw createAppError({
      code: 'REQUEST_FAILED',
      message: 'Reponse serveur invalide.',
      source: 'edge',
      details: parsed.error.message
    });
  }

  return parsed.data;
};

const normalizeNullableText = (value: string | null | undefined): string | null => {
  const trimmed = value?.trim() ?? '';
  return trimmed.length > 0 ? trimmed : null;
};

const normalizeNullableCount = (value: number | null | undefined): number | null =>
  typeof value === 'number' && Number.isInteger(value) && value >= 0 ? value : null;

const normalizeNullableYear = (value: number | null | undefined): number | null =>
  typeof value === 'number' && Number.isInteger(value) && value >= 0 ? value : null;

const normalizeBooleanFlag = (value: boolean | string | number | null | undefined): boolean | null => {
  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'number') {
    if (value === 1) {
      return true;
    }

    if (value === 0) {
      return false;
    }

    return null;
  }

  if (typeof value !== 'string') {
    return null;
  }

  const normalized = value.trim().toLowerCase();
  if (['1', 'o', 'oui', 'true', 'vrai', 'y', 'yes'].includes(normalized)) {
    return true;
  }

  if (['0', 'n', 'non', 'false', 'faux', 'no'].includes(normalized)) {
    return false;
  }

  return null;
};

const normalizeTextArray = (value: string[] | string | null | undefined): string[] => {
  const entries = Array.isArray(value) ? value : value ? [value] : [];
  return Array.from(
    new Set(
      entries
        .map((entry) => entry.trim())
        .filter((entry) => entry.length > 0)
    )
  );
};

const normalizeEstablishmentStatus = (
  value: string | null | undefined
): DirectoryCompanySearchResult['establishment_status'] => {
  if (value === 'A') {
    return 'open';
  }

  if (value === 'F') {
    return 'closed';
  }

  return 'unknown';
};

const buildCompanySearchUrl = (input: CompanySearchPageRequest): string => {
  const url = new URL(COMPANY_SEARCH_URL);
  url.searchParams.set('q', input.query);
  url.searchParams.set('minimal', 'true');
  url.searchParams.set('include', 'siege,matching_etablissements');
  if (input.department) {
    url.searchParams.set('departement', input.department);
  }
  if (input.city) {
    url.searchParams.set('ville', input.city);
  }
  url.searchParams.set('page', String(input.page));
  url.searchParams.set('per_page', String(input.per_page));
  return url.toString();
};

const mapEnterpriseApiEstablishment = (
  company: z.infer<typeof enterpriseApiSearchResponseSchema>['results'][number],
  establishment: z.infer<typeof enterpriseApiEstablishmentSchema>
): DirectoryCompanySearchResult => ({
  name: company.nom_complet,
  address: normalizeNullableText(establishment.adresse),
  postal_code: normalizeNullableText(establishment.code_postal),
  city: normalizeNullableText(establishment.libelle_commune),
  department: normalizeNullableText(establishment.departement),
  region: normalizeNullableText(establishment.region),
  date_creation: normalizeNullableText(establishment.date_creation),
  date_debut_activite: normalizeNullableText(establishment.date_debut_activite),
  employee_range: normalizeNullableText(establishment.tranche_effectif_salarie),
  employee_range_year: normalizeNullableYear(establishment.annee_tranche_effectif_salarie),
  is_employer: normalizeBooleanFlag(establishment.caractere_employeur),
  establishment_diffusion_status: normalizeNullableText(establishment.statut_diffusion_etablissement),
  brands: normalizeTextArray(establishment.liste_enseignes),
  is_head_office: Boolean(establishment.est_siege ?? false),
  is_former_head_office: Boolean(establishment.ancien_siege ?? false),
  establishment_status: normalizeEstablishmentStatus(establishment.etat_administratif),
  establishment_closed_at: normalizeNullableText(establishment.date_fermeture),
  commercial_name: normalizeNullableText(establishment.nom_commercial),
  company_establishments_count: normalizeNullableCount(company.nombre_etablissements),
  company_open_establishments_count: normalizeNullableCount(company.nombre_etablissements_ouverts),
  match_quality: 'expanded',
  match_explanation: null,
  siret: normalizeNullableText(establishment.siret),
  siren: normalizeNullableText(company.siren),
  naf_code: normalizeNullableText(establishment.activite_principale ?? company.activite_principale),
  official_name: normalizeNullableText(company.nom_raison_sociale) ?? company.nom_complet,
  official_data_source: 'api-recherche-entreprises',
  official_data_synced_at: new Date().toISOString()
});

const fetchCompanySearchPage = async (
  input: CompanySearchPageRequest
): Promise<DirectoryCompanySearchResult[]> => {
  const response = await fetch(buildCompanySearchUrl(input), {
    headers: {
      Accept: 'application/json'
    }
  });

  if (response.status === 429) {
    throw createAppError({
      code: 'RATE_LIMITED',
      message: 'Le service entreprises est temporairement indisponible. Reessaie.',
      source: 'network',
      status: 429
    });
  }

  if (!response.ok) {
    throw createAppError({
      code: 'REQUEST_FAILED',
      message: 'Le service entreprises est indisponible.',
      source: 'network',
      status: response.status,
      details: `status=${response.status}`
    });
  }

  const payload = await response.json();
  const parsed = enterpriseApiSearchResponseSchema.safeParse(payload);
  if (!parsed.success) {
    throw createAppError({
      code: 'REQUEST_FAILED',
      message: 'Reponse invalide du service entreprises.',
      source: 'network',
      details: parsed.error.message
    });
  }

  return parsed.data.results.flatMap((company) => {
    const establishments = company.matching_etablissements.length > 0
      ? company.matching_etablissements
      : company.siege
        ? [company.siege]
        : [];

    return establishments.map((establishment) => mapEnterpriseApiEstablishment(company, establishment));
  });
};

const getDirectoryCompanySearchFallback = async (
  input: DirectoryCompanySearchInput
): Promise<DirectoryCompanySearchResponse> => {
  const result = await executeCompanySearch(
    input,
    fetchCompanySearchPage,
    (error) => isAppError(error) && error.code === 'RATE_LIMITED' ? 'rate-limited' : 'fatal'
  );

  return {
    request_id: 'directory-company-search-fallback',
    ok: true,
    companies: result.companies
  };
};

export const getDirectoryCompanySearch = async (
  input: DirectoryCompanySearchInput
): Promise<DirectoryCompanySearchResponse> => {
  if (SHOULD_PREFER_LOCAL_COMPANY_SEARCH || companySearchRouteUnavailable) {
    return getDirectoryCompanySearchFallback(input);
  }

  try {
    return await invokeTrpc(
      () => callTrpcQuery('directory.company-search', input),
      parseDirectoryCompanySearchResponse,
      "Impossible de rechercher l'entreprise."
    );
  } catch (error) {
    if (!isAppError(error) || error.code !== 'NOT_FOUND') {
      throw error;
    }

    companySearchRouteUnavailable = true;
    writeUnavailableRouteFlag(COMPANY_SEARCH_ROUTE_KEY);
    return getDirectoryCompanySearchFallback(input);
  }
};
