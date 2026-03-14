import { z } from 'zod/v4';

import {
  directoryCompanyDetailsResponseSchema,
  type DirectoryCompanyDetailsResponse
} from 'shared/schemas/api-responses';
import { type DirectoryCompanyDetails, type DirectoryCompanyDetailsInput } from 'shared/schemas/directory.schema';

import { invokeTrpc } from '@/services/api/invokeTrpc';
import { callTrpcQuery } from '@/services/api/trpcClient';
import { createAppError, isAppError } from '@/services/errors/AppError';

const COMPANY_DETAILS_URL = 'https://recherche-entreprises.api.gouv.fr/search';
const COMPANY_DETAILS_ROUTE_KEY = 'directory.company-details:not-found';
const SHOULD_PREFER_LOCAL_COMPANY_DETAILS = import.meta.env.MODE === 'development';

const enterpriseApiNullableIntegerSchema = z
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

const enterpriseApiNullableNumericSchema = z
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

const enterpriseApiDirectorSchema = z.object({
  nom: z.string().trim().nullable().optional(),
  prenoms: z.string().trim().nullable().optional(),
  annee_de_naissance: enterpriseApiNullableIntegerSchema,
  qualite: z.string().trim().nullable().optional(),
  nationalite: z.string().trim().nullable().optional()
}).passthrough();

const enterpriseApiFinancialYearSchema = z.object({
  ca: enterpriseApiNullableNumericSchema,
  resultat_net: enterpriseApiNullableNumericSchema
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
  annee_tranche_effectif_salarie: enterpriseApiNullableIntegerSchema,
  statut_diffusion: z.string().trim().nullable().optional(),
  nombre_etablissements: enterpriseApiNullableIntegerSchema,
  nombre_etablissements_ouverts: enterpriseApiNullableIntegerSchema,
  dirigeants: z.array(enterpriseApiDirectorSchema).default([]),
  finances: z.record(z.string(), enterpriseApiFinancialYearSchema).nullable().optional(),
  complements: enterpriseApiComplementsSchema.nullable().optional()
}).passthrough();

const enterpriseApiSearchResponseSchema = z.object({
  results: z.array(enterpriseApiCompanySchema).default([])
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

let companyDetailsRouteUnavailable = readUnavailableRouteFlag(COMPANY_DETAILS_ROUTE_KEY);

const parseDirectoryCompanyDetailsResponse = (
  payload: unknown
): DirectoryCompanyDetailsResponse => {
  const parsed = directoryCompanyDetailsResponseSchema.safeParse(payload);
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

const normalizeNullableInteger = (value: number | null | undefined): number | null =>
  typeof value === 'number' && Number.isInteger(value) && value >= 0 ? value : null;

const normalizeNullableAmount = (value: number | null | undefined): number | null =>
  typeof value === 'number' && Number.isFinite(value) ? value : null;

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

const normalizeSignal = (value: boolean | string | number | null | undefined): boolean =>
  normalizeBooleanFlag(value) ?? false;

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
      birth_year: normalizeNullableInteger(director.annee_de_naissance)
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
  company_establishments_count: normalizeNullableInteger(company.nombre_etablissements),
  company_open_establishments_count: normalizeNullableInteger(company.nombre_etablissements_ouverts),
  employee_range: normalizeNullableText(company.tranche_effectif_salarie),
  employee_range_year: normalizeNullableInteger(company.annee_tranche_effectif_salarie),
  is_employer: normalizeBooleanFlag(company.caractere_employeur),
  diffusion_status: normalizeNullableText(company.statut_diffusion),
  directors: normalizeEnterpriseApiDirectors(company.dirigeants),
  financials: normalizeEnterpriseApiFinancials(company.finances),
  signals: {
    association: normalizeSignal(company.complements?.est_association),
    ess: normalizeSignal(company.complements?.est_ess),
    qualiopi: normalizeSignal(company.complements?.est_qualiopi),
    rge: normalizeSignal(company.complements?.est_rge),
    bio: normalizeSignal(company.complements?.est_bio),
    organisme_formation: normalizeSignal(company.complements?.est_organisme_formation),
    service_public: normalizeSignal(company.complements?.est_service_public),
    societe_mission: normalizeSignal(company.complements?.est_societe_mission)
  }
});

const buildCompanyDetailsUrl = (siren: string): string => {
  const url = new URL(COMPANY_DETAILS_URL);
  url.searchParams.set('q', siren);
  url.searchParams.set('page', '1');
  url.searchParams.set('per_page', '10');
  return url.toString();
};

const getDirectoryCompanyDetailsFallback = async (
  input: DirectoryCompanyDetailsInput
): Promise<DirectoryCompanyDetailsResponse> => {
  const response = await fetch(buildCompanyDetailsUrl(input.siren), {
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

  const company = parsed.data.results.find((candidate) => candidate.siren === input.siren);
  if (!company) {
    throw createAppError({
      code: 'NOT_FOUND',
      message: 'Aucune fiche entreprise officielle trouvee.',
      source: 'network'
    });
  }

  return {
    request_id: 'directory-company-details-fallback',
    ok: true,
    company: mapEnterpriseApiCompanyDetails(company)
  };
};

export const getDirectoryCompanyDetails = async (
  input: DirectoryCompanyDetailsInput
): Promise<DirectoryCompanyDetailsResponse> => {
  if (SHOULD_PREFER_LOCAL_COMPANY_DETAILS || companyDetailsRouteUnavailable) {
    return getDirectoryCompanyDetailsFallback(input);
  }

  try {
    return await invokeTrpc(
      () => callTrpcQuery('directory.company-details', input),
      parseDirectoryCompanyDetailsResponse,
      "Impossible de charger les informations société."
    );
  } catch (error) {
    if (!isAppError(error) || error.code !== 'NOT_FOUND') {
      throw error;
    }

    companyDetailsRouteUnavailable = true;
    writeUnavailableRouteFlag(COMPANY_DETAILS_ROUTE_KEY);
    return getDirectoryCompanyDetailsFallback(input);
  }
};
