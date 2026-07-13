import type { OpenRouterToolDefinition } from "./aiGovernance.ts";

export type AssistantReferenceIntentKind =
  | "segment_count"
  | "supplier_category_search"
  | "supplier_brand_count"
  | "supplier_brand_check"
  | "diff_analysis"
  | "anomaly_analysis"
  | "health_analysis"
  | "clarification"
  | "general_sql";

export type AssistantExecutionMode =
  | "deterministic_direct"
  | "bounded_provider"
  | "general_sql_fallback"
  | "clarification";

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
  clarification: [],
  general_sql: [
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

const extractKnownTerms = (value: string): string[] => [
  ...new Set(value.match(/\b(?:vfd|drives?|variateurs?)\b/g) ?? []),
];

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

const clarification = (): AssistantReferenceIntent => ({
  kind: "clarification",
  dimension: null,
  filters: {},
  executionMode: "clarification",
  clarification:
    "Souhaitez-vous analyser la famille CIR (FAM/FAM_LIB) ou la catégorie fabricant (CAT_FAB) ?",
});

export const parseAssistantReferenceIntent = (
  question: string,
): AssistantReferenceIntent => {
  const value = normalize(question);
  const terms = extractKnownTerms(value);
  const catFab = hasCatFabDimension(value);
  const famCir = hasFamCirDimension(value);

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

  // Priorité métier : changements > anomalies > santé > référentiels textuels.
  if (
    /\b(?:changements?|differences?|diff|augment(?:e|es|ation)|hausses?|baiss(?:e|es)|remises?|prix|tarifs?)\b/
      .test(value)
  ) {
    if (/\bfamilles?\b/.test(value) && !catFab && !famCir) {
      return clarification();
    }
    return {
      kind: "diff_analysis",
      dimension: catFab ? "cat_fab" : famCir ? "fam_cir" : "diff",
      filters: {},
      executionMode: "bounded_provider",
      clarification: null,
    };
  }
  if (/\banomal(?:ie|ies|y)\b|\bcorriger\s+(?:les?\s+)?anomal/.test(value)) {
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
  if (catFab && terms.length > 0) {
    return {
      kind: "supplier_category_search",
      dimension: "cat_fab",
      filters: { terms, mode: "any" },
      executionMode: "deterministic_direct",
      clarification: null,
    };
  }
  if (/\bfamilles?\b/.test(value) && !catFab && !famCir) return clarification();
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
