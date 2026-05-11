import type { DirectoryCompanySearchInput, DirectoryCompanySearchResult } from '../schemas/directory.schema.ts';

const COMPANY_SEARCH_IGNORED_TOKENS = new Set([
  'cir',
  'sas',
  'sasu',
  'sarl',
  'sa',
  'eurl',
  'holding',
  'groupe',
  'societe',
  'ste'
]);

const COMPANY_SEARCH_CONTEXT_IGNORED_TOKENS = new Set([
  ...COMPANY_SEARCH_IGNORED_TOKENS,
  'entreprise',
  'entreprises',
  'service',
  'services',
  'solution',
  'solutions',
  'travaux',
  'public',
  'publics',
  'general'
]);

const DEFAULT_RESPONSE_PAGE = 1;
const DEFAULT_RESPONSE_PAGE_SIZE = 20;
const EXACT_QUERY_PAGE_SIZE = 10;
const CITY_FILTER_QUERY_PAGE_SIZE = 10;
const EXPANDED_QUERY_PAGE_SIZE = 25;
const CONTEXTUAL_QUERY_PAGE_SIZE = 10;
const CONTEXTUAL_QUERY_MIN_OCCURRENCES = 2;
const CONTEXTUAL_QUERY_MAX_TOKENS = 3;
const HIGH_CONFIDENCE_SCORE = 84;
const SHORT_TRAILING_ANCHOR_PAGES = [1, 2, 3];

export type CompanySearchQueryKind =
  | 'exact'
  | 'compound'
  | 'acronym'
  | 'contextual'
  | 'anchor'
  | 'primary'
  | 'secondary';
export type CompanySearchErrorKind = 'fatal' | 'rate-limited';

export interface CompanySearchPageRequest {
  query: string;
  department?: string;
  city?: string;
  page: number;
  per_page: number;
}

export interface CompanySearchAttempt {
  kind: CompanySearchQueryKind;
  query: string;
  page: number;
  per_page: number;
}

export interface CompanySearchExecutionResult {
  companies: DirectoryCompanySearchResult[];
  attempts: CompanySearchAttempt[];
}

export type CompanySearchPageFetcher = (
  request: CompanySearchPageRequest
) => Promise<DirectoryCompanySearchResult[]>;

export type CompanySearchErrorClassifier = (error: unknown) => CompanySearchErrorKind;

type CompanySearchPlan = {
  kind: CompanySearchQueryKind;
  query: string;
  pages: number[];
  perPage: number;
};

type ScoredMatch = {
  score: number;
  allTokensMatched: boolean;
  orderedMatch: boolean;
  startsWithSequence: boolean;
  collapsedStartsWithSequence: boolean;
  matchedFirstToken: boolean;
  matchedLastToken: boolean;
  trailingSequenceLength: number;
};

type CollectedCompany = {
  company: DirectoryCompanySearchResult;
  score: number;
  sourceKind: CompanySearchQueryKind;
  insertionOrder: number;
};

type GroupedCompanySlice = {
  key: string;
  companies: DirectoryCompanySearchResult[];
};

const COMPANY_SEARCH_SOURCE_PRIORITY: Record<CompanySearchQueryKind, number> = {
  exact: 0,
  compound: 0,
  acronym: 2,
  contextual: 3,
  anchor: 4,
  primary: 5,
  secondary: 6
};

const normalizeSearchText = (value: string | null | undefined): string =>
  (value ?? '')
    .normalize('NFD')
    .replace(/\p{Diacritic}+/gu, '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();

const toTokens = (value: string | null | undefined): string[] =>
  normalizeSearchText(value)
    .split(' ')
    .filter((token) => token.length > 0);

const toMeaningfulTokens = (value: string): string[] =>
  toTokens(value).filter((token) => !COMPANY_SEARCH_IGNORED_TOKENS.has(token));

const collapseTokens = (tokens: string[]): string =>
  tokens.join('');

const isCompactAlphaSingleTokenQuery = (
  tokens: string[],
  minimumLength = 2,
  maximumLength = 6
): boolean =>
  tokens.length === 1
  && /^[a-z]+$/i.test(tokens[0] ?? '')
  && (tokens[0]?.length ?? 0) >= minimumLength
  && (tokens[0]?.length ?? 0) <= maximumLength;

const isShortAlphaSingleTokenQuery = (tokens: string[]): boolean =>
  isCompactAlphaSingleTokenQuery(tokens, 4, 6);

const extractCompactAcronymTokens = (value: string | null | undefined): string[] => {
  const compactTokens: string[] = [];
  let currentSequence: string[] = [];

  for (const token of toTokens(value)) {
    if (/^[a-z]$/i.test(token)) {
      currentSequence.push(token);
      continue;
    }

    if (currentSequence.length >= 2) {
      compactTokens.push(currentSequence.join(''));
    }
    currentSequence = [];
  }

  if (currentSequence.length >= 2) {
    compactTokens.push(currentSequence.join(''));
  }

  return compactTokens;
};

const buildCompanyBusinessWords = (company: DirectoryCompanySearchResult): string[] =>
  Array.from(
    new Set(
      [buildLabel(company), company.name, company.commercial_name, ...company.brands]
        .filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
        .flatMap((value) => [...toTokens(value), ...extractCompactAcronymTokens(value)])
    )
  );

const buildCompanyLocationWords = (company: DirectoryCompanySearchResult): string[] =>
  Array.from(
    new Set(
      [company.city, company.postal_code, company.department, company.address]
        .filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
        .flatMap((value) => toTokens(value))
    )
  );

type CompanySearchTokenMatch = {
  exact: boolean;
  index: number;
  location: boolean;
};

const findCompanySearchTokenMatch = (
  token: string,
  businessWords: string[],
  locationWords: string[]
): CompanySearchTokenMatch | null => {
  const businessExactIndex = businessWords.findIndex((word) => word === token);
  if (businessExactIndex >= 0) {
    return { exact: true, index: businessExactIndex, location: false };
  }

  const businessPrefixIndex = businessWords.findIndex((word) => word.startsWith(token));
  if (businessPrefixIndex >= 0) {
    return { exact: false, index: businessPrefixIndex, location: false };
  }

  const locationOffset = businessWords.length;
  const locationExactIndex = locationWords.findIndex((word) => word === token);
  if (locationExactIndex >= 0) {
    return { exact: true, index: locationOffset + locationExactIndex, location: true };
  }

  const locationPrefixIndex = locationWords.findIndex((word) => word.startsWith(token));
  if (locationPrefixIndex >= 0) {
    return { exact: false, index: locationOffset + locationPrefixIndex, location: true };
  }

  return null;
};

const matchesInputCity = (
  company: DirectoryCompanySearchResult,
  input: DirectoryCompanySearchInput
): boolean => {
  const normalizedInputCity = normalizeSearchText(input.city);
  if (normalizedInputCity.length === 0) {
    return true;
  }

  const normalizedCity = normalizeSearchText(company.city);
  return normalizedCity.startsWith(normalizedInputCity);
};

const matchesInputDepartment = (
  company: DirectoryCompanySearchResult,
  input: DirectoryCompanySearchInput
): boolean =>
  input.department
    ? company.department === input.department || company.postal_code?.startsWith(input.department) === true
    : false;

const buildSearchPlans = (input: DirectoryCompanySearchInput): CompanySearchPlan[] => {
  const normalizedQuery = normalizeSearchText(input.query);
  const queryTokens = toTokens(input.query);
  const alphaTokens = toMeaningfulTokens(input.query).filter((token) => !/^\d+$/.test(token));
  const minExpandedTokenLength = input.department ? 2 : 3;
  const isAcronymCandidate = isShortAlphaSingleTokenQuery(queryTokens);
  const shouldQueryCompoundName = queryTokens.length >= 2
    && queryTokens.length <= 3
    && queryTokens.some((token) => token.length <= 5)
    && queryTokens.every((token) => /^[\p{L}\p{N}]+$/u.test(token));
  const lastAlphaToken = alphaTokens.at(-1) ?? '';
  const shouldExpandBroadSecondaryPlans = alphaTokens.length >= 3 && lastAlphaToken.length >= 4;
  const shouldLimitAnchorPages = alphaTokens.length === 2
    && lastAlphaToken.length > 0
    && lastAlphaToken.length < 5;
  const exactPages = input.city?.trim()
    ? [1, 2]
    : [input.page ?? DEFAULT_RESPONSE_PAGE];
  const exactPerPage = input.city?.trim()
    ? Math.max(input.per_page ?? EXACT_QUERY_PAGE_SIZE, CITY_FILTER_QUERY_PAGE_SIZE)
    : input.per_page ?? EXACT_QUERY_PAGE_SIZE;
  const uniquePlans = new Map<string, CompanySearchPlan>();
  const addPlan = (plan: CompanySearchPlan): void => {
    const normalizedPlanQuery = normalizeSearchText(plan.query);
    if (normalizedPlanQuery.length < 1) {
      return;
    }

    const key = normalizedPlanQuery;
    if (uniquePlans.has(key)) {
      return;
    }

    uniquePlans.set(key, { ...plan, query: normalizedPlanQuery });
  };

  addPlan({
    kind: 'exact',
    query: normalizedQuery,
    pages: exactPages,
    perPage: exactPerPage
  });

  if (shouldQueryCompoundName) {
    addPlan({
      kind: 'compound',
      query: collapseTokens(queryTokens),
      pages: exactPages,
      perPage: exactPerPage
    });
  }

  if (isAcronymCandidate) {
    addPlan({
      kind: 'acronym',
      query: queryTokens[0].split('').join(' '),
      pages: [1, 2],
      perPage: Math.max(input.per_page ?? EXACT_QUERY_PAGE_SIZE, CITY_FILTER_QUERY_PAGE_SIZE)
    });
  }

  const anchorQuery = queryTokens.length > 1 ? queryTokens.slice(0, -1).join(' ') : '';
  if (anchorQuery.length >= minExpandedTokenLength) {
    addPlan({
      kind: 'anchor',
      query: anchorQuery,
      pages: shouldLimitAnchorPages ? SHORT_TRAILING_ANCHOR_PAGES : [1, 2, 3, 4, 5, 6, 7, 8],
      perPage: EXPANDED_QUERY_PAGE_SIZE
    });
  }

  const primaryToken = alphaTokens[0] ?? '';
  if (primaryToken.length >= minExpandedTokenLength) {
    addPlan({
      kind: 'primary',
      query: primaryToken,
      pages: [1, 2, 3, 4],
      perPage: EXPANDED_QUERY_PAGE_SIZE
    });
  }

  for (const token of alphaTokens.slice(1)) {
    if (token.length < 4) {
      continue;
    }

    addPlan({
      kind: 'secondary',
      query: token,
      pages: shouldExpandBroadSecondaryPlans && token !== lastAlphaToken
        ? [1, 2, 3, 4]
        : [1, 2],
      perPage: EXPANDED_QUERY_PAGE_SIZE
    });
  }

  return Array.from(uniquePlans.values());
};

const buildCompanyKey = (company: DirectoryCompanySearchResult): string =>
  company.siret
    ?? (company.siren ? `siren:${company.siren}` : [company.official_name ?? company.name, company.city ?? '', company.address ?? ''].join('|'));

const buildCompanyGroupKey = (company: DirectoryCompanySearchResult): string =>
  company.siren
    ?? company.official_name
    ?? company.name;

const buildLabel = (company: DirectoryCompanySearchResult): string =>
  company.official_name ?? company.name;

type ContextualTokenStats = {
  occurrences: number;
  score: number;
};

const buildContextualSearchPlans = (
  input: DirectoryCompanySearchInput,
  collectedCompanies: Map<string, CollectedCompany>
): CompanySearchPlan[] => {
  const queryTokens = toTokens(input.query);
  if (!isCompactAlphaSingleTokenQuery(queryTokens) || (!input.department && !input.city)) {
    return [];
  }

  const groupedCompanies = new Map<string, DirectoryCompanySearchResult>();
  for (const entry of collectedCompanies.values()) {
    if (entry.sourceKind !== 'exact') {
      continue;
    }

    const groupKey = buildCompanyGroupKey(entry.company);
    if (!groupedCompanies.has(groupKey)) {
      groupedCompanies.set(groupKey, entry.company);
    }
  }

  if (groupedCompanies.size < 2) {
    return [];
  }

  const ignoredTokens = new Set([
    ...queryTokens,
    ...toTokens(input.city),
    ...toTokens(input.department)
  ]);
  const tokenStats = new Map<string, ContextualTokenStats>();

  for (const company of groupedCompanies.values()) {
    const labelTokens = toMeaningfulTokens(buildLabel(company));
    const uniqueCompanyTokens = new Set(
      buildCompanyBusinessWords(company).filter((token) =>
        token.length >= 4
        && !/^\d+$/.test(token)
        && !ignoredTokens.has(token)
        && !COMPANY_SEARCH_CONTEXT_IGNORED_TOKENS.has(token)
      )
    );

    if (uniqueCompanyTokens.size === 0) {
      continue;
    }

    const companyWeight = 1
      + (matchesInputCity(company, input) ? 1 : 0)
      + (matchesInputDepartment(company, input) ? 0.5 : 0);

    for (const token of uniqueCompanyTokens) {
      const stats = tokenStats.get(token) ?? { occurrences: 0, score: 0 };
      const isLeadToken = labelTokens.slice(0, 3).includes(token);
      tokenStats.set(token, {
        occurrences: stats.occurrences + 1,
        score: stats.score + companyWeight + (isLeadToken ? 0.75 : 0)
      });
    }
  }

  return Array.from(tokenStats.entries())
    .filter(([, stats]) => stats.occurrences >= CONTEXTUAL_QUERY_MIN_OCCURRENCES)
    .sort((left, right) =>
      right[1].occurrences - left[1].occurrences
      || right[1].score - left[1].score
      || left[0].localeCompare(right[0], 'fr')
    )
    .slice(0, CONTEXTUAL_QUERY_MAX_TOKENS)
    .map(([token]) => ({
      kind: 'contextual',
      query: `${normalizeSearchText(input.query)} ${token}`,
      pages: [1, 2],
      perPage: Math.max(input.per_page ?? CONTEXTUAL_QUERY_PAGE_SIZE, CITY_FILTER_QUERY_PAGE_SIZE)
    }));
};

const buildTrailingCompletionSearchPlans = (
  input: DirectoryCompanySearchInput,
  collectedCompanies: Map<string, CollectedCompany>
): CompanySearchPlan[] => {
  const queryTokens = toMeaningfulTokens(input.query).filter((token) => !/^\d+$/.test(token));
  if (queryTokens.length < 2) {
    return [];
  }

  const trailingPrefix = queryTokens.at(-1) ?? '';
  if (trailingPrefix.length === 0 || trailingPrefix.length >= 5) {
    return [];
  }

  const stableTokens = queryTokens.slice(0, -1);
  const collapsedStableTokens = collapseTokens(stableTokens);
  if (collapsedStableTokens.length < 3) {
    return [];
  }

  const groupedCompanies = new Map<string, CollectedCompany>();
  for (const entry of collectedCompanies.values()) {
    if (!['exact', 'anchor', 'primary'].includes(entry.sourceKind)) {
      continue;
    }

    const groupKey = buildCompanyGroupKey(entry.company);
    const existingEntry = groupedCompanies.get(groupKey);
    if (!existingEntry || existingEntry.score < entry.score) {
      groupedCompanies.set(groupKey, entry);
    }
  }

  if (groupedCompanies.size < 2) {
    return [];
  }

  const ignoredTokens = new Set([
    ...queryTokens,
    ...toTokens(input.city),
    ...toTokens(input.department)
  ]);
  const tokenStats = new Map<string, ContextualTokenStats>();

  for (const entry of groupedCompanies.values()) {
    const label = buildLabel(entry.company);
    const normalizedLabel = normalizeSearchText(label);
    const labelTokens = toMeaningfulTokens(label);
    const collapsedLabelTokens = collapseTokens(labelTokens);
    const containsStableTokens = normalizedLabel.includes(stableTokens.join(' '))
      || collapsedLabelTokens.includes(collapsedStableTokens);

    if (!containsStableTokens) {
      continue;
    }

    const candidateTokens = new Set(
      labelTokens.filter((token) =>
        token.length >= 4
        && token.startsWith(trailingPrefix)
        && !ignoredTokens.has(token)
        && !COMPANY_SEARCH_CONTEXT_IGNORED_TOKENS.has(token)
      )
    );

    if (candidateTokens.size === 0) {
      continue;
    }

    const companyWeight = 1
      + (matchesInputDepartment(entry.company, input) ? 1 : 0)
      + (matchesInputCity(entry.company, input) ? 1 : 0)
      + (entry.sourceKind === 'exact' ? 0.5 : 0);

    for (const token of candidateTokens) {
      const stats = tokenStats.get(token) ?? { occurrences: 0, score: 0 };
      tokenStats.set(token, {
        occurrences: stats.occurrences + 1,
        score: stats.score + companyWeight
      });
    }
  }

  return Array.from(tokenStats.entries())
    .filter(([, stats]) => stats.occurrences >= 2)
    .sort((left, right) =>
      right[1].occurrences - left[1].occurrences
      || right[1].score - left[1].score
      || left[0].localeCompare(right[0], 'fr')
    )
    .slice(0, 2)
    .flatMap(([token]) => {
      const completedTokens = [...stableTokens, token];
      return [
        {
          kind: 'contextual' as const,
          query: collapseTokens(completedTokens),
          pages: [1, 2],
          perPage: Math.max(input.per_page ?? CONTEXTUAL_QUERY_PAGE_SIZE, CITY_FILTER_QUERY_PAGE_SIZE)
        },
        {
          kind: 'contextual' as const,
          query: completedTokens.join(' '),
          pages: [1, 2],
          perPage: Math.max(input.per_page ?? CONTEXTUAL_QUERY_PAGE_SIZE, CITY_FILTER_QUERY_PAGE_SIZE)
        }
      ];
    });
};

const scoreCompany = (
  company: DirectoryCompanySearchResult,
  input: DirectoryCompanySearchInput
): ScoredMatch => {
  const meaningfulTokens = toMeaningfulTokens(input.query);
  const fallbackTokens = toTokens(input.query);
  const effectiveTokens = meaningfulTokens.length > 1
    ? meaningfulTokens
    : meaningfulTokens.filter((token) => token.length >= 2);
  const scoredTokens = effectiveTokens.length > 0
    ? effectiveTokens
    : fallbackTokens.length > 1
      ? fallbackTokens
      : fallbackTokens.filter((token) => token.length >= 2);
  const businessWords = buildCompanyBusinessWords(company);
  const locationWords = buildCompanyLocationWords(company);
  const normalizedLabel = normalizeSearchText(buildLabel(company));
  const normalizedCollapsedLabel = collapseTokens(toTokens(buildLabel(company)));
  const normalizedCity = normalizeSearchText(company.city);
  const normalizedInputCity = normalizeSearchText(input.city);
  const normalizedCollapsedQuery = collapseTokens(toTokens(input.query));

  if (scoredTokens.length === 0) {
    return {
      score: 0,
      allTokensMatched: false,
      orderedMatch: false,
      startsWithSequence: false,
      collapsedStartsWithSequence: false,
      matchedFirstToken: false,
      matchedLastToken: false,
      trailingSequenceLength: 0
    };
  }

  let lastMatchedIndex = -1;
  let exactMatches = 0;
  let prefixMatches = 0;
  let businessMatches = 0;
  let locationMatches = 0;
  let missingSignificantTokens = 0;
  let orderedMatch = true;
  const matchedIndexes: number[] = [];

  for (const token of scoredTokens) {
    const match = findCompanySearchTokenMatch(token, businessWords, locationWords);
    const matchedIndex = match?.index ?? -1;

    if (!match) {
      if (token.length >= 4) {
        missingSignificantTokens += 1;
      }
      orderedMatch = false;
      matchedIndexes.push(-1);
      continue;
    }

    if (match.exact) {
      exactMatches += 1;
    } else {
      prefixMatches += 1;
    }

    if (match.location) {
      locationMatches += 1;
    } else {
      businessMatches += 1;
    }

    if (matchedIndex < lastMatchedIndex) {
      orderedMatch = false;
    }

    lastMatchedIndex = matchedIndex;
    matchedIndexes.push(matchedIndex);
  }

  const allTokensMatched = exactMatches + prefixMatches === scoredTokens.length;
  const startsWithSequence = normalizedLabel.startsWith(normalizeSearchText(input.query));
  const collapsedStartsWithSequence = normalizedCollapsedQuery.length >= 6
    && !startsWithSequence
    && normalizedCollapsedLabel.startsWith(normalizedCollapsedQuery);
  const matchedFirstToken = businessWords[0]?.startsWith(scoredTokens[0] ?? '') ?? false;
  const matchedLastToken = matchedIndexes.at(-1) != null && (matchedIndexes.at(-1) ?? -1) >= 0;
  let trailingSequenceLength = 0;
  let previousMatchedIndex = Number.POSITIVE_INFINITY;

  for (let index = matchedIndexes.length - 1; index >= 0; index -= 1) {
    const matchedIndex = matchedIndexes[index] ?? -1;
    if (matchedIndex < 0 || matchedIndex >= previousMatchedIndex) {
      break;
    }

    trailingSequenceLength += 1;
    previousMatchedIndex = matchedIndex;
  }

  const departmentMatches = matchesInputDepartment(company, input);
  const cityMatches = normalizedInputCity.length > 0
    && normalizedCity.length > 0
    && normalizedCity.startsWith(normalizedInputCity);
  let score = 0;

  if (allTokensMatched) {
    score += 40;
  }

  if (orderedMatch && allTokensMatched) {
    score += 20;
  }

  if (matchedFirstToken) {
    score += 15;
  }

  if (matchedLastToken) {
    score += 18;
  }

  if (trailingSequenceLength >= 2) {
    score += 20;
  }

  score += exactMatches * 10;
  score += prefixMatches * 6;
  score += locationMatches * 12;

  if (businessMatches > 0 && locationMatches > 0) {
    score += 18;
  }

  if (startsWithSequence) {
    score += 8;
  }

  if (collapsedStartsWithSequence) {
    score += 160;
  }

  if (departmentMatches) {
    score += 8;
  }

  if (cityMatches) {
    score += 18;
  } else if (normalizedInputCity.length > 0 && normalizedCity.length > 0) {
    score -= 16;
  }

  const forgivenMissingTokens = collapsedStartsWithSequence
    ? missingSignificantTokens
    : trailingSequenceLength >= 2
      ? 1
      : 0;
  score -= Math.max(0, missingSignificantTokens - forgivenMissingTokens) * 12;

  if (allTokensMatched && !orderedMatch) {
    score -= 8;
  }

  return {
    score,
    allTokensMatched,
    orderedMatch,
    startsWithSequence,
    collapsedStartsWithSequence,
    matchedFirstToken,
    matchedLastToken,
    trailingSequenceLength
  };
};

const toMatchMetadata = (
  sourceKind: CompanySearchQueryKind,
  match: ScoredMatch
): Pick<DirectoryCompanySearchResult, 'match_quality' | 'match_explanation'> => {
  if (sourceKind === 'exact' && match.startsWithSequence && match.orderedMatch) {
    return {
      match_quality: 'exact',
      match_explanation: 'Correspondance exacte'
    };
  }

  if (sourceKind === 'acronym') {
    return {
      match_quality: 'close',
      match_explanation: 'Correspondance par sigle'
    };
  }

  if (sourceKind === 'compound') {
    return {
      match_quality: 'close',
      match_explanation: 'Correspondance par nom concatene'
    };
  }

  if (sourceKind === 'contextual') {
    return {
      match_quality: 'expanded',
      match_explanation: 'Resultat retrouve via recherche contextuelle'
    };
  }

  if (sourceKind === 'exact') {
    return {
      match_quality: 'close',
      match_explanation: match.allTokensMatched || match.matchedFirstToken
        ? 'Correspondance par prefixe'
        : 'Correspondance approchante'
    };
  }

  return {
    match_quality: 'expanded',
    match_explanation: 'Resultat retrouve via recherche elargie'
  };
};

const rankCompanies = (
  collectedCompanies: Map<string, CollectedCompany>,
  input: DirectoryCompanySearchInput
): DirectoryCompanySearchResult[] =>
  Array.from(collectedCompanies.values())
    .sort((left, right) => {
      const scoreDelta = right.score - left.score;
      const sourceDelta = COMPANY_SEARCH_SOURCE_PRIORITY[left.sourceKind]
        - COMPANY_SEARCH_SOURCE_PRIORITY[right.sourceKind];

      if (sourceDelta !== 0 && Math.abs(scoreDelta) <= 30) {
        return sourceDelta;
      }

      if (left.sourceKind === right.sourceKind && Math.abs(scoreDelta) <= 30) {
        return left.insertionOrder - right.insertionOrder;
      }

      return scoreDelta
        || sourceDelta
        || Number(right.company.is_head_office) - Number(left.company.is_head_office)
        || left.insertionOrder - right.insertionOrder
        || buildLabel(left.company).localeCompare(buildLabel(right.company), 'fr');
    })
    .map((entry) => {
      const metadata = toMatchMetadata(entry.sourceKind, scoreCompany(entry.company, input));
      return {
        ...entry.company,
        ...metadata
      };
    });

const sliceCompanies = (
  companies: DirectoryCompanySearchResult[],
  input: DirectoryCompanySearchInput
): DirectoryCompanySearchResult[] => {
  const page = input.page ?? DEFAULT_RESPONSE_PAGE;
  const pageSize = input.per_page ?? DEFAULT_RESPONSE_PAGE_SIZE;
  const groupedCompanies: GroupedCompanySlice[] = [];
  const groupIndexByKey = new Map<string, number>();

  for (const company of companies) {
    const groupKey = buildCompanyGroupKey(company);
    const existingIndex = groupIndexByKey.get(groupKey);
    if (existingIndex == null) {
      groupIndexByKey.set(groupKey, groupedCompanies.length);
      groupedCompanies.push({ key: groupKey, companies: [company] });
      continue;
    }

    groupedCompanies[existingIndex]?.companies.push(company);
  }

  const startIndex = (page - 1) * pageSize;
  return groupedCompanies
    .slice(startIndex, startIndex + pageSize)
    .flatMap((group) => group.companies);
};

const filterCompaniesByCity = (
  companies: DirectoryCompanySearchResult[],
  input: DirectoryCompanySearchInput
): DirectoryCompanySearchResult[] => {
  const normalizedInputCity = normalizeSearchText(input.city);
  if (normalizedInputCity.length === 0) {
    return companies;
  }

  return companies.filter((company) => matchesInputCity(company, input));
};

export const executeCompanySearch = async (
  input: DirectoryCompanySearchInput,
  fetchPage: CompanySearchPageFetcher,
  classifyError: CompanySearchErrorClassifier
): Promise<CompanySearchExecutionResult> => {
  const plans = buildSearchPlans(input);
  const mustRunAcronymPlan = isShortAlphaSingleTokenQuery(toTokens(input.query));
  const mustRunCompoundPlan = plans.some((plan) => plan.kind === 'compound');
  const mustResolveTrailingCompletion = (() => {
    const meaningfulTokens = toMeaningfulTokens(input.query).filter((token) => !/^\d+$/.test(token));
    const trailingToken = meaningfulTokens.at(-1) ?? '';
    return meaningfulTokens.length >= 2 && trailingToken.length > 0 && trailingToken.length < 5;
  })();
  const insertedPlanQueries = new Set(plans.map((plan) => normalizeSearchText(plan.query)));
  const attempts: CompanySearchAttempt[] = [];
  const collectedCompanies = new Map<string, CollectedCompany>();
  let insertionOrder = 0;
  let lastRateLimitError: unknown = null;
  let acronymPlanProcessed = false;
  let compoundPlanProcessed = !mustRunCompoundPlan;
  let contextualPlansInserted = false;
  let trailingCompletionPlansInserted = false;

  for (let planIndex = 0; planIndex < plans.length; planIndex += 1) {
    const plan = plans[planIndex];
    for (const page of plan.pages) {
      const request = {
        query: plan.query,
        department: input.department ?? undefined,
        city: input.city ?? undefined,
        page,
        per_page: plan.perPage
      } satisfies CompanySearchPageRequest;

      attempts.push({ kind: plan.kind, query: plan.query, page, per_page: plan.perPage });

      let companies: DirectoryCompanySearchResult[];
      try {
        companies = await fetchPage(request);
      } catch (error) {
        if (classifyError(error) === 'rate-limited') {
          lastRateLimitError = error;
          break;
        }

        throw error;
      }

      for (const company of companies) {
        const score = scoreCompany(company, input);
        const key = buildCompanyKey(company);
        const existing = collectedCompanies.get(key);

        if (existing) {
          if (existing.sourceKind !== 'exact' && plan.kind === 'exact') {
            collectedCompanies.set(key, { ...existing, company, sourceKind: plan.kind });
          }
          continue;
        }

        collectedCompanies.set(key, {
          company,
          score: score.score,
          sourceKind: plan.kind,
          insertionOrder
        });
        insertionOrder += 1;
      }

      const rankedCompanies = rankCompanies(collectedCompanies, input);
      const cityFilteredCompanies = filterCompaniesByCity(rankedCompanies, input);
      const topScore = Math.max(
        ...Array.from(collectedCompanies.values(), (entry) => entry.score),
        Number.NEGATIVE_INFINITY
      );
      const topCityScore = Math.max(
        ...Array.from(
          collectedCompanies.values(),
          (entry) => matchesInputCity(entry.company, input) ? entry.score : Number.NEGATIVE_INFINITY
        ),
        Number.NEGATIVE_INFINITY
      );

      const shouldWaitForAcronymPlan = mustRunAcronymPlan && !acronymPlanProcessed && plan.kind !== 'acronym';
      const shouldWaitForCompoundPlan = mustRunCompoundPlan && !compoundPlanProcessed && plan.kind !== 'compound';
      const shouldWaitForTrailingCompletion = mustResolveTrailingCompletion
        && !trailingCompletionPlansInserted
        && plan.kind !== 'contextual';

      if (shouldWaitForAcronymPlan || shouldWaitForCompoundPlan || shouldWaitForTrailingCompletion) {
        continue;
      }

      if (input.city?.trim()) {
        if (cityFilteredCompanies.length > 0 && topCityScore >= HIGH_CONFIDENCE_SCORE) {
          return {
            companies: sliceCompanies(cityFilteredCompanies, input),
            attempts
          };
        }
      } else if (topScore >= HIGH_CONFIDENCE_SCORE) {
        return {
          companies: sliceCompanies(rankedCompanies, input),
          attempts
        };
      }
    }

    if (plan.kind === 'acronym') {
      acronymPlanProcessed = true;
    }

    if (plan.kind === 'compound') {
      compoundPlanProcessed = true;
    }

    if (!contextualPlansInserted && plan.kind === 'exact' && !lastRateLimitError) {
      const contextualPlans = buildContextualSearchPlans(input, collectedCompanies)
        .filter((contextualPlan) => {
          const key = normalizeSearchText(contextualPlan.query);
          if (insertedPlanQueries.has(key)) {
            return false;
          }

          insertedPlanQueries.add(key);
          return true;
        });

      if (contextualPlans.length > 0) {
        plans.splice(planIndex + 1, 0, ...contextualPlans);
        contextualPlansInserted = true;
      }
    }

    if (
      mustResolveTrailingCompletion
      && !trailingCompletionPlansInserted
      && !lastRateLimitError
      && ['exact', 'anchor', 'primary'].includes(plan.kind)
    ) {
      const completionPlans = buildTrailingCompletionSearchPlans(input, collectedCompanies)
        .filter((completionPlan) => {
          const key = normalizeSearchText(completionPlan.query);
          if (insertedPlanQueries.has(key)) {
            return false;
          }

          insertedPlanQueries.add(key);
          return true;
        });

      if (completionPlans.length > 0) {
        plans.splice(planIndex + 1, 0, ...completionPlans);
        trailingCompletionPlansInserted = true;
      }
    }

    if (lastRateLimitError) {
      break;
    }
  }

  const rankedCompanies = rankCompanies(collectedCompanies, input);
  const cityFilteredCompanies = filterCompaniesByCity(rankedCompanies, input);
  const finalCompanies = input.city?.trim() ? cityFilteredCompanies : rankedCompanies;
  if (finalCompanies.length > 0) {
    return {
      companies: sliceCompanies(finalCompanies, input),
      attempts
    };
  }

  if (lastRateLimitError) {
    throw lastRateLimitError;
  }

  return {
    companies: [],
    attempts
  };
};
