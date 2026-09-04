import { type SQL, sql } from "drizzle-orm";

const PRICING_REFERENCE_ACCENTED_CHARACTERS = "àáâäãåçèéêëìíîïñòóôöõùúûüýÿ";
const PRICING_REFERENCE_ASCII_CHARACTERS = "aaaaaaceeeeiiiinooooouuuuyy";

const BRAND_ALIASES: Readonly<Record<string, string>> = {
  FEST: "FEST",
  FESTO: "FEST",
  ROCK: "ROCK",
  ROCKWELL: "ROCK",
};

const normalizeToken = (value: string): string =>
  value.trim().replace(/\s+/g, " ").normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

export const normalizePricingReferenceLexicalText = (
  value: string,
): string => normalizeToken(value).toLowerCase();

export const foldPricingReferenceLexicalToken = (value: string): string => {
  const normalized = normalizePricingReferenceLexicalText(value);
  return normalized.length >= 5 && !/\d/u.test(normalized) &&
      /[sx]$/.test(normalized)
    ? normalized.slice(0, -1)
    : normalized;
};

export const tokenizePricingReferenceLexicalText = (
  value: string,
  minimumLength = 1,
): string[] =>
  normalizePricingReferenceLexicalText(value)
    .split(/[^\p{L}\p{N}]+/u)
    .filter((token) => token.length >= minimumLength)
    .map(foldPricingReferenceLexicalToken);

export const foldPricingReferenceLexicalText = (value: string): string =>
  tokenizePricingReferenceLexicalText(value).join(" ");

export const buildPricingReferenceLexicalLikePattern = (
  value: string,
  minimumTokenLength = 1,
): string | null => {
  const units = normalizePricingReferenceLexicalText(value).match(
    /[\p{L}\p{N}]+|[%_\\]/gu,
  ) ?? [];
  const patternUnits = units.flatMap((unit) => {
    if (/^[%_\\]$/.test(unit)) {
      return [escapePricingReferenceLikeTerm(unit)];
    }
    return unit.length >= minimumTokenLength
      ? [escapePricingReferenceLikeTerm(foldPricingReferenceLexicalToken(unit))]
      : [];
  });
  return patternUnits.length > 0 ? `%${patternUnits.join("%")}%` : null;
};

export const pricingReferenceFoldedSql = (expression: SQL): SQL =>
  sql`
  regexp_replace(
    translate(
      lower(coalesce(${expression}, '')),
      ${PRICING_REFERENCE_ACCENTED_CHARACTERS},
      ${PRICING_REFERENCE_ASCII_CHARACTERS}
    ),
    '\\m([[:alpha:]]{4,})[sx]\\M',
    '\\1',
    'g'
  )
`;

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
  const canonicalTerms = requestedTerms.map((value) =>
    normalizePricingReferenceLexicalText(value)
  );
  return {
    requested_terms: [...new Set(requestedTerms)],
    canonical_terms: [...new Set(canonicalTerms)],
    query_terms: [...new Set(requestedTerms)],
  };
};

export const escapePricingReferenceLikeTerm = (value: string): string =>
  value.replace(/[\\%_]/g, "\\$&");
