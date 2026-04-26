import type { CompanySearchPageRequest } from "../../../../shared/search/companySearch.ts";
import { httpError } from "../middleware/errorHandler.ts";
import {
  type EnterpriseApiSearchResponse,
  enterpriseApiSearchResponseSchema,
} from "./directoryCompanySchemas.ts";

const COMPANY_SEARCH_URL = "https://recherche-entreprises.api.gouv.fr/search";
const COMPANY_SEARCH_TIMEOUT_MS = 6_000;

export const buildCompanySearchUrl = (
  input: CompanySearchPageRequest,
): string => {
  const url = new URL(COMPANY_SEARCH_URL);
  url.searchParams.set("q", input.query);
  url.searchParams.set("minimal", "true");
  url.searchParams.set("include", "siege,matching_etablissements");
  if (input.department) {
    url.searchParams.set("departement", input.department);
  }
  if (input.city) {
    url.searchParams.set("ville", input.city);
  }
  url.searchParams.set("page", String(input.page));
  url.searchParams.set("per_page", String(input.per_page));
  return url.toString();
};

export const buildCompanyDetailsUrl = (siren: string): string => {
  const url = new URL(COMPANY_SEARCH_URL);
  url.searchParams.set("q", siren);
  url.searchParams.set("page", "1");
  url.searchParams.set("per_page", "10");
  return url.toString();
};

export const fetchEnterpriseApiSearchResponse = async (
  requestUrl: string,
): Promise<EnterpriseApiSearchResponse> => {
  const controller = new AbortController();
  const timeoutId = setTimeout(
    () => controller.abort(),
    COMPANY_SEARCH_TIMEOUT_MS,
  );

  try {
    const response = await fetch(requestUrl, {
      headers: {
        Accept: "application/json",
        "User-Agent": "CIR-Cockpit/1.0",
      },
      signal: controller.signal,
    });

    if (response.status === 429) {
      throw httpError(
        429,
        "RATE_LIMITED",
        "Le service entreprises est temporairement indisponible. Reessayez.",
      );
    }

    if (!response.ok) {
      throw httpError(
        502,
        "REQUEST_FAILED",
        "Le service entreprises est indisponible.",
        `status=${response.status}`,
      );
    }

    const payload = await response.json();
    const parsed = enterpriseApiSearchResponseSchema.safeParse(payload);
    if (!parsed.success) {
      throw httpError(
        502,
        "REQUEST_FAILED",
        "Reponse invalide du service entreprises.",
        parsed.error.message,
      );
    }

    return parsed.data;
  } catch (error) {
    if (
      typeof error === "object" && error !== null && Reflect.get(error, "code")
    ) {
      throw error;
    }

    if (error instanceof DOMException && error.name === "AbortError") {
      throw httpError(
        504,
        "REQUEST_FAILED",
        "Le service entreprises a mis trop de temps a repondre.",
      );
    }

    throw httpError(
      502,
      "REQUEST_FAILED",
      "Impossible de contacter le service entreprises.",
      error instanceof Error ? error.message : undefined,
    );
  } finally {
    clearTimeout(timeoutId);
  }
};
