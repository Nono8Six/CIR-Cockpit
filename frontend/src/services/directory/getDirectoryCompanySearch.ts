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

const enterpriseApiEstablishmentSchema = z.object({
  siret: z.string().trim().min(1, 'SIRET requis').nullable().optional(),
  adresse: z.string().trim().nullable().optional(),
  code_postal: z.string().trim().nullable().optional(),
  libelle_commune: z.string().trim().nullable().optional(),
  departement: z.string().trim().nullable().optional(),
  est_siege: z.boolean().optional(),
  activite_principale: z.string().trim().nullable().optional()
}).passthrough();

const enterpriseApiSearchResponseSchema = z.object({
  results: z.array(z.object({
    siren: z.string().trim().min(1, 'SIREN requis'),
    nom_complet: z.string().trim().min(1, 'Nom complet requis'),
    nom_raison_sociale: z.string().trim().nullable().optional(),
    activite_principale: z.string().trim().nullable().optional(),
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
  is_head_office: Boolean(establishment.est_siege ?? false),
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
