import type {
  DirectoryCompanyDetailsInput,
  DirectoryCompanySearchInput,
  DirectoryCompanySearchResult,
} from "../../../../shared/schemas/directory.schema.ts";
import type {
  DirectoryCompanyDetailsResponse,
  DirectoryCompanySearchResponse,
} from "../../../../shared/schemas/api-responses.ts";
import {
  type CompanySearchPageRequest,
  executeCompanySearch,
} from "../../../../shared/search/companySearch.ts";
import type { AuthContext, DbClient } from "../types.ts";
import { httpError } from "../middleware/errorHandler.ts";
import { ensureDataRateLimit } from "./dataAccess.ts";
import {
  buildCompanyDetailsUrl,
  buildCompanySearchUrl,
  fetchEnterpriseApiSearchResponse,
} from "./directoryCompanyApi.ts";
import { mapEnterpriseApiCompanyDetails } from "./directoryCompanyDetailsMapper.ts";
import { mapEnterpriseApiCompany } from "./directoryCompanySearchMapper.ts";

export { buildCompanySearchUrl } from "./directoryCompanyApi.ts";

const fetchCompanySearchPage = async (
  input: CompanySearchPageRequest,
): Promise<DirectoryCompanySearchResult[]> => {
  const payload = await fetchEnterpriseApiSearchResponse(
    buildCompanySearchUrl(input),
  );
  return payload.results.flatMap(mapEnterpriseApiCompany);
};

export const getDirectoryCompanySearch = async (
  _db: DbClient,
  authContext: AuthContext,
  requestId: string,
  input: DirectoryCompanySearchInput,
): Promise<DirectoryCompanySearchResponse> => {
  await ensureDataRateLimit("directory:company-search", authContext.userId);
  const result = await executeCompanySearch(
    input,
    fetchCompanySearchPage,
    (error) => {
      const code = typeof error === "object" && error !== null
        ? Reflect.get(error, "code")
        : null;
      return code === "RATE_LIMITED" ? "rate-limited" : "fatal";
    },
  );

  return {
    request_id: requestId,
    ok: true,
    companies: result.companies,
  };
};

export const getDirectoryCompanyDetails = async (
  _db: DbClient,
  authContext: AuthContext,
  requestId: string,
  input: DirectoryCompanyDetailsInput,
): Promise<DirectoryCompanyDetailsResponse> => {
  await ensureDataRateLimit("directory:company-details", authContext.userId);

  const payload = await fetchEnterpriseApiSearchResponse(
    buildCompanyDetailsUrl(input.siren),
  );
  const company = payload.results.find((entry) => entry.siren === input.siren);

  if (!company) {
    throw httpError(404, "NOT_FOUND", "Societe introuvable.");
  }

  return {
    request_id: requestId,
    ok: true,
    company: mapEnterpriseApiCompanyDetails(company),
  };
};
