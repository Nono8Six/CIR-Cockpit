import {
  directoryCompanySearchResponseSchema,
  type DirectoryCompanySearchResponse
} from 'shared/schemas/api-responses';
import {
  directoryCompanySearchResultSchema,
  type DirectoryCompanySearchInput,
  type DirectoryCompanySearchResult
} from 'shared/schemas/directory.schema';
import { z } from 'zod/v4';

import { invokeTrpc } from '@/services/api/safeTrpc';
import { createAppError } from '@/services/errors/AppError';

const COMPANY_SEARCH_URL = 'https://recherche-entreprises.api.gouv.fr/search';
const COMPANY_MATCHING_ESTABLISHMENTS_LIMIT = 100;

const enterpriseApiBooleanLikeSchema = z.union([
  z.boolean(),
  z.string(),
  z.number(),
  z.null(),
  z.undefined()
]);

const enterpriseApiEstablishmentSchema = z.looseObject({
  siret: z.string().trim().min(1).nullable().optional(),
  adresse: z.string().trim().nullable().optional(),
  code_postal: z.string().trim().nullable().optional(),
  libelle_commune: z.string().trim().nullable().optional(),
  departement: z.string().trim().nullable().optional(),
  region: z.string().trim().nullable().optional(),
  est_siege: enterpriseApiBooleanLikeSchema,
  activite_principale: z.string().trim().nullable().optional(),
  etat_administratif: z.string().trim().nullable().optional(),
  date_creation: z.string().trim().nullable().optional(),
  date_debut_activite: z.string().trim().nullable().optional(),
  date_fermeture: z.string().trim().nullable().optional(),
  ancien_siege: enterpriseApiBooleanLikeSchema,
  nom_commercial: z.string().trim().nullable().optional(),
  tranche_effectif_salarie: z.string().trim().nullable().optional(),
  annee_tranche_effectif_salarie: z.union([z.number(), z.string(), z.null(), z.undefined()]),
  caractere_employeur: enterpriseApiBooleanLikeSchema,
  statut_diffusion_etablissement: z.string().trim().nullable().optional(),
  liste_enseignes: z.union([z.array(z.string().nullable()), z.string(), z.null(), z.undefined()])
});

const enterpriseApiCompanySchema = z.looseObject({
  siren: z.string().trim().min(1),
  nom_complet: z.string().trim().nullable().optional(),
  nom_raison_sociale: z.string().trim().nullable().optional(),
  sigle: z.string().trim().nullable().optional(),
  activite_principale: z.string().trim().nullable().optional(),
  nombre_etablissements: z.union([z.number(), z.string(), z.null(), z.undefined()]),
  nombre_etablissements_ouverts: z.union([z.number(), z.string(), z.null(), z.undefined()]),
  siege: enterpriseApiEstablishmentSchema.nullable().optional(),
  matching_etablissements: z.union([z.array(enterpriseApiEstablishmentSchema), z.null(), z.undefined()])
    .transform((value) => value ?? [])
});

const enterpriseApiSearchResponseSchema = z.looseObject({
  results: z.array(enterpriseApiCompanySchema).default([])
});

type EnterpriseApiCompany = z.infer<typeof enterpriseApiCompanySchema>;
type EnterpriseApiEstablishment = z.infer<typeof enterpriseApiEstablishmentSchema>;

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

const normalizeNullableText = (value: unknown): string | null => {
  const normalized = typeof value === 'string' ? value.trim() : '';
  return normalized.length > 0 ? normalized : null;
};

const normalizeBooleanFlag = (value: unknown): boolean | null => {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value === 1 ? true : value === 0 ? false : null;
  if (typeof value !== 'string') return null;
  const normalized = value.trim().toLowerCase();
  if (['true', '1', 'o', 'oui', 'a'].includes(normalized)) return true;
  if (['false', '0', 'n', 'non', 'f'].includes(normalized)) return false;
  return null;
};

const normalizeNullableCount = (value: unknown): number | null => {
  if (typeof value === 'number' && Number.isInteger(value) && value >= 0) return value;
  if (typeof value !== 'string') return null;
  const normalized = Number(value.trim());
  return Number.isInteger(normalized) && normalized >= 0 ? normalized : null;
};

const normalizeTextArray = (value: unknown): string[] => {
  const values = Array.isArray(value) ? value : [value];
  return Array.from(new Set(values
    .filter((entry): entry is string => typeof entry === 'string')
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0)));
};

const normalizeEstablishmentStatus = (value: unknown): DirectoryCompanySearchResult['establishment_status'] => {
  const normalized = typeof value === 'string' ? value.trim().toUpperCase() : '';
  if (normalized === 'A') return 'open';
  if (normalized === 'F') return 'closed';
  return 'unknown';
};

const buildCompanySearchUrl = (input: DirectoryCompanySearchInput): string => {
  const url = new URL(COMPANY_SEARCH_URL);
  url.searchParams.set('q', input.query);
  url.searchParams.set('minimal', 'true');
  url.searchParams.set('include', 'siege,matching_etablissements');
  if (input.department) {
    url.searchParams.set('departement', input.department);
  }
  if (input.postal_code) {
    url.searchParams.set('code_postal', input.postal_code);
  }
  if (input.naf_code) {
    url.searchParams.set('activite_principale', input.naf_code);
  }
  if (input.activity_section) {
    url.searchParams.set('section_activite_principale', input.activity_section);
  }
  url.searchParams.set('limite_matching_etablissements', String(COMPANY_MATCHING_ESTABLISHMENTS_LIMIT));
  url.searchParams.set('page', String(input.page ?? 1));
  url.searchParams.set('per_page', String(input.per_page ?? 10));
  return url.toString();
};

const mapEnterpriseApiEstablishment = (
  company: EnterpriseApiCompany,
  establishment: EnterpriseApiEstablishment
): DirectoryCompanySearchResult => ({
  name: normalizeNullableText(company.nom_complet)
    ?? normalizeNullableText(company.nom_raison_sociale)
    ?? normalizeNullableText(company.sigle)
    ?? company.siren,
  address: normalizeNullableText(establishment.adresse),
  postal_code: normalizeNullableText(establishment.code_postal),
  city: normalizeNullableText(establishment.libelle_commune),
  department: normalizeNullableText(establishment.departement),
  region: normalizeNullableText(establishment.region),
  date_creation: normalizeNullableText(establishment.date_creation),
  date_debut_activite: normalizeNullableText(establishment.date_debut_activite),
  employee_range: normalizeNullableText(establishment.tranche_effectif_salarie),
  employee_range_year: normalizeNullableCount(establishment.annee_tranche_effectif_salarie),
  is_employer: normalizeBooleanFlag(establishment.caractere_employeur),
  establishment_diffusion_status: normalizeNullableText(establishment.statut_diffusion_etablissement),
  brands: normalizeTextArray(establishment.liste_enseignes),
  is_head_office: normalizeBooleanFlag(establishment.est_siege) ?? false,
  is_former_head_office: normalizeBooleanFlag(establishment.ancien_siege) ?? false,
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
  official_name: normalizeNullableText(company.nom_raison_sociale)
    ?? normalizeNullableText(company.nom_complet)
    ?? company.siren,
  official_data_source: 'api-recherche-entreprises',
  official_data_synced_at: new Date().toISOString()
});

const mapEnterpriseApiCompany = (company: EnterpriseApiCompany): DirectoryCompanySearchResult[] => {
  const establishments = company.matching_etablissements.length > 0
    ? company.matching_etablissements
    : company.siege ? [company.siege] : [];
  return establishments.map((establishment) => mapEnterpriseApiEstablishment(company, establishment));
};

const fetchOfficialCompanySearch = async (
  input: DirectoryCompanySearchInput
): Promise<DirectoryCompanySearchResponse> => {
  const response = await fetch(buildCompanySearchUrl(input), {
    headers: { Accept: 'application/json' }
  });
  if (!response.ok) {
    throw createAppError({
      code: response.status === 429 ? 'RATE_LIMITED' : 'REQUEST_FAILED',
      message: 'Le service entreprises est indisponible.',
      source: 'edge',
      status: response.status,
      details: `status=${response.status}`
    });
  }

  const rawPayload = await response.json();
  const parsed = enterpriseApiSearchResponseSchema.safeParse(rawPayload);
  if (!parsed.success) {
    throw createAppError({
      code: 'REQUEST_FAILED',
      message: 'Réponse invalide du service entreprises.',
      source: 'edge',
      details: parsed.error.message
    });
  }

  const cityFilter = input.city?.trim().toLowerCase();
  const headOfficeFilter = input.head_office ?? 'all';
  const companies = parsed.data.results
    .flatMap(mapEnterpriseApiCompany)
    .filter((company) => !cityFilter || company.city?.toLowerCase().includes(cityFilter))
    .filter((company) => {
      if (headOfficeFilter === 'head_office') return company.is_head_office;
      if (headOfficeFilter === 'secondary') return !company.is_head_office;
      return true;
    })
    .filter((company) => directoryCompanySearchResultSchema.safeParse(company).success);

  return {
    ok: true,
    request_id: 'official-api-direct',
    companies
  };
};

const shouldUseDirectOfficialSearch = (): boolean =>
  import.meta.env.DEV && import.meta.env.MODE !== 'test';

export const getDirectoryCompanySearch = async (
  input: DirectoryCompanySearchInput
): Promise<DirectoryCompanySearchResponse> => {
  if (shouldUseDirectOfficialSearch()) {
    return fetchOfficialCompanySearch(input);
  }

  return invokeTrpc(
    (api, options) => api.directory['company-search'].query(input, options),
    parseDirectoryCompanySearchResponse,
    "Impossible de rechercher l'entreprise."
  );
};
