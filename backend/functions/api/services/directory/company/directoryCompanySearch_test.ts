import { assertEquals, assertRejects } from "std/assert";

import type { DirectoryCompanySearchResult } from '../../../../../../shared/schemas/system/directory.schema.ts';
import { directoryCompanySearchResponseSchema } from '../../../../../../shared/schemas/system/api-responses.ts';
import {
  type CompanySearchPageRequest,
  executeCompanySearch,
} from '../../../../../../shared/search/companySearch.ts';
import { fetchEnterpriseApiSearchResponse } from './directoryCompanyApi.ts';
import { mapEnterpriseApiCompany } from './directoryCompanySearchMapper.ts';

const withFetchStub = async (
  response: Response,
  action: () => Promise<void>,
): Promise<void> => {
  const originalFetch = globalThis.fetch;
  const stubFetch: typeof fetch = () => Promise.resolve(response.clone());
  globalThis.fetch = stubFetch;
  try {
    await action();
  } finally {
    globalThis.fetch = originalFetch;
  }
};

const readErrorProperty = (error: Error, key: string): unknown =>
  Reflect.get(error, key);

const createCompanySearchResult = (
  overrides: Partial<DirectoryCompanySearchResult>,
): DirectoryCompanySearchResult => ({
  name: "Example",
  address: null,
  postal_code: null,
  city: null,
  department: null,
  region: null,
  date_creation: null,
  date_debut_activite: null,
  employee_range: null,
  employee_range_year: null,
  is_employer: null,
  establishment_diffusion_status: null,
  brands: [],
  is_head_office: true,
  is_former_head_office: false,
  establishment_status: "open",
  establishment_closed_at: null,
  commercial_name: null,
  company_establishments_count: 1,
  company_open_establishments_count: 1,
  match_quality: "expanded",
  match_explanation: null,
  siret: null,
  siren: null,
  naf_code: null,
  official_name: null,
  official_data_source: "api-recherche-entreprises",
  official_data_synced_at: "2026-05-11T00:00:00.000Z",
  ...overrides,
});

Deno.test("executeCompanySearch ranks an acronym plus city match before broad city-name expansion", async () => {
  const cirToulouse = createCompanySearchResult({
    name: "COMPAGNIE INDUSTRIELLE DU ROULEMENT (CIR)",
    official_name: "COMPAGNIE INDUSTRIELLE DU ROULEMENT",
    city: "TOULOUSE",
    department: "31",
    postal_code: "31000",
    siren: "570800375",
    siret: "57080037500067",
  });
  const cityNameNoise = createCompanySearchResult({
    name: "TOULOUSE",
    official_name: "TOULOUSE",
    city: "MONTARDON",
    department: "64",
    postal_code: "64121",
    siren: "530513951",
    siret: "53051395100026",
  });
  const fetchPage = (
    request: CompanySearchPageRequest,
  ): Promise<DirectoryCompanySearchResult[]> => {
    if (request.query === "cir toulouse" && request.page === 1) {
      return Promise.resolve([cirToulouse]);
    }

    if (request.query === "toulouse" && request.page === 1) {
      return Promise.resolve([cityNameNoise]);
    }

    return Promise.resolve([]);
  };

  const result = await executeCompanySearch(
    { query: "cir toulouse" },
    fetchPage,
    () => "fatal",
  );

  assertEquals(result.companies[0]?.siren, "570800375");
});

Deno.test("executeCompanySearch keeps cir results compatible with the tRPC output schema", async () => {
  const cir = createCompanySearchResult({
    name: "CIR",
    official_name: "COMPAGNIE INDUSTRIELLE DU ROULEMENT",
    city: "AUBERGENVILLE",
    department: "78",
    postal_code: "78410",
    siren: "302475777",
    siret: "30247577700035",
    naf_code: "4669B",
  });
  const fetchPage = (
    request: CompanySearchPageRequest,
  ): Promise<DirectoryCompanySearchResult[]> => {
    assertEquals(request.query, "cir");
    assertEquals(request.page, 1);
    return Promise.resolve([cir]);
  };

  const result = await executeCompanySearch(
    { query: "cir" },
    fetchPage,
    () => "fatal",
  );
  const parsed = directoryCompanySearchResponseSchema.safeParse({
    request_id: "req-cir",
    ok: true,
    companies: result.companies,
  });

  assertEquals(result.companies[0]?.siren, "302475777");
  assertEquals(parsed.success, true);
});

Deno.test("executeCompanySearch filters by head office when requested", async () => {
  const headOffice = createCompanySearchResult({
    name: "SIEMENS SAS",
    siren: "562016774",
    siret: "56201677400020",
    is_head_office: true,
  });
  const secondary = createCompanySearchResult({
    name: "SIEMENS SAS",
    siren: "562016774",
    siret: "56201677400038",
    is_head_office: false,
  });
  const fetchPage = (
    request: CompanySearchPageRequest,
  ): Promise<DirectoryCompanySearchResult[]> => {
    assertEquals(request.query, "siemens");
    return Promise.resolve([headOffice, secondary]);
  };

  const result = await executeCompanySearch(
    { query: "siemens", head_office: "secondary" },
    fetchPage,
    () => "fatal",
  );

  assertEquals(result.companies.length, 1);
  assertEquals(result.companies[0]?.siret, "56201677400038");
});

Deno.test("executeCompanySearch expands common elec abbreviation before giving up", async () => {
  const expectedCompany = createCompanySearchResult({
    name: "AQUITAINE ELECTRIQUE",
    official_name: "AQUITAINE ELECTRIQUE",
    city: "LOUPIAC-DE-LA-REOLE",
    department: "33",
    postal_code: "33190",
    siren: "444541890",
    siret: "44454189000018",
  });
  const noisyExactResult = createCompanySearchResult({
    name: "ELEC AQUITAINE",
    official_name: "ELEC AQUITAINE",
    city: "LE HAILLAN",
    department: "33",
    postal_code: "33185",
    siren: "435091616",
    siret: "43509161600021",
  });
  const broadAquitaineNoise = createCompanySearchResult({
    name: "FEDERATION NOUVELLE-AQUITAINE SCOP-BTP",
    official_name: "FEDERATION NOUVELLE-AQUITAINE SCOP-BTP",
    city: "ARTIGUES-PRES-BORDEAUX",
    department: "33",
    postal_code: "33370",
    siren: "884076670",
    siret: "88407667000012",
  });
  const fetchPage = (
    request: CompanySearchPageRequest,
  ): Promise<DirectoryCompanySearchResult[]> => {
    if (request.query === "aquitaine elec") {
      return Promise.resolve([broadAquitaineNoise, noisyExactResult]);
    }

    if (request.query === "aquitaine electrique") {
      return Promise.resolve([expectedCompany]);
    }

    return Promise.resolve([]);
  };

  const result = await executeCompanySearch(
    { query: "aquitaine elec", department: "33" },
    fetchPage,
    () => "fatal",
  );

  assertEquals(
    result.attempts.some((attempt) => attempt.query === "aquitaine electrique"),
    true,
  );
  assertEquals(
    result.companies.some((company) => company.siren === "444541890"),
    true,
  );
  assertEquals(result.companies[0]?.siren, "444541890");
});

Deno.test("fetchEnterpriseApiSearchResponse tolerates partial official payloads before mapping", async () => {
  await withFetchStub(
    Response.json({
      results: [{
        siren: "562016774",
        nom_complet: null,
        nom_raison_sociale: "SIEMENS",
        sigle: null,
        activite_principale: "46.69B",
        activite_principale_naf25: "46.69Y",
        caractere_employeur: "O",
        nombre_etablissements: "12",
        nombre_etablissements_ouverts: "9",
        matching_etablissements: null,
        siege: {
          siret: "56201677400020",
          adresse: "40 AVENUE DES FRUITIERS",
          code_postal: "93210",
          libelle_commune: "SAINT-DENIS",
          departement: "93",
          region: "ILE-DE-FRANCE",
          est_siege: "true",
          activite_principale: "43.21A",
          activite_principale_naf25: "43.21G",
          ancien_siege: "false",
          etat_administratif: "A",
          liste_enseignes: [null, "SIEMENS"],
        },
        dirigeants: null,
      }],
    }),
    async () => {
      const payload = await fetchEnterpriseApiSearchResponse(
        "https://example.test/search",
      );
      const companies = payload.results.flatMap(mapEnterpriseApiCompany);

      assertEquals(companies[0]?.name, "SIEMENS");
      assertEquals(companies[0]?.is_head_office, true);
      assertEquals(companies[0]?.is_former_head_office, false);
      assertEquals(companies[0]?.company_establishments_count, 12);
      assertEquals(companies[0]?.naf_code, "43.21G");
      assertEquals(companies[0]?.brands, ["SIEMENS"]);
    },
  );
});

Deno.test("fetchEnterpriseApiSearchResponse maps official rate limits explicitly", async () => {
  await withFetchStub(
    new Response("rate limit", { status: 429 }),
    async () => {
      const error = await assertRejects(
        () => fetchEnterpriseApiSearchResponse("https://example.test/search"),
        Error,
        "Le service entreprises est temporairement indisponible.",
      );

      assertEquals(readErrorProperty(error, "status"), 429);
      assertEquals(readErrorProperty(error, "code"), "RATE_LIMITED");
    },
  );
});

Deno.test("fetchEnterpriseApiSearchResponse maps invalid official payloads with details", async () => {
  await withFetchStub(
    Response.json({ results: [{ nom_complet: "Sans SIREN" }] }),
    async () => {
      const error = await assertRejects(
        () => fetchEnterpriseApiSearchResponse("https://example.test/search"),
        Error,
        "Reponse invalide du service entreprises.",
      );

      assertEquals(readErrorProperty(error, "status"), 502);
      assertEquals(readErrorProperty(error, "code"), "REQUEST_FAILED");
    },
  );
});
