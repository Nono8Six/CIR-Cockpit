import { assertEquals } from "std/assert";

import type { DirectoryCompanySearchResult } from "../../../../shared/schemas/directory.schema.ts";
import {
  executeCompanySearch,
  type CompanySearchPageRequest,
} from "../../../../shared/search/companySearch.ts";

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
