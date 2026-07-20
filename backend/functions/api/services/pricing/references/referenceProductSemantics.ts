import { sql } from "drizzle-orm";

import type { DbClient } from "../../../types.ts";
import { escapePricingReferenceLikeTerm } from "./referenceSemantics.ts";

export const MAX_PRODUCT_CANDIDATE_GROUPS = 80;

export type ProductSearchPlan = {
  concept: string;
  positive_terms: string[];
  required_context: string[];
  excluded_context: string[];
  classification_hints: string[];
};

export type ProductCandidateGroup = {
  group_id: string;
  selection_kind: "classification_scope" | "direct_label";
  label: string;
  cir_path: string;
  matched_terms: string[];
  example_brands: string[];
  example_labels: string[];
  segment_rows: number;
  distinct_cat_fab: number;
  confirming_signals: string[];
  contradictory_signals: string[];
};

export type ProductCandidateIdentity = {
  kind: "direct_label";
  normalizedCatFab: string;
  cirPath: string;
} | {
  kind: "classification_scope";
  cirPath: string;
};

export type ProductCandidateSearchResult = {
  snapshot_id: string;
  concept: string;
  groups: ProductCandidateGroup[];
  truncated: boolean;
  identities: Map<string, ProductCandidateIdentity>;
};

export type ProductQualificationAggregate = {
  snapshot_id: string;
  distinct_brand_cat_fab: number;
  distinct_cat_fab_labels: number;
  distinct_brand_count: number;
  counts_by_brand: Array<{ marque: string; distinct_cat_fab: number }>;
};

export type ProductQualifiedSelection = {
  kind: "classification_scope";
  cir_path: string;
} | {
  kind: "direct_label";
  normalized_cat_fab: string;
  cir_path: string;
};

export type ProductQualifiedBrandDetails = {
  snapshot_id: string;
  requested_brand: string;
  matched_brand: string | null;
  distinct_cat_fab: number;
  rows: Array<{
    cat_fab: string;
    label: string;
    cir_path: string;
  }>;
  truncated: boolean;
};

const MAX_PRODUCT_DETAIL_ROWS = 50;

const normalizedText = (value: string): string =>
  value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

const lexicalTokens = (value: string): string[] =>
  normalizedText(value).split(/[^\p{L}\p{N}]+/u).filter((token) =>
    token.length >= 3
  );

export const expandProductLookupTerms = (
  plan: ProductSearchPlan,
): string[] => {
  return [
    ...new Set(plan.positive_terms.flatMap((term) => {
      const tokens = lexicalTokens(term);
      if (tokens.length <= 1) return tokens;
      return [tokens.join(" "), [...tokens].reverse().join(" ")];
    })),
  ];
};

const matchingTerms = (text: string, terms: readonly string[]): string[] => {
  const haystack = normalizedText(text);
  return terms.filter((term) => haystack.includes(normalizedText(term)));
};

export const searchProductSemanticCandidates = async (
  db: DbClient,
  snapshotId: string,
  plan: ProductSearchPlan,
): Promise<ProductCandidateSearchResult> => {
  const scopeTerms = expandProductLookupTerms(plan);
  const searchPatterns = scopeTerms.map((term) =>
    `%${lexicalTokens(term).map(escapePricingReferenceLikeTerm).join("%")}%`
  );
  const rows = await db.execute<{
    selection_kind: "classification_scope" | "direct_label";
    normalized_cat_fab: string | null;
    label: string;
    cir_path: string | null;
    segment_rows: number;
    distinct_cat_fab: number;
    example_brands: string[];
    example_labels: string[];
  }>(sql`
    with search_patterns(pattern) as (
      values ${
    sql.join(searchPatterns.map((pattern) => sql`(${pattern})`), sql`, `)
  }
    ), term_matches as (
      select distinct
        terms.pattern,
        case
          when v.link_status = 'complete_valid'
            and coalesce(v.cir_path, '') <> ''
            and translate(lower(regexp_replace(coalesce(v.cir_path, ''), '^.*>[[:space:]]*', '')), 'àáâäãåçèéêëìíîïñòóôöõùúûüýÿ', 'aaaaaaceeeeiiiinooooouuuuyy')
              like terms.pattern escape '\'
            then 'scope:' || v.cir_path
          when translate(lower(concat_ws(' ', v.cat_fab, v.cat_fab_l)), 'àáâäãåçèéêëìíîïñòóôöõùúûüýÿ', 'aaaaaaceeeeiiiinooooouuuuyy')
              like terms.pattern escape '\'
            then 'label:' || v.normalized_cat_fab || '|' || coalesce(v.cir_path, '')
          else null
        end as candidate_key
      from search_patterns terms
      join public.ai_v_product_semantics v
        on v.snapshot_id = ${snapshotId}
        and (
          translate(lower(regexp_replace(coalesce(v.cir_path, ''), '^.*>[[:space:]]*', '')), 'àáâäãåçèéêëìíîïñòóôöõùúûüýÿ', 'aaaaaaceeeeiiiinooooouuuuyy')
            like terms.pattern escape '\'
          or translate(lower(concat_ws(' ', v.cat_fab, v.cat_fab_l)), 'àáâäãåçèéêëìíîïñòóôöõùúûüýÿ', 'aaaaaaceeeeiiiinooooouuuuyy')
            like terms.pattern escape '\'
        )
    ), pattern_stats as (
      select pattern, count(distinct candidate_key)::int as candidate_count
      from term_matches
      where candidate_key is not null
      group by pattern
    ), ranked_patterns as (
      select pattern, candidate_count,
        row_number() over (
          order by candidate_count asc, length(pattern) desc, pattern asc
        ) as pattern_rank
      from pattern_stats
      where candidate_count between 1 and ${MAX_PRODUCT_CANDIDATE_GROUPS}
    ), eligible_patterns as (
      select ranked.pattern
      from ranked_patterns ranked
      where (
        select count(distinct matches.candidate_key)
        from term_matches matches
        join ranked_patterns included on included.pattern = matches.pattern
        where included.pattern_rank <= ranked.pattern_rank
      ) <= ${MAX_PRODUCT_CANDIDATE_GROUPS}
    ), classification_scopes as (
      select
        'classification_scope'::text as selection_kind,
        null::text as normalized_cat_fab,
        v.cir_path as label,
        v.cir_path,
        count(distinct v.segment_id)::int as segment_rows,
        count(distinct nullif(btrim(v.cat_fab), ''))::int as distinct_cat_fab,
        (array_agg(distinct v.marque order by v.marque))[1:5] as example_brands,
        (array_agg(distinct coalesce(nullif(v.cat_fab_l, ''), v.cat_fab)
          order by coalesce(nullif(v.cat_fab_l, ''), v.cat_fab)))[1:5] as example_labels
      from public.ai_v_product_semantics v
      where v.snapshot_id = ${snapshotId}
        and v.link_status = 'complete_valid'
        and coalesce(v.cir_path, '') <> ''
        and exists (
          select 1
          from eligible_patterns terms
          where translate(lower(regexp_replace(coalesce(v.cir_path, ''), '^.*>[[:space:]]*', '')), 'àáâäãåçèéêëìíîïñòóôöõùúûüýÿ', 'aaaaaaceeeeiiiinooooouuuuyy')
            like terms.pattern escape '\'
        )
      group by v.cir_path
    ), direct_labels as (
      select
        'direct_label'::text as selection_kind,
        v.normalized_cat_fab,
        min(coalesce(nullif(v.cat_fab_l, ''), v.cat_fab)) as label,
        coalesce(v.cir_path, '') as cir_path,
        count(distinct v.segment_id)::int as segment_rows,
        count(distinct nullif(btrim(v.cat_fab), ''))::int as distinct_cat_fab,
        (array_agg(distinct v.marque order by v.marque))[1:5] as example_brands,
        (array_agg(distinct coalesce(nullif(v.cat_fab_l, ''), v.cat_fab)
          order by coalesce(nullif(v.cat_fab_l, ''), v.cat_fab)))[1:5] as example_labels
      from public.ai_v_product_semantics v
      where v.snapshot_id = ${snapshotId}
        and exists (
          select 1
          from eligible_patterns terms
          where translate(lower(concat_ws(' ', v.cat_fab, v.cat_fab_l)), 'àáâäãåçèéêëìíîïñòóôöõùúûüýÿ', 'aaaaaaceeeeiiiinooooouuuuyy')
            like terms.pattern escape '\'
        )
        and not exists (
          select 1
          from classification_scopes scope
          where scope.cir_path = coalesce(v.cir_path, '')
        )
      group by v.normalized_cat_fab, coalesce(v.cir_path, '')
    ), candidates as (
      select *, 0 as selection_priority from classification_scopes
      union all
      select *, 1 as selection_priority from direct_labels
    )
    select selection_kind, normalized_cat_fab, label, cir_path,
      segment_rows, distinct_cat_fab, example_brands, example_labels
    from candidates
    order by selection_priority asc, segment_rows desc, label asc
    limit ${MAX_PRODUCT_CANDIDATE_GROUPS + 1}
  `);
  const truncated = rows.length > MAX_PRODUCT_CANDIDATE_GROUPS;
  const identities = new Map<string, ProductCandidateIdentity>();
  const groups = rows.slice(0, MAX_PRODUCT_CANDIDATE_GROUPS).map((row) => {
    const groupId = `pg_${crypto.randomUUID()}`;
    const searchable = `${row.label} ${row.cir_path ?? ""}`;
    identities.set(
      groupId,
      row.selection_kind === "classification_scope"
        ? {
          kind: "classification_scope",
          cirPath: row.cir_path ?? "",
        }
        : {
          kind: "direct_label",
          normalizedCatFab: row.normalized_cat_fab ?? "",
          cirPath: row.cir_path ?? "",
        },
    );
    return {
      group_id: groupId,
      selection_kind: row.selection_kind,
      label: row.label,
      cir_path: row.cir_path ?? "",
      matched_terms: matchingTerms(searchable, plan.positive_terms),
      example_brands: row.example_brands ?? [],
      example_labels: row.example_labels ?? [],
      segment_rows: row.segment_rows,
      distinct_cat_fab: row.distinct_cat_fab,
      confirming_signals: matchingTerms(searchable, plan.required_context),
      contradictory_signals: matchingTerms(
        searchable,
        plan.excluded_context,
      ),
    };
  });
  return {
    snapshot_id: snapshotId,
    concept: plan.concept,
    groups,
    truncated,
    identities,
  };
};

export const aggregateQualifiedProductGroups = async (
  db: DbClient,
  snapshotId: string,
  acceptedGroupIds: readonly string[],
  identities: ReadonlyMap<string, ProductCandidateIdentity>,
): Promise<ProductQualificationAggregate> => {
  const accepted = acceptedGroupIds.map((groupId) => identities.get(groupId));
  if (accepted.some((identity) => identity === undefined)) {
    throw new TypeError("Unknown product candidate group.");
  }
  const filters = accepted.filter(
    (identity): identity is ProductCandidateIdentity => identity !== undefined,
  ).map((identity) =>
    identity.kind === "classification_scope"
      ? sql`(link_status = 'complete_valid' and coalesce(cir_path, '') = ${identity.cirPath})`
      : sql`(normalized_cat_fab = ${identity.normalizedCatFab} and coalesce(cir_path, '') = ${identity.cirPath})`
  );
  if (filters.length === 0) {
    return {
      snapshot_id: snapshotId,
      distinct_brand_cat_fab: 0,
      distinct_cat_fab_labels: 0,
      distinct_brand_count: 0,
      counts_by_brand: [],
    };
  }
  const rows = await db.execute<{
    marque: string;
    distinct_cat_fab: number;
    distinct_brand_cat_fab: number;
    distinct_cat_fab_labels: number;
    distinct_brand_count: number;
  }>(sql`
    with qualified as (
      select distinct marque, cat_fab, normalized_cat_fab
      from public.ai_v_product_semantics
      where snapshot_id = ${snapshotId}
        and (${sql.join(filters, sql` or `)})
    ), totals as (
      select
        count(distinct (marque, cat_fab))::int as distinct_brand_cat_fab,
        count(distinct normalized_cat_fab)::int as distinct_cat_fab_labels,
        count(distinct marque)::int as distinct_brand_count
      from qualified
    ), brands as (
      select marque, count(distinct cat_fab)::int as distinct_cat_fab
      from qualified
      group by marque
    )
    select brands.marque, brands.distinct_cat_fab,
      totals.distinct_brand_cat_fab, totals.distinct_cat_fab_labels,
      totals.distinct_brand_count
    from brands cross join totals
    order by brands.distinct_cat_fab desc, brands.marque asc
  `);
  return {
    snapshot_id: snapshotId,
    distinct_brand_cat_fab: rows[0]?.distinct_brand_cat_fab ?? 0,
    distinct_cat_fab_labels: rows[0]?.distinct_cat_fab_labels ?? 0,
    distinct_brand_count: rows[0]?.distinct_brand_count ?? 0,
    counts_by_brand: rows.map((row) => ({
      marque: row.marque,
      distinct_cat_fab: row.distinct_cat_fab,
    })),
  };
};

export const getQualifiedProductBrandDetails = async (
  db: DbClient,
  snapshotId: string,
  selections: readonly ProductQualifiedSelection[],
  requestedBrand: string,
): Promise<ProductQualifiedBrandDetails> => {
  const filters = selections.map((selection) =>
    selection.kind === "classification_scope"
      ? sql`(link_status = 'complete_valid' and coalesce(cir_path, '') = ${selection.cir_path})`
      : sql`(normalized_cat_fab = ${selection.normalized_cat_fab} and coalesce(cir_path, '') = ${selection.cir_path})`
  );
  if (filters.length === 0) {
    return {
      snapshot_id: snapshotId,
      requested_brand: requestedBrand,
      matched_brand: null,
      distinct_cat_fab: 0,
      rows: [],
      truncated: false,
    };
  }
  const normalizedBrand = normalizedText(requestedBrand).trim();
  const rows = await db.execute<{
    marque: string;
    cat_fab: string;
    label: string;
    cir_path: string;
    total_count: number;
  }>(sql`
    with qualified as (
      select distinct marque, cat_fab,
        coalesce(nullif(cat_fab_l, ''), cat_fab) as label,
        coalesce(cir_path, '') as cir_path
      from public.ai_v_product_semantics
      where snapshot_id = ${snapshotId}
        and (${sql.join(filters, sql` or `)})
    ), matched as (
      select marque, cat_fab, label, cir_path
      from qualified
      where translate(lower(btrim(marque)), 'àáâäãåçèéêëìíîïñòóôöõùúûüýÿ', 'aaaaaaceeeeiiiinooooouuuuyy') = ${normalizedBrand}
    )
    select marque, cat_fab, label, cir_path,
      count(*) over()::int as total_count
    from matched
    order by cat_fab asc, label asc
    limit ${MAX_PRODUCT_DETAIL_ROWS + 1}
  `);
  const total = rows[0]?.total_count ?? 0;
  return {
    snapshot_id: snapshotId,
    requested_brand: requestedBrand,
    matched_brand: rows[0]?.marque ?? null,
    distinct_cat_fab: total,
    rows: rows.slice(0, MAX_PRODUCT_DETAIL_ROWS).map((row) => ({
      cat_fab: row.cat_fab,
      label: row.label,
      cir_path: row.cir_path,
    })),
    truncated: total > MAX_PRODUCT_DETAIL_ROWS,
  };
};
