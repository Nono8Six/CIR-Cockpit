import type { OpenRouterToolDefinition } from "./aiGovernance.ts";

export type AssistantReferenceIntentKind =
  | "segment_count"
  | "supplier_category_search"
  | "supplier_brand_count"
  | "supplier_brand_check"
  | "diff_analysis"
  | "anomaly_analysis"
  | "health_analysis"
  | "schema_location"
  | "purchase_terms_ranking"
  | "security_refusal"
  | "out_of_scope"
  | "clarification"
  | "general_sql";

export type AssistantExecutionMode =
  | "deterministic_direct"
  | "bounded_provider"
  | "general_sql_fallback"
  | "clarification";

export const ASSISTANT_MODEL_POLICY = {
  bounded_provider: "deepseek/deepseek-v4-flash",
  general_sql_fallback: "deepseek/deepseek-v4-pro",
} as const satisfies Partial<Record<AssistantExecutionMode, string>>;

export type AssistantReferenceIntent = {
  kind: AssistantReferenceIntentKind;
  dimension:
    | "cat_fab"
    | "fam_cir"
    | "brand"
    | "diff"
    | "anomaly"
    | "import"
    | null;
  filters: Record<string, unknown>;
  executionMode: AssistantExecutionMode;
  clarification: string | null;
};

export const selectAssistantModelId = (
  executionMode: AssistantExecutionMode,
): string | null =>
  executionMode === "bounded_provider" ||
    executionMode === "general_sql_fallback"
    ? ASSISTANT_MODEL_POLICY[executionMode]
    : null;

export const ASSISTANT_INTENT_TOOL_POLICY: Readonly<
  Record<AssistantReferenceIntentKind, readonly string[]>
> = {
  segment_count: ["aggregate_segments"],
  supplier_category_search: ["search_supplier_categories"],
  supplier_brand_count: ["count_supplier_brands"],
  supplier_brand_check: ["check_brand_matches"],
  diff_analysis: ["get_diff_summary", "aggregate_diffs", "list_diffs"],
  anomaly_analysis: ["get_anomalies_summary", "list_anomalies"],
  health_analysis: ["list_imports", "get_import_details", "get_health_report"],
  schema_location: ["search_schema"],
  purchase_terms_ranking: ["rank_purchase_terms"],
  security_refusal: [],
  out_of_scope: [],
  clarification: [],
  general_sql: [
    "search_schema",
    "get_database_catalog",
    "describe_database_tables",
    "execute_readonly_sql",
  ],
};

const normalize = (value: string): string =>
  value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

const hasCatFabDimension = (value: string): boolean =>
  /\bcat[_ ]?fab\b|\bcategories?\s+(?:de\s+)?fabricant\b/.test(value);

const hasFamCirDimension = (value: string): boolean =>
  /\bfamilles?\s+cir\b|\bfam_lib\b|\bfam\b/.test(value);

const TERM_CLAUSE_PATTERNS = [
  /\b(?:avec|contenant|contient|contiennent|comprenant|comprend|comprennent|incluant|inclut|incluent)\s+(.+?)(?=\s+(?:dans|sur)\b|[?.!;]|$)/g,
  /\b(?:ont|a|ayant)\s+(.+?)\s+dans\s+(?:le\s+|la\s+|les\s+)?(?:cat[_ ]?fab|categories?\s+(?:de\s+)?fabricant)\b/g,
  /\b(?:propose|proposent|vend|vends|vendent|fabrique|fabriquent|distribue|distribuent)\s+(.+?)(?=\s+(?:dans|sur)\b|[?.!;]|$)/g,
] as const;

const hasSupplierProductRelation = (value: string): boolean =>
  /\bmarques?\b/.test(value) &&
  /\b(?:propose|proposent|vend|vends|vendent|fabrique|fabriquent|distribue|distribuent)\b/
    .test(value);

const extractSearchTerms = (value: string): string[] => {
  const terms: string[] = [];
  for (const pattern of TERM_CLAUSE_PATTERNS) {
    for (const match of value.matchAll(pattern)) {
      for (const part of match[1].split(/\s+(?:ou|et)\s+|[,/]/)) {
        const term = part
          .replace(
            /^(?:(?:des?|du|de\s+la|d['’]|les?|la|un|une)\s*)+/g,
            "",
          )
          .trim()
          .slice(0, 80);
        if (term.length > 0 && !terms.includes(term)) terms.push(term);
        if (terms.length === 8) return terms;
      }
    }
  }
  return terms;
};

const extractBrand = (value: string): string | null => {
  const patterns = [
    /\bchez\s+([a-z0-9][a-z0-9_-]*)/,
    /\b(?:marque\s+)?([a-z0-9][a-z0-9_-]*)\s+(?:a|avec)\s+(?:des?\s+)?cat[_ ]?fab\b/,
    /\bcategories?\s+(?:de\s+)?fabricant\s+([a-z0-9][a-z0-9_-]*)\b/,
  ];
  for (const pattern of patterns) {
    const candidate = value.match(pattern)?.[1];
    if (candidate && !["combien", "nombre", "marque"].includes(candidate)) {
      return candidate.toUpperCase();
    }
  }
  return null;
};

const extractSchemaTerms = (value: string): string[] => {
  const candidates = [
    value.match(/\bcolonne\s+([a-z0-9_]+)/)?.[1],
    value.match(
      /\b(?:stocke|stockee|stockees|trouve|trouvent)\s+(?:dans\s+)?(?:les?|la|des?)?\s*([a-z0-9_]+)/,
    )?.[1],
  ].filter((candidate): candidate is string => Boolean(candidate));
  if (/\bremises?\b/.test(value)) candidates.push("remise");
  return [
    ...new Set(
      candidates.map((candidate) =>
        candidate.endsWith("s") && candidate.length > 4
          ? candidate.slice(0, -1)
          : candidate
      ),
    ),
  ].slice(0, 8);
};

const extractPercentageThreshold = (value: string): number | null => {
  const match = value.match(
    /(?:superieur(?:e|es|s)?\s+a|plus\s+de|>)\s*(\d+(?:[.,]\d+)?)\s*%/,
  );
  if (!match) return null;
  const parsed = Number(match[1].replace(",", "."));
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
};

const clarification = (terms: string[] = []): AssistantReferenceIntent => ({
  kind: "clarification",
  dimension: null,
  filters: terms.length > 0 ? { terms, mode: "any" } : {},
  executionMode: "clarification",
  clarification:
    "Souhaitez-vous analyser la famille CIR (FAM/FAM_LIB) ou la catégorie fabricant (CAT_FAB) ?",
});

export const parseAssistantReferenceIntent = (
  question: string,
): AssistantReferenceIntent => {
  const value = normalize(question);
  const terms = extractSearchTerms(value);
  const catFab = hasCatFabDimension(value);
  const famCir = hasFamCirDimension(value);
  const asksFinancialRanking =
    /\b(?:top\s+\d+|les?\s+\d+\b.*\bavec\s+le\s+plus)\b/.test(value) &&
    /\bremises?\b/.test(value);
  const asksDiffSummary =
    /\b(?:resume|resumer|synthese|changements?)\b/.test(value) &&
    /\b(?:dernier\s+fichier\s+tarif|snapshot\s+precedent|par\s+rapport\s+au\s+dernier)\b/
      .test(value);
  const asksAnomalies = /\banomal(?:ie|ies|y)\b|\bcorriger\s+(?:les?\s+)?anomal/
    .test(value);
  const asksAnomalySummary = asksAnomalies &&
    /\b(?:nombre|combien|lignes?|sans|resume|resumer|synthese|fichiers?\s+import)/
      .test(value);
  const asksSchemaLocation =
    /\b(?:ou|dans\s+quelle\s+table)\b.*\b(?:stocke|stockee|stockees|trouve|trouvent)\b/
      .test(value) ||
    /\bcolonne\s+[a-z0-9_]+\b.*\b(?:inexistant|inexistante|existe|trie|tri)\b/
      .test(value) ||
    /\b(?:trie|tri)\b.*\bcolonne\s+[a-z0-9_]+\b/.test(value);

  if (
    /\b(?:ignore|oublie|contourne)\b.{0,80}\b(?:regles?|instructions?)\b/.test(
      value,
    ) ||
    /\b(?:revele|affiche|donne)\b.{0,50}\b(?:cles?|secrets?|tokens?|mots?\s+de\s+passe)\b/
      .test(value) ||
    /\b(?:supprime|suppression|delete|drop|truncate|insert|update)\b.{0,50}\bsql\b/
      .test(value)
  ) {
    return {
      kind: "security_refusal",
      dimension: null,
      filters: {},
      executionMode: "deterministic_direct",
      clarification: null,
    };
  }

  if (
    /\b(?:meteo|previsions?\s+meteo|temperature)\b/.test(value) ||
    /\bquel\s+temps\s+(?:fera|fait)\b/.test(value)
  ) {
    return {
      kind: "out_of_scope",
      dimension: null,
      filters: {},
      executionMode: "deterministic_direct",
      clarification: null,
    };
  }

  if (
    /\b(?:a\s+cite|citation|dans\s+(?:son|un)\s+(?:email|message))\b/.test(
      value,
    ) ||
    /\b(?:ne|pas)\s+(?:cherche|recherche|analyser).*\bcat[_ ]?fab\b/.test(value)
  ) {
    return {
      kind: "general_sql",
      dimension: null,
      filters: {},
      executionMode: "general_sql_fallback",
      clarification: null,
    };
  }

  if (asksFinancialRanking || asksSchemaLocation) {
    if (asksSchemaLocation) {
      return {
        kind: "schema_location",
        dimension: null,
        filters: { terms: extractSchemaTerms(value) },
        executionMode: "deterministic_direct",
        clarification: null,
      };
    }
    const rankingMatch = value.match(
      /\btop\s+(\d+)\s+cat[_ ]?fab\s+de\s+([a-z0-9][a-z0-9_-]*)\s+par\s+remise/,
    ) ?? value.match(
      /\btop\s+(\d+)\s+(?:des?\s+)?familles?\s+(?:de\s+)?produits?\s+(?:de|chez)\s+([a-z0-9][a-z0-9_-]*)\s+par\s+remise/,
    ) ?? value.match(
      /\b(?:les\s+)?(\d+)\s+cat[_ ]?fab\s+de\s+([a-z0-9][a-z0-9_-]*).*\bplus\s+de\s+remise/,
    );
    if (rankingMatch) {
      return {
        kind: "purchase_terms_ranking",
        dimension: "cat_fab",
        filters: {
          marque: rankingMatch[2].toUpperCase(),
          limit: Math.min(10, Math.max(1, Number(rankingMatch[1]))),
          metric: "remise_ha_pct",
          direction: "desc",
        },
        executionMode: "deterministic_direct",
        clarification: null,
      };
    }
    return {
      kind: "general_sql",
      dimension: null,
      filters: {},
      executionMode: "general_sql_fallback",
      clarification: null,
    };
  }

  // Une demande explicitement centrée sur les anomalies ne doit pas être
  // capturée par le seul mot « remise » présent dans sa description métier.
  if (
    asksAnomalies &&
    !/\b(?:changements?|differences?|diff)\b/.test(value)
  ) {
    return {
      kind: "anomaly_analysis",
      dimension: "anomaly",
      filters: asksAnomalySummary ? { summary: true } : {},
      executionMode: asksAnomalySummary
        ? "deterministic_direct"
        : "bounded_provider",
      clarification: null,
    };
  }

  // Priorité métier : changements > anomalies > santé > référentiels textuels.
  if (
    /\b(?:changements?|differences?|diff|augment(?:e|es|ation)|hausses?|baiss(?:e|es)|remises?|prix|tarifs?)\b/
      .test(value)
  ) {
    if (/\bfamilles?\b/.test(value) && !catFab && !famCir) {
      return clarification();
    }
    const thresholdPct = extractPercentageThreshold(value);
    const direction = /\bbaiss(?:e|es)\b/.test(value)
      ? "baisse"
      : /\b(?:hausses?|augment(?:e|es|ation))\b/.test(value)
      ? "hausse"
      : "any";
    const measure = /\bremises?\b/.test(value)
      ? "remise"
      : /\b(?:prix|tarifs?)\b/.test(value)
      ? "prix"
      : "any";
    const groupBy = catFab
      ? "categorie_fabricant"
      : famCir
      ? "famille_cir"
      : "changed_column";
    return {
      kind: "diff_analysis",
      dimension: catFab ? "cat_fab" : famCir ? "fam_cir" : "diff",
      filters: {
        ...(asksDiffSummary ? { summary: true } : {}),
        group_by: groupBy,
        measure,
        direction,
        ...(thresholdPct === null ? {} : { threshold_pct: thresholdPct }),
        limit: 20,
      },
      executionMode: thresholdPct !== null || asksDiffSummary
        ? "deterministic_direct"
        : "bounded_provider",
      clarification: null,
    };
  }
  if (asksAnomalies) {
    return {
      kind: "anomaly_analysis",
      dimension: "anomaly",
      filters: {},
      executionMode: "bounded_provider",
      clarification: null,
    };
  }
  if (
    /\b(?:etat\s+de\s+sante|sante\s+de\s+l[' ]?import|dernier\s+import|import\s+exploitable|fichier\s+(?:est\s+)?actif)\b/
      .test(value)
  ) {
    return {
      kind: "health_analysis",
      dimension: "import",
      filters: {},
      executionMode: "bounded_provider",
      clarification: null,
    };
  }

  const asksCount = /\b(?:combien|nombre|compter|comptage)\b/.test(value);
  if (asksCount && catFab) {
    const brandClause = value.match(
      /\bchez\s+(.+?)(?=\s+(?:dans|sur|pour)\b|[?.!,;:]|$)/,
    )?.[1];
    const marques = brandClause
      ? [
        ...new Set(
          (brandClause.match(/[a-z0-9][a-z0-9_-]*/g) ?? []).filter((item) =>
            !["la", "le", "les", "marque", "groupe"].includes(item)
          ).map((item) => item.toUpperCase()),
        ),
      ]
      : [extractBrand(value)].filter((item): item is string => item !== null);
    if (marques.length > 0) {
      return {
        kind: "segment_count",
        dimension: "cat_fab",
        filters: { metric: "distinct_cat_fab", marques },
        executionMode: "deterministic_direct",
        clarification: null,
      };
    }
  }
  if (
    asksCount && /\bmarques?\b/.test(value) &&
    /\b(?:differentes?|distinctes?)\b/.test(value) &&
    !/\bcontacts?|clients?\b/.test(value)
  ) {
    return {
      kind: "supplier_brand_count",
      dimension: "brand",
      filters: {},
      executionMode: "deterministic_direct",
      clarification: null,
    };
  }
  const brand = extractBrand(value);
  if (
    brand && catFab && terms.length > 0 &&
    /\b(?:est-ce|a-t-il|contien|avec)\b/.test(value)
  ) {
    return {
      kind: "supplier_brand_check",
      dimension: "cat_fab",
      filters: { marque: brand, terms, dimension: "cat_fab", mode: "any" },
      executionMode: "deterministic_direct",
      clarification: null,
    };
  }
  if (terms.length > 0 && hasSupplierProductRelation(value)) {
    return {
      kind: "supplier_category_search",
      dimension: "cat_fab",
      filters: { terms, mode: "any" },
      executionMode: "deterministic_direct",
      clarification: null,
    };
  }
  if (catFab && terms.length > 0) {
    return {
      kind: "supplier_category_search",
      dimension: "cat_fab",
      filters: { terms, mode: "any" },
      executionMode: "deterministic_direct",
      clarification: null,
    };
  }
  if (/\bfamilles?\b/.test(value) && !catFab && !famCir) {
    return clarification(terms);
  }
  return {
    kind: "general_sql",
    dimension: null,
    filters: {},
    executionMode: "general_sql_fallback",
    clarification: null,
  };
};

export const selectToolsForAssistantIntent = (
  intent: AssistantReferenceIntent,
  tools: OpenRouterToolDefinition[],
): OpenRouterToolDefinition[] => {
  const byName = new Map(tools.map((tool) => [tool.function.name, tool]));
  return ASSISTANT_INTENT_TOOL_POLICY[intent.kind]
    .map((name) => byName.get(name))
    .filter((tool): tool is OpenRouterToolDefinition => tool !== undefined);
};
