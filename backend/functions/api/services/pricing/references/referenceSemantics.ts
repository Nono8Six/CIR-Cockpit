const BRAND_ALIASES: Readonly<Record<string, string>> = {
  FEST: "FEST",
  FESTO: "FEST",
  ROCK: "ROCK",
  ROCKWELL: "ROCK",
};

const TERM_EXPANSIONS: Readonly<Record<string, readonly string[]>> = {
  drive: ["drive", "drives", "variateur", "vfd"],
  drives: ["drives", "drive", "variateur", "vfd"],
  variateur: ["variateur", "drive", "drives", "vfd"],
  vfd: ["vfd", "drive", "drives", "variateur"],
};

const normalizeToken = (value: string): string =>
  value.trim().replace(/\s+/g, " ").normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

export const normalizePricingReferenceBrand = (value: string): string => {
  const normalized = normalizeToken(value).toUpperCase();
  return BRAND_ALIASES[normalized] ?? normalized;
};

export const normalizePricingReferenceBrands = (
  values: readonly string[] | undefined,
): string[] => [
  ...new Set(
    (values ?? []).map(normalizePricingReferenceBrand).filter(Boolean),
  ),
];

export const normalizePricingReferenceSearchTerm = (value: string): string => {
  return value.trim().replace(/\s+/g, " ").normalize("NFC").toLowerCase();
};

export const normalizePricingReferenceSearchTerms = (
  values: readonly string[],
): string[] => [
  ...new Set(values.map(normalizePricingReferenceSearchTerm).filter(Boolean)),
];

export type PricingReferenceSearchTerms = {
  requested_terms: string[];
  canonical_terms: string[];
  query_terms: string[];
};

export const expandPricingReferenceSearchTerms = (
  values: readonly string[],
): PricingReferenceSearchTerms => {
  const requestedTerms = normalizePricingReferenceSearchTerms(values);
  const canonicalTerms = requestedTerms.map((value) => {
    const lookup = normalizeToken(value).toLowerCase();
    return lookup === "drives" ? "drive" : lookup;
  });
  const queryTerms = requestedTerms.flatMap((value) => {
    const lookup = normalizeToken(value).toLowerCase();
    return TERM_EXPANSIONS[lookup] ?? [value];
  });
  return {
    requested_terms: [...new Set(requestedTerms)],
    canonical_terms: [...new Set(canonicalTerms)],
    query_terms: [...new Set(queryTerms)],
  };
};

export const escapePricingReferenceLikeTerm = (value: string): string =>
  value.replace(/[\\%_]/g, "\\$&");
