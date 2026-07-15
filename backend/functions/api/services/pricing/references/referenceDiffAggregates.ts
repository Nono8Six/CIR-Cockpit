import { type SQL, sql } from 'drizzle-orm';

import {
  type PricingReferenceDiffAggregateInput,
  type PricingReferenceDiffAggregateResponse,
  pricingReferenceDiffAggregateResponseSchema,
} from '../../../../../../shared/schemas/pricing/references.schema.ts';
import { httpError } from '../../../middleware/errorHandler.ts';
import type { AuthContext, DbClient } from '../../../types.ts';
import {
  resolvePricingReferenceBrandAliases,
  resolvePricingReferenceDiffRun,
} from './referenceDiffs.ts';

const PRICE_CHANGE_COLUMNS = [
  'borne_acha',
  'coef_retro',
  'coef_ha',
  'coef_majvte',
] as const;
const DISCOUNT_CHANGE_COLUMNS = ['remise_ha'] as const;
const NUMERIC_CHANGE_SCALE = 6;

type AggregateGroupRow = {
  key: string;
  label: string;
  total: number | string;
  hausse_count: number | string;
  baisse_count: number | string;
  added_count: number | string;
  removed_count: number | string;
  avg_delta_pct: number | string | null;
  max_delta_pct: number | string | null;
  sample_object_keys: string[];
};

const toCount = (value: number | string): number =>
  typeof value === 'number' ? value : Number.parseInt(value, 10);

const toNullableNumber = (value: number | string | null): number | null => {
  if (value === null) return null;
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const toWhereSql = (conditions: SQL[]): SQL =>
  conditions.length === 0
    ? sql`true`
    : sql.join(conditions.map((condition) => sql`(${condition})`), sql` and `);

const toInCondition = (
  expression: SQL,
  values: readonly string[] | undefined,
): SQL | null => {
  if (!values?.length) return null;
  return sql`${expression} in (${
    sql.join(values.map((value) => sql`${value}`), sql`, `)
  })`;
};

const groupExpressions = (
  groupBy: PricingReferenceDiffAggregateInput['group_by'],
): { key: SQL; label: SQL } => {
  switch (groupBy) {
    case 'famille_cir':
      return { key: sql`famille_cir_key`, label: sql`famille_cir_label` };
    case 'categorie_fabricant':
      return {
        key: sql`categorie_fabricant_key`,
        label: sql`categorie_fabricant_label`,
      };
    case 'segment':
      return { key: sql`segment_key`, label: sql`segment_label` };
    case 'marque':
      return { key: sql`marque_key`, label: sql`marque_label` };
    case 'object_type':
      return { key: sql`object_type`, label: sql`object_type_label` };
    case 'changed_column':
      return { key: sql`changed_column`, label: sql`changed_column` };
  }
};

export const aggregatePricingReferenceDiffs = async (
  db: DbClient,
  authContext: AuthContext,
  input: PricingReferenceDiffAggregateInput,
): Promise<PricingReferenceDiffAggregateResponse> => {
  if (
    !authContext.isSuperAdmin && authContext.activeAgencyId &&
    !authContext.agencyIds.includes(authContext.activeAgencyId)
  ) {
    throw httpError(403, 'AUTH_FORBIDDEN', 'Agence active non autorisee.');
  }

  const run = await resolvePricingReferenceDiffRun(db, input);
  const conditions: SQL[] = [
    sql`d.base_snapshot_id is not distinct from ${run.base_snapshot_id}::uuid`,
    sql`d.target_snapshot_id = ${run.target_snapshot_id}`,
  ];
  const severityCondition = toInCondition(sql`d.severity`, input.severities);
  if (severityCondition) conditions.push(severityCondition);
  const diffTypeCondition = toInCondition(sql`d.diff_type`, input.diff_types);
  if (diffTypeCondition) conditions.push(diffTypeCondition);

  const resolvedMarques = resolvePricingReferenceBrandAliases(input.marques);
  if (resolvedMarques?.length) {
    conditions.push(sql`upper(coalesce(
      nullif(d.payload #>> '{labels,marque}', ''),
      nullif(d.payload #>> '{after,marque}', ''),
      nullif(d.payload #>> '{before,marque}', '')
    )) in (${
      sql.join(resolvedMarques.map((marque) => sql`${marque}`), sql`, `)
    })`);
  }

  if (input.measure === 'prix') {
    conditions.push(
      sql`changed.column_name in (${
        sql.join(PRICE_CHANGE_COLUMNS.map((column) => sql`${column}`), sql`, `)
      })`,
    );
  } else if (input.measure === 'remise') {
    conditions.push(sql`changed.column_name in (${
      sql.join(
        DISCOUNT_CHANGE_COLUMNS.map((column) => sql`${column}`),
        sql`, `,
      )
    })`);
  }

  const directionConditions: SQL[] = [];
  if (!input.include_neutral) {
    directionConditions.push(sql`change_direction is distinct from 'neutre'`);
  }
  if (input.direction !== 'any') {
    directionConditions.push(sql`change_direction = ${input.direction}`);
  }

  const directionWhere = toWhereSql(directionConditions);
  const thresholdWhere = input.threshold_pct === undefined
    ? sql`true`
    : sql`delta_pct is not null and abs(delta_pct) > ${input.threshold_pct}`;
  const group = groupExpressions(input.group_by);
  const financialColumns = [
    ...PRICE_CHANGE_COLUMNS,
    ...DISCOUNT_CHANGE_COLUMNS,
  ];
  const financialColumnsSql = sql.join(
    financialColumns.map((column) => sql`${column}`),
    sql`, `,
  );
  const resultLimit = input.limit + 1;

  const rows = await db.execute<AggregateGroupRow>(sql`
    with target_dimensions as (
      select distinct on (segment.segment_key)
        segment.segment_key,
        segment.segment,
        segment.marque,
        segment.cat_fab,
        segment.cat_fab_l,
        coalesce(classification.fam, nullif(link.famille, '')) as fam,
        classification.fam_lib
      from public.pricing_supplier_segments segment
      left join public.pricing_segment_classification_links link
        on link.snapshot_id = ${run.target_snapshot_id}
       and link.segment_id = segment.id
      left join public.pricing_classification_cir classification
        on classification.snapshot_id = ${run.target_snapshot_id}
       and classification.id = link.classification_id
      where segment.snapshot_id = ${run.target_snapshot_id}
      order by segment.segment_key,
        case when link.link_status = 'complete_valid' then 0 else 1 end,
        link.source_row_number nulls last,
        classification.cir_key nulls last
    ),
    base_dimensions as (
      select distinct on (segment.segment_key)
        segment.segment_key,
        segment.segment,
        segment.marque,
        segment.cat_fab,
        segment.cat_fab_l,
        coalesce(classification.fam, nullif(link.famille, '')) as fam,
        classification.fam_lib
      from public.pricing_supplier_segments segment
      left join public.pricing_segment_classification_links link
        on link.snapshot_id = ${run.base_snapshot_id}::uuid
       and link.segment_id = segment.id
      left join public.pricing_classification_cir classification
        on classification.snapshot_id = ${run.base_snapshot_id}::uuid
       and classification.id = link.classification_id
      where segment.snapshot_id = ${run.base_snapshot_id}::uuid
      order by segment.segment_key,
        case when link.link_status = 'complete_valid' then 0 else 1 end,
        link.source_row_number nulls last,
        classification.cir_key nulls last
    ),
    diff_events as (
      select
        d.id,
        d.diff_type,
        d.object_type,
        d.object_key,
        changed.column_name as changed_column,
        coalesce(
          nullif(d.payload #>> '{labels,fam}', ''),
          nullif(d.payload #>> '{after,fam}', ''),
          nullif(d.payload #>> '{before,fam}', ''),
          target_dimensions.fam,
          base_dimensions.fam,
          'inconnu'
        ) as famille_cir_key,
        coalesce(
          nullif(d.payload #>> '{after,fam_lib}', ''),
          nullif(d.payload #>> '{before,fam_lib}', ''),
          target_dimensions.fam_lib,
          base_dimensions.fam_lib,
          nullif(d.payload #>> '{labels,fam}', ''),
          target_dimensions.fam,
          base_dimensions.fam,
          'Inconnu'
        ) as famille_cir_label,
        coalesce(
          nullif(d.payload #>> '{labels,cat_fab}', ''),
          nullif(d.payload #>> '{after,cat_fab}', ''),
          nullif(d.payload #>> '{before,cat_fab}', ''),
          target_dimensions.cat_fab,
          base_dimensions.cat_fab,
          'inconnu'
        ) as categorie_fabricant_key,
        coalesce(
          nullif(d.payload #>> '{after,cat_fab_l}', ''),
          nullif(d.payload #>> '{before,cat_fab_l}', ''),
          target_dimensions.cat_fab_l,
          base_dimensions.cat_fab_l,
          nullif(d.payload #>> '{labels,cat_fab}', ''),
          target_dimensions.cat_fab,
          base_dimensions.cat_fab,
          'Inconnu'
        ) as categorie_fabricant_label,
        coalesce(
          nullif(d.payload #>> '{labels,segment}', ''),
          nullif(d.payload #>> '{after,segment}', ''),
          nullif(d.payload #>> '{before,segment}', ''),
          target_dimensions.segment,
          base_dimensions.segment,
          'inconnu'
        ) as segment_key,
        coalesce(
          nullif(d.payload #>> '{labels,segment}', ''),
          nullif(d.payload #>> '{after,segment}', ''),
          nullif(d.payload #>> '{before,segment}', ''),
          target_dimensions.segment,
          base_dimensions.segment,
          'Inconnu'
        ) as segment_label,
        coalesce(
          nullif(d.payload #>> '{labels,marque}', ''),
          nullif(d.payload #>> '{after,marque}', ''),
          nullif(d.payload #>> '{before,marque}', ''),
          target_dimensions.marque,
          base_dimensions.marque,
          'inconnu'
        ) as marque_key,
        coalesce(
          nullif(d.payload #>> '{labels,marque}', ''),
          nullif(d.payload #>> '{after,marque}', ''),
          nullif(d.payload #>> '{before,marque}', ''),
          target_dimensions.marque,
          base_dimensions.marque,
          'Inconnu'
        ) as marque_label,
        case d.object_type
          when 'classification' then 'Classification CIR'
          when 'segment' then 'Segment fabricant'
          when 'liaison' then 'Liaison segment / classification'
          when 'grille' then 'Grille achat'
          else 'Anomalie'
        end as object_type_label,
        case
          when changed.column_name in (${financialColumnsSql})
           and trim(d.payload #>> array['before', changed.column_name])
             ~ '^[+-]?[0-9]+([.,][0-9]+)?$'
          then round(replace(
            trim(d.payload #>> array['before', changed.column_name]), ',', '.'
          )::numeric, ${NUMERIC_CHANGE_SCALE})
          else null
        end as before_normalized,
        case
          when changed.column_name in (${financialColumnsSql})
           and trim(d.payload #>> array['after', changed.column_name])
             ~ '^[+-]?[0-9]+([.,][0-9]+)?$'
          then round(replace(
            trim(d.payload #>> array['after', changed.column_name]), ',', '.'
          )::numeric, ${NUMERIC_CHANGE_SCALE})
          else null
        end as after_normalized
      from public.pricing_reference_diffs d
      cross join lateral unnest(d.changed_columns) as changed(column_name)
      left join target_dimensions
        on target_dimensions.segment_key = d.payload #>> '{labels,segment_key}'
      left join base_dimensions
        on base_dimensions.segment_key = d.payload #>> '{labels,segment_key}'
      where ${toWhereSql(conditions)}
    ),
    classified as (
      select *,
        case
          when before_normalized is null or after_normalized is null then null
          when after_normalized > before_normalized then 'hausse'
          when after_normalized < before_normalized then 'baisse'
          else 'neutre'
        end as change_direction,
        case
          when before_normalized is null or after_normalized is null
            or before_normalized = 0 then null
          else round(
            ((after_normalized - before_normalized) / abs(before_normalized)) * 100,
            ${NUMERIC_CHANGE_SCALE}
          )
        end as delta_pct
      from diff_events
    ),
    grouped_source as (
      select *, ${group.key} as group_key, ${group.label} as group_label
      from classified
       where ${directionWhere}
         and (${thresholdWhere})
    )
    select
      group_key as key,
      max(group_label) as label,
      count(distinct id)::int as total,
      count(distinct id) filter (where change_direction = 'hausse')::int
        as hausse_count,
      count(distinct id) filter (where change_direction = 'baisse')::int
        as baisse_count,
      count(distinct id) filter (where diff_type = 'ajoute')::int
        as added_count,
      count(distinct id) filter (where diff_type = 'supprime')::int
        as removed_count,
      round(avg(delta_pct) filter (
        where change_direction in ('hausse', 'baisse')
      ), ${NUMERIC_CHANGE_SCALE}) as avg_delta_pct,
      case
        when abs(max(delta_pct)) >= abs(min(delta_pct)) then max(delta_pct)
        else min(delta_pct)
      end as max_delta_pct,
      (array_agg(distinct object_key order by object_key))[1:5]
        as sample_object_keys
    from grouped_source
    group by group_key
    order by count(distinct id) desc, group_key asc
    limit ${resultLimit}
  `);

  const truncated = rows.length > input.limit;
  const groups = rows.slice(0, input.limit).map((row) => ({
    key: row.key,
    label: row.label,
    total: toCount(row.total),
    hausse_count: toCount(row.hausse_count),
    baisse_count: toCount(row.baisse_count),
    added_count: toCount(row.added_count),
    removed_count: toCount(row.removed_count),
    avg_delta_pct: toNullableNumber(row.avg_delta_pct),
    max_delta_pct: toNullableNumber(row.max_delta_pct),
    sample_object_keys: row.sample_object_keys ?? [],
  }));

  return pricingReferenceDiffAggregateResponseSchema.parse({
    ok: true,
    run_id: run.id,
    base_snapshot_id: run.base_snapshot_id,
    target_snapshot_id: run.target_snapshot_id,
    group_by: input.group_by,
    measure: input.measure,
    direction: input.direction,
    threshold_pct: input.threshold_pct ?? null,
    groups,
    truncated,
  });
};
