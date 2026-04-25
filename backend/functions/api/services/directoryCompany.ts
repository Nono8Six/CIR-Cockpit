import { z } from 'zod/v4';

import type {
  DirectoryCompanyDetails,
  DirectoryCompanyDetailsInput,
  DirectoryCompanySearchInput,
  DirectoryCompanySearchResult
} from '../../../../shared/schemas/directory.schema.ts';
import type {
  DirectoryCompanyDetailsResponse,
  DirectoryCompanySearchResponse
} from '../../../../shared/schemas/api-responses.ts';
import {
  executeCompanySearch,
  type CompanySearchPageRequest
} from '../../../../shared/search/companySearch.ts';
import type { AuthContext, DbClient } from '../types.ts';
import { httpError } from '../middleware/errorHandler.ts';
import { ensureDataRateLimit } from './dataAccess.ts';
import {
  normalizeBooleanFlag,
  normalizeEstablishmentStatus,
  normalizeNullableAmount,
  normalizeNullableCount,
  normalizeNullableText,
  normalizeNullableYear,
  normalizeSignal,
  normalizeTextArray
} from './directoryShared.ts';

const COMPANY_SEARCH_URL = 'https://recherche-entreprises.api.gouv.fr/search';
const COMPANY_SEARCH_TIMEOUT_MS = 6_000;
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

const enterpriseApiNumericValueSchema = z
  .union([z.number(), z.string(), z.null(), z.undefined()])
  .transform((value) => {
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value;
    }

    if (typeof value === 'string') {
      const normalized = Number(value.replace(',', '.').trim());
      return Number.isFinite(normalized) ? normalized : null;
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

const enterpriseApiDirectorSchema = z.object({
  nom: z.string().trim().nullable().optional(),
  prenoms: z.string().trim().nullable().optional(),
  annee_de_naissance: z.number().int().nonnegative().nullable().optional(),
  qualite: z.string().trim().nullable().optional(),
  nationalite: z.string().trim().nullable().optional()
}).passthrough();

const enterpriseApiFinancialYearSchema = z.object({
  ca: enterpriseApiNumericValueSchema,
  resultat_net: enterpriseApiNumericValueSchema
}).passthrough();

const enterpriseApiComplementsSchema = z.object({
  est_association: z.union([z.boolean(), z.string(), z.number(), z.null(), z.undefined()]),
  est_ess: z.union([z.boolean(), z.string(), z.number(), z.null(), z.undefined()]),
  est_qualiopi: z.union([z.boolean(), z.string(), z.number(), z.null(), z.undefined()]),
  est_rge: z.union([z.boolean(), z.string(), z.number(), z.null(), z.undefined()]),
  est_bio: z.union([z.boolean(), z.string(), z.number(), z.null(), z.undefined()]),
  est_organisme_formation: z.union([z.boolean(), z.string(), z.number(), z.null(), z.undefined()]),
  est_service_public: z.union([z.boolean(), z.string(), z.number(), z.null(), z.undefined()]),
  est_societe_mission: z.union([z.boolean(), z.string(), z.number(), z.null(), z.undefined()])
}).partial().passthrough();

const enterpriseApiCompanySchema = z.object({
  siren: z.string().trim().min(1, 'SIREN requis'),
  nom_complet: z.string().trim().min(1, 'Nom complet requis'),
  nom_raison_sociale: z.string().trim().nullable().optional(),
  sigle: z.string().trim().nullable().optional(),
  activite_principale: z.string().trim().nullable().optional(),
  activite_principale_naf25: z.string().trim().nullable().optional(),
  categorie_entreprise: z.string().trim().nullable().optional(),
  caractere_employeur: z.union([z.boolean(), z.string(), z.number(), z.null(), z.undefined()]),
  date_creation: z.string().trim().nullable().optional(),
  etat_administratif: z.string().trim().nullable().optional(),
  nature_juridique: z.string().trim().nullable().optional(),
  section_activite_principale: z.string().trim().nullable().optional(),
  tranche_effectif_salarie: z.string().trim().nullable().optional(),
  annee_tranche_effectif_salarie: enterpriseApiNullableYearSchema,
  statut_diffusion: z.string().trim().nullable().optional(),
  nombre_etablissements: z.number().int().nonnegative().nullable().optional(),
  nombre_etablissements_ouverts: z.number().int().nonnegative().nullable().optional(),
  siege: enterpriseApiEstablishmentSchema.nullable().optional(),
  matching_etablissements: z.array(enterpriseApiEstablishmentSchema).default([]),
  dirigeants: z.array(enterpriseApiDirectorSchema).default([]),
  finances: z.record(z.string(), enterpriseApiFinancialYearSchema).nullable().optional(),
  complements: enterpriseApiComplementsSchema.nullable().optional()
}).passthrough();

const enterpriseApiSearchResponseSchema = z.object({
  results: z.array(enterpriseApiCompanySchema).default([])
}).passthrough();

export const buildCompanySearchUrl = (input: CompanySearchPageRequest): string => {
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

const buildCompanyDetailsUrl = (siren: string): string => {
  const url = new URL(COMPANY_SEARCH_URL);
  url.searchParams.set('q', siren);
  url.searchParams.set('page', '1');
  url.searchParams.set('per_page', '10');
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

const mapEnterpriseApiCompany = (
  company: z.infer<typeof enterpriseApiSearchResponseSchema>['results'][number]
): DirectoryCompanySearchResult[] => {
  const establishments = company.matching_etablissements.length > 0
    ? company.matching_etablissements
    : company.siege
      ? [company.siege]
      : [];

  return establishments.map((establishment) => mapEnterpriseApiEstablishment(company, establishment));
};

const normalizeEnterpriseApiDirectors = (
  directors: z.infer<typeof enterpriseApiDirectorSchema>[]
): DirectoryCompanyDetails['directors'] =>
  directors.flatMap((director) => {
    const fullName = [director.prenoms, director.nom]
      .map((value) => normalizeNullableText(value))
      .filter((value): value is string => value !== null)
      .join(' ');

    if (!fullName) {
      return [];
    }

    return [{
      full_name: fullName,
      role: normalizeNullableText(director.qualite),
      nationality: normalizeNullableText(director.nationalite),
      birth_year: normalizeNullableYear(director.annee_de_naissance)
    }];
  });

const normalizeEnterpriseApiFinancials = (
  financials: Record<string, z.infer<typeof enterpriseApiFinancialYearSchema>> | null | undefined
): DirectoryCompanyDetails['financials'] => {
  if (!financials) {
    return null;
  }

  const latestEntry = Object.entries(financials)
    .map(([year, values]) => ({
      year: Number(year),
      values
    }))
    .filter((entry) => Number.isInteger(entry.year))
    .sort((left, right) => right.year - left.year)[0];

  if (!latestEntry) {
    return null;
  }

  return {
    latest_year: latestEntry.year,
    revenue: normalizeNullableAmount(latestEntry.values.ca),
    net_income: normalizeNullableAmount(latestEntry.values.resultat_net)
  };
};

const normalizeEnterpriseApiSignals = (
  complements: z.infer<typeof enterpriseApiComplementsSchema> | null | undefined
): DirectoryCompanyDetails['signals'] => ({
  association: normalizeSignal(complements?.est_association),
  ess: normalizeSignal(complements?.est_ess),
  qualiopi: normalizeSignal(complements?.est_qualiopi),
  rge: normalizeSignal(complements?.est_rge),
  bio: normalizeSignal(complements?.est_bio),
  organisme_formation: normalizeSignal(complements?.est_organisme_formation),
  service_public: normalizeSignal(complements?.est_service_public),
  societe_mission: normalizeSignal(complements?.est_societe_mission)
});

const mapEnterpriseApiCompanyDetails = (
  company: z.infer<typeof enterpriseApiCompanySchema>
): DirectoryCompanyDetails => ({
  siren: company.siren,
  official_name: normalizeNullableText(company.nom_raison_sociale) ?? company.nom_complet,
  name: company.nom_complet,
  sigle: normalizeNullableText(company.sigle),
  nature_juridique: normalizeNullableText(company.nature_juridique),
  categorie_entreprise: normalizeNullableText(company.categorie_entreprise),
  date_creation: normalizeNullableText(company.date_creation),
  etat_administratif: normalizeNullableText(company.etat_administratif),
  activite_principale: normalizeNullableText(company.activite_principale),
  activite_principale_naf25: normalizeNullableText(company.activite_principale_naf25),
  section_activite_principale: normalizeNullableText(company.section_activite_principale),
  company_establishments_count: normalizeNullableCount(company.nombre_etablissements),
  company_open_establishments_count: normalizeNullableCount(company.nombre_etablissements_ouverts),
  employee_range: normalizeNullableText(company.tranche_effectif_salarie),
  employee_range_year: normalizeNullableYear(company.annee_tranche_effectif_salarie),
  is_employer: normalizeBooleanFlag(company.caractere_employeur),
  diffusion_status: normalizeNullableText(company.statut_diffusion),
  directors: normalizeEnterpriseApiDirectors(company.dirigeants),
  financials: normalizeEnterpriseApiFinancials(company.finances),
  signals: normalizeEnterpriseApiSignals(company.complements)
});

const fetchEnterpriseApiSearchResponse = async (
  requestUrl: string
): Promise<z.infer<typeof enterpriseApiSearchResponseSchema>> => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), COMPANY_SEARCH_TIMEOUT_MS);

  try {
    const response = await fetch(requestUrl, {
      headers: {
        Accept: 'application/json',
        'User-Agent': 'CIR-Cockpit/1.0'
      },
      signal: controller.signal
    });

    if (response.status === 429) {
      throw httpError(429, 'RATE_LIMITED', 'Le service entreprises est temporairement indisponible. Reessayez.');
    }

    if (!response.ok) {
      throw httpError(
        502,
        'REQUEST_FAILED',
        'Le service entreprises est indisponible.',
        `status=${response.status}`
      );
    }

    const payload = await response.json();
    const parsed = enterpriseApiSearchResponseSchema.safeParse(payload);
    if (!parsed.success) {
      throw httpError(
        502,
        'REQUEST_FAILED',
        'Reponse invalide du service entreprises.',
        parsed.error.message
      );
    }

    return parsed.data;
  } catch (error) {
    if (typeof error === 'object' && error !== null && Reflect.get(error, 'code')) {
      throw error;
    }

    if (error instanceof DOMException && error.name === 'AbortError') {
      throw httpError(504, 'REQUEST_FAILED', 'Le service entreprises a mis trop de temps a repondre.');
    }

    throw httpError(
      502,
      'REQUEST_FAILED',
      'Impossible de contacter le service entreprises.',
      error instanceof Error ? error.message : undefined
    );
  } finally {
    clearTimeout(timeoutId);
  }
};

const fetchCompanySearchPage = async (
  input: CompanySearchPageRequest
): Promise<DirectoryCompanySearchResult[]> => {
  const payload = await fetchEnterpriseApiSearchResponse(buildCompanySearchUrl(input));
  return payload.results.flatMap(mapEnterpriseApiCompany);
};

export const getDirectoryCompanySearch = async (
  _db: DbClient,
  authContext: AuthContext,
  requestId: string,
  input: DirectoryCompanySearchInput
): Promise<DirectoryCompanySearchResponse> => {
  await ensureDataRateLimit('directory:company-search', authContext.userId);
  const result = await executeCompanySearch(
    input,
    fetchCompanySearchPage,
    (error) => {
      const code = typeof error === 'object' && error !== null
        ? Reflect.get(error, 'code')
        : null;
      return code === 'RATE_LIMITED' ? 'rate-limited' : 'fatal';
    }
  );

  return {
    request_id: requestId,
    ok: true,
    companies: result.companies
  };
};

export const getDirectoryCompanyDetails = async (
  _db: DbClient,
  authContext: AuthContext,
  requestId: string,
  input: DirectoryCompanyDetailsInput
): Promise<DirectoryCompanyDetailsResponse> => {
  await ensureDataRateLimit('directory:company-details', authContext.userId);

  const payload = await fetchEnterpriseApiSearchResponse(buildCompanyDetailsUrl(input.siren));
  const company = payload.results.find((entry) => entry.siren === input.siren);

  if (!company) {
    throw httpError(404, 'NOT_FOUND', 'Societe introuvable.');
  }

  return {
    request_id: requestId,
    ok: true,
    company: mapEnterpriseApiCompanyDetails(company)
  };
};
