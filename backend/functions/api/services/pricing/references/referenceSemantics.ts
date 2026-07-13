const BRAND_ALIASES: Readonly<Record<string, string>> = {
  FEST: "FEST",
  FESTO: "FEST",
  ROCK: "ROCK",
  ROCKWELL: "ROCK",
};

const TERM_ALIASES: Readonly<Record<string, string>> = {
  drive: "drive",
  drives: "drive",
  variateur: "variateur",
  vfd: "variateur",
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
  const normalized = normalizeToken(value).toLowerCase();
  return TERM_ALIASES[normalized] ?? normalized;
};

export const normalizePricingReferenceSearchTerms = (
  values: readonly string[],
): string[] => [
  ...new Set(values.map(normalizePricingReferenceSearchTerm).filter(Boolean)),
];

export const escapePricingReferenceLikeTerm = (value: string): string =>
  value.replace(/[\\%_]/g, "\\$&");
