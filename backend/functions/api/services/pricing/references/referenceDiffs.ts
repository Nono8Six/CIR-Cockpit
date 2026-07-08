import { type SQL, sql } from "drizzle-orm";

import {
  type PricingReferenceAnomalySeverity,
  type PricingReferenceDiffObjectType,
  pricingReferenceDiffObjectTypeLabels,
  type PricingReferenceDiffPayload,
  pricingReferenceDiffPayloadSchema,
  type PricingReferenceDiffsComputeInput,
  type PricingReferenceDiffsComputeResponse,
  pricingReferenceDiffsComputeResponseSchema,
  type PricingReferenceDiffsListInput,
  type PricingReferenceDiffsListResponse,
  pricingReferenceDiffsListResponseSchema,
  type PricingReferenceDiffsSummaryGetInput,
  type PricingReferenceDiffsSummaryResponse,
  pricingReferenceDiffsSummaryResponseSchema,
  type PricingReferenceDiffType,
  type PricingReferenceFileKind,
} from "../../../../../../shared/schemas/pricing/references.schema.ts";
import { httpError } from "../../../middleware/errorHandler.ts";
import type { DbClient } from "../../../types.ts";
import { checkRateLimit } from "../../rate-limiting/rateLimit.ts";

type DbExecutable = Pick<DbClient, "execute">;

type DiffRunRow = {
  id: string;
  base_snapshot_id: string | null;
  target_snapshot_id: string;
  status: "computed";
  initial_import: boolean;
  skipped_file_kinds: PricingReferenceFileKind[];
  summary: unknown;
  computed_at: string;
};

type DiffRowRecord = {
  id: string;
  base_snapshot_id: string | null;
  target_snapshot_id: string;
  diff_type: PricingReferenceDiffType;
  object_type: PricingReferenceDiffObjectType;
  object_key: string;
  severity: PricingReferenceAnomalySeverity;
  changed_columns: string[];
  payload: unknown;
  created_at: string;
};

type SnapshotCounters = {
  classifications: number;
  segments: number;
  liaisons: number;
  grilles: number;
  anomalies: number;
};

type DiffSummaryPayload = Omit<
  PricingReferenceDiffsSummaryResponse,
  "ok" | "request_id"
>;

const DIFF_OBJECT_TYPES: PricingReferenceDiffObjectType[] = [
  "classification",
  "segment",
  "liaison",
  "grille",
  "anomalie",
];

const FINANCIAL_CHANGE_COLUMNS = [
  "remise_ha",
  "coef_retro",
  "coef_ha",
  "coef_majvte",
  "date_debut_normalized",
  "date_fin_normalized",
  "borne_acha",
] as const;

const GRID_CHANGED_COLUMNS = [
  "num_four",
  "remise_ha",
  "col_ha",
  "priorite",
  "type_grill",
  "date_debut_normalized",
  "date_fin_normalized",
  "borne_acha",
  "coef_retro",
  "coef_ha",
  "coef_majvte",
] as const;

const hasOwn = (value: object, key: string): boolean =>
  Object.prototype.hasOwnProperty.call(value, key);

const toCount = (value: unknown): number => {
  if (typeof value === "number") return value;
  if (typeof value === "string") return Number.parseInt(value, 10);
  return 0;
};

const toTextArraySql = (values: readonly string[]): SQL => {
  if (values.length === 0) return sql`array[]::text[]`;
  return sql`array[${
    sql.join(values.map((value) => sql`${value}`), sql`, `)
  }]::text[]`;
};

const toWhereSql = (conditions: SQL[]): SQL => {
  if (conditions.length === 0) return sql`true`;
  return sql.join(
    conditions.map((condition) => sql`(${condition})`),
    sql` and `,
  );
};

const toInCondition = (
  expression: SQL,
  values: readonly string[] | undefined,
): SQL | null => {
  if (!values || values.length === 0) return null;
  return sql`${expression} in (${
    sql.join(
      values.map((value) => sql`${value}`),
      sql`, `,
    )
  })`;
};

const withTransaction = <T>(
  db: DbClient,
  operation: (tx: DbClient) => Promise<T>,
): Promise<T> => {
  const maybeTransactional = db as DbClient & {
    transaction?: <TResult>(
      callback: (tx: unknown) => Promise<TResult>,
    ) => Promise<TResult>;
  };
  if (typeof maybeTransactional.transaction !== "function") {
    return operation(db);
  }
  return maybeTransactional.transaction((tx) => operation(tx as DbClient));
};

const normalizePayload = (payload: unknown): PricingReferenceDiffPayload =>
  pricingReferenceDiffPayloadSchema.parse(payload);

const ensureSnapshotExists = async (
  db: DbExecutable,
  snapshotId: string,
): Promise<void> => {
  const rows = await db.execute<{ id: string }>(sql`
    select id
    from public.pricing_reference_snapshots
    where id = ${snapshotId}
    limit 1
  `);
  if (rows.length === 0) {
    throw httpError(
      404,
      "PRICING_REFERENCE_SNAPSHOT_NOT_FOUND",
      "Snapshot referentiel introuvable.",
    );
  }
};

export const resolvePricingReferenceDiffBaseSnapshotId = async (
  db: DbExecutable,
  targetSnapshotId: string,
): Promise<string | null> => {
  const targetRows = await db.execute<{ import_id: string }>(sql`
    select import_id
    from public.pricing_reference_snapshots
    where id = ${targetSnapshotId}
    limit 1
  `);
  const target = targetRows[0];
  if (!target) {
    throw httpError(
      404,
      "PRICING_REFERENCE_SNAPSHOT_NOT_FOUND",
      "Snapshot referentiel introuvable.",
    );
  }

  const activeRows = await db.execute<{ id: string }>(sql`
    select id
    from public.pricing_reference_snapshots
    where is_active = true
      and id <> ${targetSnapshotId}
    order by activated_at desc nulls last, created_at desc
    limit 1
  `);
  if (activeRows[0]?.id) return activeRows[0].id;

  const latestRows = await db.execute<{ id: string }>(sql`
    select snapshot.id
    from public.pricing_reference_snapshots snapshot
    join public.pricing_reference_imports import
      on import.id = snapshot.import_id
    where snapshot.id <> ${targetSnapshotId}
      and snapshot.import_id <> ${target.import_id}
      and import.status = 'analyse_ok'
    order by
      import.analysis_completed_at desc nulls last,
      snapshot.created_at desc
    limit 1
  `);
  return latestRows[0]?.id ?? null;
};

const resolveSkippedFileKinds = async (
  db: DbExecutable,
  baseSnapshotId: string | null,
  targetSnapshotId: string,
): Promise<PricingReferenceFileKind[]> => {
  if (!baseSnapshotId) return [];
  const rows = await db.execute<{ file_kind: PricingReferenceFileKind }>(sql`
    with kinds(file_kind) as (
      values ('classification'::text), ('segments_grids'::text)
    )
    select kinds.file_kind::text as file_kind
    from kinds
    join public.pricing_reference_snapshots base_snapshot
      on base_snapshot.id = ${baseSnapshotId}
    join public.pricing_reference_imports base_import
      on base_import.id = base_snapshot.import_id
    join public.pricing_reference_snapshots target_snapshot
      on target_snapshot.id = ${targetSnapshotId}
    join public.pricing_reference_imports target_import
      on target_import.id = target_snapshot.import_id
    where base_import.health_report #>> array['files', kinds.file_kind, 'sha256']
      = target_import.health_report #>> array['files', kinds.file_kind, 'sha256']
      and base_import.health_report #>> array['files', kinds.file_kind, 'sha256'] is not null
  `);
  return rows.map((row) => row.file_kind);
};

const clearExistingDiffRun = async (
  db: DbExecutable,
  baseSnapshotId: string | null,
  targetSnapshotId: string,
): Promise<void> => {
  await db.execute(sql`
    delete from public.pricing_reference_diffs
    where target_snapshot_id = ${targetSnapshotId}
      and base_snapshot_id is not distinct from ${baseSnapshotId}::uuid
  `);
  await db.execute(sql`
    delete from public.pricing_reference_diff_runs
    where target_snapshot_id = ${targetSnapshotId}
      and base_snapshot_id is not distinct from ${baseSnapshotId}::uuid
  `);
};

const insertClassificationDiffs = async (
  db: DbExecutable,
  baseSnapshotId: string,
  targetSnapshotId: string,
): Promise<void> => {
  await db.execute(sql`
    with base_rows as (
      select *
      from public.pricing_classification_cir
      where snapshot_id = ${baseSnapshotId}
    ),
    target_rows as (
      select *
      from public.pricing_classification_cir
      where snapshot_id = ${targetSnapshotId}
    ),
    paired as (
      select
        base_rows.id as base_id,
        target_rows.id as target_id,
        base_rows.source_row_number as base_source_row_number,
        target_rows.source_row_number as target_source_row_number,
        base_rows.cir_key as base_cir_key,
        target_rows.cir_key as target_cir_key,
        base_rows.mega as base_mega,
        target_rows.mega as target_mega,
        base_rows.fam as base_fam,
        target_rows.fam as target_fam,
        base_rows.sfa as base_sfa,
        target_rows.sfa as target_sfa,
        base_rows.mega_lib as base_mega_lib,
        target_rows.mega_lib as target_mega_lib,
        base_rows.fam_lib as base_fam_lib,
        target_rows.fam_lib as target_fam_lib,
        base_rows.sfa_lib as base_sfa_lib,
        target_rows.sfa_lib as target_sfa_lib
      from base_rows
      full outer join target_rows
        on target_rows.cir_key = base_rows.cir_key
    )
    insert into public.pricing_reference_diffs (
      base_snapshot_id,
      target_snapshot_id,
      diff_type,
      object_type,
      object_key,
      severity,
      changed_columns,
      payload
    )
    select
      ${baseSnapshotId},
      ${targetSnapshotId},
      case
        when paired.base_id is null then 'ajoute'
        when paired.target_id is null then 'supprime'
        else 'modifie'
      end,
      'classification',
      coalesce(paired.target_cir_key, paired.base_cir_key),
      case
        when paired.target_id is null then 'haute'
        else 'faible'
      end,
      row_diff.changed_columns,
      jsonb_build_object(
        'changed_columns', row_diff.changed_columns,
        'before', case when paired.base_id is null then null else jsonb_build_object(
          'mega', paired.base_mega,
          'fam', paired.base_fam,
          'sfa', paired.base_sfa,
          'mega_lib', paired.base_mega_lib,
          'fam_lib', paired.base_fam_lib,
          'sfa_lib', paired.base_sfa_lib
        ) end,
        'after', case when paired.target_id is null then null else jsonb_build_object(
          'mega', paired.target_mega,
          'fam', paired.target_fam,
          'sfa', paired.target_sfa,
          'mega_lib', paired.target_mega_lib,
          'fam_lib', paired.target_fam_lib,
          'sfa_lib', paired.target_sfa_lib
        ) end,
        'labels', jsonb_build_object(
          'cir_key', coalesce(paired.target_cir_key, paired.base_cir_key),
          'mega', coalesce(paired.target_mega, paired.base_mega),
          'fam', coalesce(paired.target_fam, paired.base_fam),
          'sfa', coalesce(paired.target_sfa, paired.base_sfa)
        ),
        'source_row_numbers', jsonb_build_object(
          'before', case when paired.base_source_row_number is null then '[]'::jsonb else jsonb_build_array(paired.base_source_row_number) end,
          'after', case when paired.target_source_row_number is null then '[]'::jsonb else jsonb_build_array(paired.target_source_row_number) end
        )
      )
    from paired
    cross join lateral (
      select array_remove(array[
        case when paired.base_mega is distinct from paired.target_mega then 'mega' end,
        case when paired.base_fam is distinct from paired.target_fam then 'fam' end,
        case when paired.base_sfa is distinct from paired.target_sfa then 'sfa' end,
        case when paired.base_mega_lib is distinct from paired.target_mega_lib then 'mega_lib' end,
        case when paired.base_fam_lib is distinct from paired.target_fam_lib then 'fam_lib' end,
        case when paired.base_sfa_lib is distinct from paired.target_sfa_lib then 'sfa_lib' end
      ]::text[], null) as changed_columns
    ) as changed
    cross join lateral (
      select case
        when paired.base_id is null or paired.target_id is null
          then array['mega', 'fam', 'sfa', 'mega_lib', 'fam_lib', 'sfa_lib']::text[]
        else changed.changed_columns
      end as changed_columns
    ) as row_diff
    where paired.base_id is null
      or paired.target_id is null
      or array_length(changed.changed_columns, 1) > 0
  `);
};

const insertSegmentDiffs = async (
  db: DbExecutable,
  baseSnapshotId: string,
  targetSnapshotId: string,
): Promise<void> => {
  await db.execute(sql`
    with base_rows as (
      select *
      from public.pricing_supplier_segments
      where snapshot_id = ${baseSnapshotId}
    ),
    target_rows as (
      select *
      from public.pricing_supplier_segments
      where snapshot_id = ${targetSnapshotId}
    ),
    paired as (
      select
        base_rows.id as base_id,
        target_rows.id as target_id,
        base_rows.source_row_number as base_source_row_number,
        target_rows.source_row_number as target_source_row_number,
        base_rows.segment_key as base_segment_key,
        target_rows.segment_key as target_segment_key,
        base_rows.segment as base_segment,
        target_rows.segment as target_segment,
        base_rows.idnumerique as base_idnumerique,
        target_rows.idnumerique as target_idnumerique,
        base_rows.marque as base_marque,
        target_rows.marque as target_marque,
        base_rows.cat_fab as base_cat_fab,
        target_rows.cat_fab as target_cat_fab,
        base_rows.cat_fab_l as base_cat_fab_l,
        target_rows.cat_fab_l as target_cat_fab_l,
        base_rows.strategiq as base_strategiq,
        target_rows.strategiq as target_strategiq,
        base_rows.codif_fair as base_codif_fair,
        target_rows.codif_fair as target_codif_fair,
        base_rows.tarif_fab as base_tarif_fab,
        target_rows.tarif_fab as target_tarif_fab
      from base_rows
      full outer join target_rows
        on target_rows.segment_key = base_rows.segment_key
    )
    insert into public.pricing_reference_diffs (
      base_snapshot_id,
      target_snapshot_id,
      diff_type,
      object_type,
      object_key,
      severity,
      changed_columns,
      payload
    )
    select
      ${baseSnapshotId},
      ${targetSnapshotId},
      case
        when paired.base_id is null then 'ajoute'
        when paired.target_id is null then 'supprime'
        else 'modifie'
      end,
      'segment',
      coalesce(paired.target_segment_key, paired.base_segment_key),
      case
        when paired.target_id is null then 'haute'
        else 'faible'
      end,
      row_diff.changed_columns,
      jsonb_build_object(
        'changed_columns', row_diff.changed_columns,
        'before', case when paired.base_id is null then null else jsonb_build_object(
          'segment', paired.base_segment,
          'idnumerique', paired.base_idnumerique,
          'marque', paired.base_marque,
          'cat_fab', paired.base_cat_fab,
          'cat_fab_l', paired.base_cat_fab_l,
          'strategiq', paired.base_strategiq,
          'codif_fair', paired.base_codif_fair,
          'tarif_fab', paired.base_tarif_fab
        ) end,
        'after', case when paired.target_id is null then null else jsonb_build_object(
          'segment', paired.target_segment,
          'idnumerique', paired.target_idnumerique,
          'marque', paired.target_marque,
          'cat_fab', paired.target_cat_fab,
          'cat_fab_l', paired.target_cat_fab_l,
          'strategiq', paired.target_strategiq,
          'codif_fair', paired.target_codif_fair,
          'tarif_fab', paired.target_tarif_fab
        ) end,
        'labels', jsonb_build_object(
          'segment_key', coalesce(paired.target_segment_key, paired.base_segment_key),
          'segment', coalesce(paired.target_segment, paired.base_segment),
          'marque', coalesce(paired.target_marque, paired.base_marque),
          'cat_fab', coalesce(paired.target_cat_fab, paired.base_cat_fab)
        ),
        'source_row_numbers', jsonb_build_object(
          'before', case when paired.base_source_row_number is null then '[]'::jsonb else jsonb_build_array(paired.base_source_row_number) end,
          'after', case when paired.target_source_row_number is null then '[]'::jsonb else jsonb_build_array(paired.target_source_row_number) end
        )
      )
    from paired
    cross join lateral (
      select array_remove(array[
        case when paired.base_segment is distinct from paired.target_segment then 'segment' end,
        case when paired.base_idnumerique is distinct from paired.target_idnumerique then 'idnumerique' end,
        case when paired.base_marque is distinct from paired.target_marque then 'marque' end,
        case when paired.base_cat_fab is distinct from paired.target_cat_fab then 'cat_fab' end,
        case when paired.base_cat_fab_l is distinct from paired.target_cat_fab_l then 'cat_fab_l' end,
        case when paired.base_strategiq is distinct from paired.target_strategiq then 'strategiq' end,
        case when paired.base_codif_fair is distinct from paired.target_codif_fair then 'codif_fair' end,
        case when paired.base_tarif_fab is distinct from paired.target_tarif_fab then 'tarif_fab' end
      ]::text[], null) as changed_columns
    ) as changed
    cross join lateral (
      select case
        when paired.base_id is null or paired.target_id is null
          then array['segment', 'idnumerique', 'marque', 'cat_fab', 'cat_fab_l', 'strategiq', 'codif_fair', 'tarif_fab']::text[]
        else changed.changed_columns
      end as changed_columns
    ) as row_diff
    where paired.base_id is null
      or paired.target_id is null
      or array_length(changed.changed_columns, 1) > 0
  `);
};

const insertLiaisonDiffs = async (
  db: DbExecutable,
  baseSnapshotId: string,
  targetSnapshotId: string,
): Promise<void> => {
  await db.execute(sql`
    with base_rows as (
      select
        link.*,
        segment.segment_key,
        segment.segment,
        segment.marque,
        segment.cat_fab
      from public.pricing_segment_classification_links link
      join public.pricing_supplier_segments segment
        on segment.id = link.segment_id
      where link.snapshot_id = ${baseSnapshotId}
    ),
    target_rows as (
      select
        link.*,
        segment.segment_key,
        segment.segment,
        segment.marque,
        segment.cat_fab
      from public.pricing_segment_classification_links link
      join public.pricing_supplier_segments segment
        on segment.id = link.segment_id
      where link.snapshot_id = ${targetSnapshotId}
    ),
    paired as (
      select
        base_rows.id as base_id,
        target_rows.id as target_id,
        base_rows.source_row_number as base_source_row_number,
        target_rows.source_row_number as target_source_row_number,
        base_rows.segment_key as base_segment_key,
        target_rows.segment_key as target_segment_key,
        base_rows.segment as base_segment,
        target_rows.segment as target_segment,
        base_rows.marque as base_marque,
        target_rows.marque as target_marque,
        base_rows.cat_fab as base_cat_fab,
        target_rows.cat_fab as target_cat_fab,
        base_rows.cir_key as base_cir_key,
        target_rows.cir_key as target_cir_key,
        base_rows.link_status as base_link_status,
        target_rows.link_status as target_link_status
      from base_rows
      full outer join target_rows
        on target_rows.segment_key = base_rows.segment_key
    )
    insert into public.pricing_reference_diffs (
      base_snapshot_id,
      target_snapshot_id,
      diff_type,
      object_type,
      object_key,
      severity,
      changed_columns,
      payload
    )
    select
      ${baseSnapshotId},
      ${targetSnapshotId},
      case
        when paired.base_id is null then 'ajoute'
        when paired.target_id is null then 'supprime'
        else 'modifie'
      end,
      'liaison',
      coalesce(paired.target_segment_key, paired.base_segment_key),
      case
        when paired.target_id is null then 'haute'
        when paired.base_link_status = 'complete_valid'
          and paired.target_link_status is distinct from 'complete_valid' then 'haute'
        when paired.base_id is null then 'faible'
        else 'moyenne'
      end,
      row_diff.changed_columns,
      jsonb_build_object(
        'changed_columns', row_diff.changed_columns,
        'before', case when paired.base_id is null then null else jsonb_build_object(
          'cir_key', paired.base_cir_key,
          'link_status', paired.base_link_status
        ) end,
        'after', case when paired.target_id is null then null else jsonb_build_object(
          'cir_key', paired.target_cir_key,
          'link_status', paired.target_link_status
        ) end,
        'labels', jsonb_build_object(
          'segment_key', coalesce(paired.target_segment_key, paired.base_segment_key),
          'segment', coalesce(paired.target_segment, paired.base_segment),
          'marque', coalesce(paired.target_marque, paired.base_marque),
          'cat_fab', coalesce(paired.target_cat_fab, paired.base_cat_fab),
          'cir_key', coalesce(paired.target_cir_key, paired.base_cir_key)
        ),
        'source_row_numbers', jsonb_build_object(
          'before', case when paired.base_source_row_number is null then '[]'::jsonb else jsonb_build_array(paired.base_source_row_number) end,
          'after', case when paired.target_source_row_number is null then '[]'::jsonb else jsonb_build_array(paired.target_source_row_number) end
        )
      )
    from paired
    cross join lateral (
      select array_remove(array[
        case when paired.base_cir_key is distinct from paired.target_cir_key then 'cir_key' end,
        case when paired.base_link_status is distinct from paired.target_link_status then 'link_status' end
      ]::text[], null) as changed_columns
    ) as changed
    cross join lateral (
      select case
        when paired.base_id is null or paired.target_id is null
          then array['cir_key', 'link_status']::text[]
        else changed.changed_columns
      end as changed_columns
    ) as row_diff
    where paired.base_id is null
      or paired.target_id is null
      or array_length(changed.changed_columns, 1) > 0
  `);
};

const insertGridDiffs = async (
  db: DbExecutable,
  baseSnapshotId: string,
  targetSnapshotId: string,
): Promise<void> => {
  await db.execute(sql`
    with base_rows as (
      select
        grid.*,
        segment.segment_key,
        segment.segment,
        segment.marque,
        segment.cat_fab,
        concat_ws(
          '|',
          segment.segment_key,
          coalesce(grid.num_four, '∅'),
          coalesce(grid.priorite, '∅'),
          coalesce(grid.type_grill, '∅'),
          coalesce(grid.date_debut_normalized, '∅'),
          coalesce(grid.date_fin_normalized, '∅')
        ) as grid_key,
        row_number() over (
          partition by
            segment.segment_key,
            coalesce(grid.num_four, '∅'),
            coalesce(grid.priorite, '∅'),
            coalesce(grid.type_grill, '∅'),
            coalesce(grid.date_debut_normalized, '∅'),
            coalesce(grid.date_fin_normalized, '∅')
          order by grid.normalized_values::text, grid.source_row_number
        ) as duplicate_rank
      from public.pricing_segment_purchase_grids grid
      join public.pricing_supplier_segments segment
        on segment.id = grid.segment_id
      where grid.snapshot_id = ${baseSnapshotId}
    ),
    target_rows as (
      select
        grid.*,
        segment.segment_key,
        segment.segment,
        segment.marque,
        segment.cat_fab,
        concat_ws(
          '|',
          segment.segment_key,
          coalesce(grid.num_four, '∅'),
          coalesce(grid.priorite, '∅'),
          coalesce(grid.type_grill, '∅'),
          coalesce(grid.date_debut_normalized, '∅'),
          coalesce(grid.date_fin_normalized, '∅')
        ) as grid_key,
        row_number() over (
          partition by
            segment.segment_key,
            coalesce(grid.num_four, '∅'),
            coalesce(grid.priorite, '∅'),
            coalesce(grid.type_grill, '∅'),
            coalesce(grid.date_debut_normalized, '∅'),
            coalesce(grid.date_fin_normalized, '∅')
          order by grid.normalized_values::text, grid.source_row_number
        ) as duplicate_rank
      from public.pricing_segment_purchase_grids grid
      join public.pricing_supplier_segments segment
        on segment.id = grid.segment_id
      where grid.snapshot_id = ${targetSnapshotId}
    ),
    paired as (
      select
        base_rows.id as base_id,
        target_rows.id as target_id,
        base_rows.source_row_number as base_source_row_number,
        target_rows.source_row_number as target_source_row_number,
        base_rows.grid_key as base_grid_key,
        target_rows.grid_key as target_grid_key,
        base_rows.segment_key as base_segment_key,
        target_rows.segment_key as target_segment_key,
        base_rows.segment as base_segment,
        target_rows.segment as target_segment,
        base_rows.marque as base_marque,
        target_rows.marque as target_marque,
        base_rows.cat_fab as base_cat_fab,
        target_rows.cat_fab as target_cat_fab,
        base_rows.num_four as base_num_four,
        target_rows.num_four as target_num_four,
        base_rows.remise_ha as base_remise_ha,
        target_rows.remise_ha as target_remise_ha,
        base_rows.col_ha as base_col_ha,
        target_rows.col_ha as target_col_ha,
        base_rows.priorite as base_priorite,
        target_rows.priorite as target_priorite,
        base_rows.type_grill as base_type_grill,
        target_rows.type_grill as target_type_grill,
        base_rows.date_debut_normalized as base_date_debut_normalized,
        target_rows.date_debut_normalized as target_date_debut_normalized,
        base_rows.date_fin_normalized as base_date_fin_normalized,
        target_rows.date_fin_normalized as target_date_fin_normalized,
        base_rows.borne_acha as base_borne_acha,
        target_rows.borne_acha as target_borne_acha,
        base_rows.coef_retro as base_coef_retro,
        target_rows.coef_retro as target_coef_retro,
        base_rows.coef_ha as base_coef_ha,
        target_rows.coef_ha as target_coef_ha,
        base_rows.coef_majvte as base_coef_majvte,
        target_rows.coef_majvte as target_coef_majvte
      from base_rows
      full outer join target_rows
        on target_rows.grid_key = base_rows.grid_key
       and target_rows.duplicate_rank = base_rows.duplicate_rank
    )
    insert into public.pricing_reference_diffs (
      base_snapshot_id,
      target_snapshot_id,
      diff_type,
      object_type,
      object_key,
      severity,
      changed_columns,
      payload
    )
    select
      ${baseSnapshotId},
      ${targetSnapshotId},
      case
        when paired.base_id is null then 'ajoute'
        when paired.target_id is null then 'supprime'
        else 'modifie'
      end,
      'grille',
      coalesce(paired.target_grid_key, paired.base_grid_key),
      case
        when paired.target_id is null then 'haute'
        when paired.base_id is null then 'faible'
        else 'moyenne'
      end,
      row_diff.changed_columns,
      jsonb_build_object(
        'changed_columns', row_diff.changed_columns,
        'before', case when paired.base_id is null then null else jsonb_build_object(
          'num_four', paired.base_num_four,
          'remise_ha', paired.base_remise_ha,
          'col_ha', paired.base_col_ha,
          'priorite', paired.base_priorite,
          'type_grill', paired.base_type_grill,
          'date_debut_normalized', paired.base_date_debut_normalized,
          'date_fin_normalized', paired.base_date_fin_normalized,
          'borne_acha', paired.base_borne_acha,
          'coef_retro', paired.base_coef_retro,
          'coef_ha', paired.base_coef_ha,
          'coef_majvte', paired.base_coef_majvte
        ) end,
        'after', case when paired.target_id is null then null else jsonb_build_object(
          'num_four', paired.target_num_four,
          'remise_ha', paired.target_remise_ha,
          'col_ha', paired.target_col_ha,
          'priorite', paired.target_priorite,
          'type_grill', paired.target_type_grill,
          'date_debut_normalized', paired.target_date_debut_normalized,
          'date_fin_normalized', paired.target_date_fin_normalized,
          'borne_acha', paired.target_borne_acha,
          'coef_retro', paired.target_coef_retro,
          'coef_ha', paired.target_coef_ha,
          'coef_majvte', paired.target_coef_majvte
        ) end,
        'labels', jsonb_build_object(
          'segment_key', coalesce(paired.target_segment_key, paired.base_segment_key),
          'segment', coalesce(paired.target_segment, paired.base_segment),
          'marque', coalesce(paired.target_marque, paired.base_marque),
          'cat_fab', coalesce(paired.target_cat_fab, paired.base_cat_fab),
          'num_four', coalesce(paired.target_num_four, paired.base_num_four),
          'priorite', coalesce(paired.target_priorite, paired.base_priorite),
          'type_grill', coalesce(paired.target_type_grill, paired.base_type_grill)
        ),
        'source_row_numbers', jsonb_build_object(
          'before', case when paired.base_source_row_number is null then '[]'::jsonb else jsonb_build_array(paired.base_source_row_number) end,
          'after', case when paired.target_source_row_number is null then '[]'::jsonb else jsonb_build_array(paired.target_source_row_number) end
        ),
        'identity_note', 'Identite grille: segment_key|num_four|priorite|type_grill|date_debut_normalized|date_fin_normalized. Une modification de priorite ou de date apparait en suppression + ajout.'
      )
    from paired
    cross join lateral (
      select array_remove(array[
        case when paired.base_remise_ha is distinct from paired.target_remise_ha then 'remise_ha' end,
        case when paired.base_col_ha is distinct from paired.target_col_ha then 'col_ha' end,
        case when paired.base_borne_acha is distinct from paired.target_borne_acha then 'borne_acha' end,
        case when paired.base_coef_retro is distinct from paired.target_coef_retro then 'coef_retro' end,
        case when paired.base_coef_ha is distinct from paired.target_coef_ha then 'coef_ha' end,
        case when paired.base_coef_majvte is distinct from paired.target_coef_majvte then 'coef_majvte' end
      ]::text[], null) as changed_columns
    ) as changed
    cross join lateral (
      select case
        when paired.base_id is null or paired.target_id is null
          then ${toTextArraySql(GRID_CHANGED_COLUMNS)}
        else changed.changed_columns
      end as changed_columns
    ) as row_diff
    where paired.base_id is null
      or paired.target_id is null
      or array_length(changed.changed_columns, 1) > 0
  `);
};

const insertAnomalyDiffs = async (
  db: DbExecutable,
  baseSnapshotId: string,
  targetSnapshotId: string,
  skippedFileKinds: PricingReferenceFileKind[],
): Promise<void> => {
  const skippedCondition = skippedFileKinds.length === 0
    ? sql`true`
    : sql`(file.file_kind is null or file.file_kind not in (${
      sql.join(
        skippedFileKinds.map((fileKind) => sql`${fileKind}`),
        sql`, `,
      )
    }))`;

  await db.execute(sql`
    with base_rows as (
      select
        anomaly.*,
        concat_ws('|', anomaly.type, coalesce(anomaly.object_type, ''), coalesce(anomaly.object_id, ''), array_to_string(anomaly.columns, ',')) as anomaly_key,
        row_number() over (
          partition by anomaly.type, anomaly.object_type, anomaly.object_id, array_to_string(anomaly.columns, ',')
          order by anomaly.severity, anomaly.message, anomaly.created_at
        ) as duplicate_rank
      from public.pricing_reference_anomalies anomaly
      left join public.pricing_reference_import_files file
        on file.id = anomaly.source_file_id
      where anomaly.snapshot_id = ${baseSnapshotId}
        and ${skippedCondition}
    ),
    target_rows as (
      select
        anomaly.*,
        concat_ws('|', anomaly.type, coalesce(anomaly.object_type, ''), coalesce(anomaly.object_id, ''), array_to_string(anomaly.columns, ',')) as anomaly_key,
        row_number() over (
          partition by anomaly.type, anomaly.object_type, anomaly.object_id, array_to_string(anomaly.columns, ',')
          order by anomaly.severity, anomaly.message, anomaly.created_at
        ) as duplicate_rank
      from public.pricing_reference_anomalies anomaly
      left join public.pricing_reference_import_files file
        on file.id = anomaly.source_file_id
      where anomaly.snapshot_id = ${targetSnapshotId}
        and ${skippedCondition}
    ),
    paired as (
      select
        base_rows.id as base_id,
        target_rows.id as target_id,
        base_rows.source_row_number as base_source_row_number,
        target_rows.source_row_number as target_source_row_number,
        base_rows.anomaly_key as base_anomaly_key,
        target_rows.anomaly_key as target_anomaly_key,
        base_rows.type as base_type,
        target_rows.type as target_type,
        base_rows.severity as base_severity,
        target_rows.severity as target_severity,
        base_rows.object_type as base_anomaly_object_type,
        target_rows.object_type as target_anomaly_object_type,
        base_rows.object_id as base_object_id,
        target_rows.object_id as target_object_id,
        base_rows.columns as base_columns,
        target_rows.columns as target_columns,
        base_rows.message as base_message,
        target_rows.message as target_message,
        base_rows.details as base_details,
        target_rows.details as target_details
      from base_rows
      full outer join target_rows
        on target_rows.anomaly_key = base_rows.anomaly_key
       and target_rows.duplicate_rank = base_rows.duplicate_rank
    )
    insert into public.pricing_reference_diffs (
      base_snapshot_id,
      target_snapshot_id,
      diff_type,
      object_type,
      object_key,
      severity,
      changed_columns,
      payload
    )
    select
      ${baseSnapshotId},
      ${targetSnapshotId},
      case
        when paired.base_id is null then 'anomalie_apparue'
        else 'anomalie_disparue'
      end,
      'anomalie',
      coalesce(paired.target_anomaly_key, paired.base_anomaly_key),
      coalesce(paired.target_severity, paired.base_severity),
      array['anomaly_presence']::text[],
      jsonb_build_object(
        'changed_columns', array['anomaly_presence']::text[],
        'before', case when paired.base_id is null then null else jsonb_build_object(
          'type', paired.base_type,
          'severity', paired.base_severity,
          'object_type', paired.base_anomaly_object_type,
          'object_id', paired.base_object_id,
          'columns', paired.base_columns,
          'message', paired.base_message,
          'details', paired.base_details
        ) end,
        'after', case when paired.target_id is null then null else jsonb_build_object(
          'type', paired.target_type,
          'severity', paired.target_severity,
          'object_type', paired.target_anomaly_object_type,
          'object_id', paired.target_object_id,
          'columns', paired.target_columns,
          'message', paired.target_message,
          'details', paired.target_details
        ) end,
        'labels', jsonb_build_object(
          'type', coalesce(paired.target_type, paired.base_type),
          'object_type', coalesce(paired.target_anomaly_object_type, paired.base_anomaly_object_type),
          'object_id', coalesce(paired.target_object_id, paired.base_object_id)
        ),
        'source_row_numbers', jsonb_build_object(
          'before', case when paired.base_source_row_number is null then '[]'::jsonb else jsonb_build_array(paired.base_source_row_number) end,
          'after', case when paired.target_source_row_number is null then '[]'::jsonb else jsonb_build_array(paired.target_source_row_number) end
        )
      )
    from paired
    where paired.base_id is null
       or paired.target_id is null
  `);
};

const countRows = async (
  db: DbExecutable,
  query: SQL,
): Promise<number> => {
  const rows = await db.execute<{ count: number | string }>(query);
  return toCount(rows[0]?.count);
};

const getSnapshotCounters = async (
  db: DbExecutable,
  snapshotId: string,
): Promise<SnapshotCounters> => {
  const [classifications, segments, liaisons, grilles, anomalies] =
    await Promise.all([
      countRows(
        db,
        sql`select count(*)::int as count from public.pricing_classification_cir where snapshot_id = ${snapshotId}`,
      ),
      countRows(
        db,
        sql`select count(*)::int as count from public.pricing_supplier_segments where snapshot_id = ${snapshotId}`,
      ),
      countRows(
        db,
        sql`select count(*)::int as count from public.pricing_segment_classification_links where snapshot_id = ${snapshotId}`,
      ),
      countRows(
        db,
        sql`select count(*)::int as count from public.pricing_segment_purchase_grids where snapshot_id = ${snapshotId}`,
      ),
      countRows(
        db,
        sql`select count(*)::int as count from public.pricing_reference_anomalies where snapshot_id = ${snapshotId}`,
      ),
    ]);

  return { classifications, segments, liaisons, grilles, anomalies };
};

const getBaseCountForObject = (
  counters: SnapshotCounters,
  objectType: PricingReferenceDiffObjectType,
): number => {
  switch (objectType) {
    case "classification":
      return counters.classifications;
    case "segment":
      return counters.segments;
    case "liaison":
      return counters.liaisons;
    case "grille":
      return counters.grilles;
    case "anomalie":
      return counters.anomalies;
  }
};

const buildDiffSummary = async (
  db: DbExecutable,
  input: {
    runId: string;
    baseSnapshotId: string | null;
    targetSnapshotId: string;
    initialImport: boolean;
    skippedFileKinds: PricingReferenceFileKind[];
    computedAt: string;
  },
): Promise<DiffSummaryPayload> => {
  const [baseCounters, targetCounters] = await Promise.all([
    input.baseSnapshotId
      ? getSnapshotCounters(db, input.baseSnapshotId)
      : Promise.resolve(null),
    getSnapshotCounters(db, input.targetSnapshotId),
  ]);

  const pairCondition = sql`
    target_snapshot_id = ${input.targetSnapshotId}
    and base_snapshot_id is not distinct from ${input.baseSnapshotId}::uuid
  `;

  const [
    totalRows,
    matrixRows,
    objectSeverityRows,
    changedColumnRows,
    financialChangeRows,
    deletedRows,
  ] = await Promise.all([
    db.execute<{ count: number | string }>(sql`
      select count(*)::int as count
      from public.pricing_reference_diffs
      where ${pairCondition}
    `),
    db.execute<{
      object_type: PricingReferenceDiffObjectType;
      diff_type: PricingReferenceDiffType;
      count: number | string;
    }>(sql`
      select object_type, diff_type, count(*)::int as count
      from public.pricing_reference_diffs
      where ${pairCondition}
      group by object_type, diff_type
      order by object_type, diff_type
    `),
    db.execute<{
      object_type: PricingReferenceDiffObjectType;
      severity: PricingReferenceAnomalySeverity;
      count: number | string;
    }>(sql`
      select object_type, severity, count(*)::int as count
      from public.pricing_reference_diffs
      where ${pairCondition}
      group by object_type, severity
      order by object_type, severity
    `),
    db.execute<{ column: string; count: number | string }>(sql`
      select column_name as column, count(*)::int as count
      from public.pricing_reference_diffs,
        unnest(changed_columns) as column_name
      where ${pairCondition}
      group by column_name
      order by count(*) desc, column_name asc
      limit 50
    `),
    db.execute<{ count: number | string }>(sql`
      select count(*)::int as count
      from public.pricing_reference_diffs
      where ${pairCondition}
        and changed_columns && ${toTextArraySql(FINANCIAL_CHANGE_COLUMNS)}
    `),
    db.execute<{
      object_type: PricingReferenceDiffObjectType;
      count: number | string;
    }>(sql`
      select object_type, count(*)::int as count
      from public.pricing_reference_diffs
      where ${pairCondition}
        and diff_type = 'supprime'
      group by object_type
    `),
  ]);

  const objectSummary = DIFF_OBJECT_TYPES.map((objectType) => {
    const bySeverity = objectSeverityRows
      .filter((row) => row.object_type === objectType)
      .map((row) => ({
        severity: row.severity,
        count: toCount(row.count),
      }));
    return {
      object_type: objectType,
      total: bySeverity.reduce((total, row) => total + row.count, 0),
      by_severity: bySeverity,
    };
  }).filter((row) => row.total > 0);

  const deviationAlerts = baseCounters
    ? deletedRows.flatMap((row) => {
      const deletedCount = toCount(row.count);
      const baseCount = getBaseCountForObject(baseCounters, row.object_type);
      if (baseCount <= 0) return [];
      const suppressionRate = deletedCount / baseCount;
      if (suppressionRate <= 0.2) return [];
      return [{
        object_type: row.object_type,
        base_count: baseCount,
        deleted_count: deletedCount,
        suppression_rate: suppressionRate,
        severity: "haute" as const,
        message: `Suppressions importantes sur ${
          pricingReferenceDiffObjectTypeLabels[row.object_type]
        }: ${deletedCount}/${baseCount}.`,
      }];
    })
    : [];

  return {
    run_id: input.runId,
    base_snapshot_id: input.baseSnapshotId,
    target_snapshot_id: input.targetSnapshotId,
    status: "computed",
    initial_import: input.initialImport,
    skipped_file_kinds: input.skippedFileKinds,
    computed_at: input.computedAt,
    total: toCount(totalRows[0]?.count),
    counts_by_type: matrixRows.map((row) => ({
      object_type: row.object_type,
      diff_type: row.diff_type,
      count: toCount(row.count),
    })),
    counts_by_object_type: objectSummary,
    changed_columns: changedColumnRows.map((row) => ({
      column: row.column,
      count: toCount(row.count),
    })),
    financial_changes_count: toCount(financialChangeRows[0]?.count),
    deviation_alerts: deviationAlerts,
    snapshot_counters: {
      base: baseCounters,
      target: targetCounters,
    },
  };
};

const insertDiffRun = async (
  db: DbExecutable,
  summary: DiffSummaryPayload,
): Promise<void> => {
  await db.execute(sql`
    insert into public.pricing_reference_diff_runs (
      id,
      base_snapshot_id,
      target_snapshot_id,
      status,
      initial_import,
      skipped_file_kinds,
      summary,
      computed_at
    )
    values (
      ${summary.run_id},
      ${summary.base_snapshot_id}::uuid,
      ${summary.target_snapshot_id},
      'computed',
      ${summary.initial_import},
      ${toTextArraySql(summary.skipped_file_kinds)},
      ${JSON.stringify(summary)}::jsonb,
      ${summary.computed_at}
    )
  `);
};

export const computePricingReferenceDiff = async (
  db: DbClient,
  baseSnapshotId: string | null,
  targetSnapshotId: string,
): Promise<DiffSummaryPayload> => {
  await ensureSnapshotExists(db, targetSnapshotId);
  if (baseSnapshotId) {
    await ensureSnapshotExists(db, baseSnapshotId);
  }

  const runId = crypto.randomUUID();
  const computedAt = new Date().toISOString();
  const skippedFileKinds = await resolveSkippedFileKinds(
    db,
    baseSnapshotId,
    targetSnapshotId,
  );
  const initialImport = baseSnapshotId === null;

  return await withTransaction(db, async (tx) => {
    await clearExistingDiffRun(tx, baseSnapshotId, targetSnapshotId);

    if (!initialImport && baseSnapshotId) {
      const classificationSkipped = skippedFileKinds.includes("classification");
      const segmentsSkipped = skippedFileKinds.includes("segments_grids");
      if (!classificationSkipped) {
        await insertClassificationDiffs(tx, baseSnapshotId, targetSnapshotId);
      }
      if (!segmentsSkipped) {
        await insertSegmentDiffs(tx, baseSnapshotId, targetSnapshotId);
        await insertLiaisonDiffs(tx, baseSnapshotId, targetSnapshotId);
        await insertGridDiffs(tx, baseSnapshotId, targetSnapshotId);
      }
      if (!(classificationSkipped && segmentsSkipped)) {
        await insertAnomalyDiffs(
          tx,
          baseSnapshotId,
          targetSnapshotId,
          skippedFileKinds,
        );
      }
    }

    const summary = await buildDiffSummary(tx, {
      runId,
      baseSnapshotId,
      targetSnapshotId,
      initialImport,
      skippedFileKinds,
      computedAt,
    });
    await insertDiffRun(tx, summary);
    return summary;
  });
};

export const computePricingReferenceDiffBestEffort = async (
  db: DbClient,
  targetSnapshotId: string,
): Promise<void> => {
  try {
    const baseSnapshotId = await resolvePricingReferenceDiffBaseSnapshotId(
      db,
      targetSnapshotId,
    );
    await computePricingReferenceDiff(db, baseSnapshotId, targetSnapshotId);
  } catch (error) {
    const message = error instanceof Error
      ? error.message
      : "Diff referentiel impossible.";
    try {
      await db.execute(sql`
        update public.pricing_reference_imports import
        set error_details = concat_ws(
          E'\n',
          nullif(import.error_details, ''),
          ${`Diff referentiel non calcule: ${message}`}
        )
        from public.pricing_reference_snapshots snapshot
        where snapshot.id = ${targetSnapshotId}
          and snapshot.import_id = import.id
      `);
    } catch {
      // Preserve the import status if the non-blocking diff log update fails.
    }
  }
};

const loadDiffRun = async (
  db: DbExecutable,
  input: PricingReferenceDiffsSummaryGetInput | PricingReferenceDiffsListInput,
): Promise<DiffRunRow> => {
  if (input.run_id) {
    const rows = await db.execute<DiffRunRow>(sql`
      select
        id,
        base_snapshot_id,
        target_snapshot_id,
        status,
        initial_import,
        skipped_file_kinds,
        summary,
        computed_at
      from public.pricing_reference_diff_runs
      where id = ${input.run_id}
      limit 1
    `);
    const row = rows[0];
    if (row) return row;
  } else if (input.target_snapshot_id && hasOwn(input, "base_snapshot_id")) {
    const rows = await db.execute<DiffRunRow>(sql`
      select
        id,
        base_snapshot_id,
        target_snapshot_id,
        status,
        initial_import,
        skipped_file_kinds,
        summary,
        computed_at
      from public.pricing_reference_diff_runs
      where target_snapshot_id = ${input.target_snapshot_id}
        and base_snapshot_id is not distinct from ${
      input.base_snapshot_id ?? null
    }::uuid
      order by computed_at desc
      limit 1
    `);
    const row = rows[0];
    if (row) return row;
  } else if (input.target_snapshot_id) {
    const rows = await db.execute<DiffRunRow>(sql`
      select
        id,
        base_snapshot_id,
        target_snapshot_id,
        status,
        initial_import,
        skipped_file_kinds,
        summary,
        computed_at
      from public.pricing_reference_diff_runs
      where target_snapshot_id = ${input.target_snapshot_id}
      order by computed_at desc
      limit 1
    `);
    const row = rows[0];
    if (row) return row;
  }

  throw httpError(
    404,
    "PRICING_REFERENCE_DIFF_FAILED",
    "Comparaison referentiel introuvable.",
  );
};

const toSummaryResponse = (
  requestId: string,
  run: DiffRunRow | DiffSummaryPayload,
): PricingReferenceDiffsSummaryResponse => {
  const payload = "summary" in run ? run.summary : run;
  return pricingReferenceDiffsSummaryResponseSchema.parse({
    ...(payload as Record<string, unknown>),
    ok: true,
    request_id: requestId,
  });
};

const toComputeResponse = (
  requestId: string,
  summary: DiffRunRow | DiffSummaryPayload,
  cacheStatus: "computed" | "reused",
): PricingReferenceDiffsComputeResponse =>
  pricingReferenceDiffsComputeResponseSchema.parse({
    ...toSummaryResponse(requestId, summary),
    cache_status: cacheStatus,
  });

const loadCachedRunByPair = async (
  db: DbExecutable,
  baseSnapshotId: string | null,
  targetSnapshotId: string,
): Promise<DiffRunRow | null> => {
  const rows = await db.execute<DiffRunRow>(sql`
    select
      id,
      base_snapshot_id,
      target_snapshot_id,
      status,
      initial_import,
      skipped_file_kinds,
      summary,
      computed_at
    from public.pricing_reference_diff_runs
    where target_snapshot_id = ${targetSnapshotId}
      and base_snapshot_id is not distinct from ${baseSnapshotId}::uuid
    order by computed_at desc
    limit 1
  `);
  return rows[0] ?? null;
};

export const getPricingReferenceDiffSummary = async (
  db: DbClient,
  _callerId: string,
  requestId: string,
  input: PricingReferenceDiffsSummaryGetInput,
): Promise<PricingReferenceDiffsSummaryResponse> => {
  const run = await loadDiffRun(db, input);
  return toSummaryResponse(requestId, run);
};

const buildDiffListWhere = (
  run: DiffRunRow,
  input: PricingReferenceDiffsListInput,
): SQL => {
  const conditions: SQL[] = [
    sql`base_snapshot_id is not distinct from ${run.base_snapshot_id}::uuid`,
    sql`target_snapshot_id = ${run.target_snapshot_id}`,
  ];

  const severityCondition = toInCondition(
    sql`severity`,
    input.severities,
  );
  if (severityCondition) conditions.push(severityCondition);

  const diffTypeCondition = toInCondition(sql`diff_type`, input.diff_types);
  if (diffTypeCondition) conditions.push(diffTypeCondition);

  const objectTypeCondition = toInCondition(
    sql`object_type`,
    input.object_types,
  );
  if (objectTypeCondition) conditions.push(objectTypeCondition);

  if (input.changed_columns && input.changed_columns.length > 0) {
    conditions.push(
      sql`changed_columns && ${toTextArraySql(input.changed_columns)}`,
    );
  }

  if (input.marques && input.marques.length > 0) {
    conditions.push(sql`payload #>> '{labels,marque}' in (${
      sql.join(
        input.marques.map((marque) => sql`${marque}`),
        sql`, `,
      )
    })`);
  }

  if (input.search) {
    const pattern = `%${input.search.toLowerCase()}%`;
    conditions.push(sql`(
      lower(object_key) like ${pattern}
      or lower(payload #>> '{labels,segment}') like ${pattern}
      or lower(payload #>> '{labels,marque}') like ${pattern}
      or lower(payload #>> '{labels,cir_key}') like ${pattern}
      or lower(payload::text) like ${pattern}
    )`);
  }

  return toWhereSql(conditions);
};

const buildDiffListOrder = (input: PricingReferenceDiffsListInput): SQL => {
  const direction = input.sort_direction === "asc" ? sql`asc` : sql`desc`;
  const severityWeight = sql`
    case severity
      when 'bloquante' then 4
      when 'haute' then 3
      when 'moyenne' then 2
      else 1
    end
  `;
  if (input.sort_by === "created_at") {
    return sql`created_at ${direction}, object_type asc, object_key asc`;
  }
  if (input.sort_by === "object_type") {
    return sql`object_type ${direction}, ${severityWeight} desc, object_key asc`;
  }
  return sql`${severityWeight} ${direction}, object_type asc, object_key asc`;
};

export const listPricingReferenceDiffs = async (
  db: DbClient,
  _callerId: string,
  requestId: string,
  input: PricingReferenceDiffsListInput,
): Promise<PricingReferenceDiffsListResponse> => {
  const run = await loadDiffRun(db, input);
  const whereSql = buildDiffListWhere(run, input);
  const offset = (input.page - 1) * input.page_size;

  const [totalRows, rows] = await Promise.all([
    db.execute<{ count: number | string }>(sql`
      select count(*)::int as count
      from public.pricing_reference_diffs
      where ${whereSql}
    `),
    db.execute<DiffRowRecord>(sql`
      select
        id,
        base_snapshot_id,
        target_snapshot_id,
        diff_type,
        object_type,
        object_key,
        severity,
        changed_columns,
        payload,
        created_at
      from public.pricing_reference_diffs
      where ${whereSql}
      order by ${buildDiffListOrder(input)}
      limit ${input.page_size}
      offset ${offset}
    `),
  ]);

  return pricingReferenceDiffsListResponseSchema.parse({
    ok: true,
    request_id: requestId,
    run_id: run.id,
    base_snapshot_id: run.base_snapshot_id,
    target_snapshot_id: run.target_snapshot_id,
    total: toCount(totalRows[0]?.count),
    rows: rows.map((row) => ({
      ...row,
      changed_columns: row.changed_columns ?? [],
      payload: normalizePayload(row.payload),
    })),
  });
};

export const computePricingReferenceDiffForRoute = async (
  db: DbClient,
  callerId: string,
  requestId: string,
  input: PricingReferenceDiffsComputeInput,
): Promise<PricingReferenceDiffsComputeResponse> => {
  const allowed = await checkRateLimit(
    "pricing-reference-diffs:compute",
    callerId,
    {
      max: 10,
      windowSeconds: 300,
    },
  );
  if (!allowed) {
    throw httpError(
      429,
      "RATE_LIMITED",
      "Trop de requetes. Reessayez plus tard.",
    );
  }

  const baseSnapshotId = input.base_snapshot_id === undefined
    ? await resolvePricingReferenceDiffBaseSnapshotId(
      db,
      input.target_snapshot_id,
    )
    : input.base_snapshot_id;

  if (!input.force) {
    const cachedRun = await loadCachedRunByPair(
      db,
      baseSnapshotId,
      input.target_snapshot_id,
    );
    if (cachedRun) {
      return toComputeResponse(requestId, cachedRun, "reused");
    }
  }

  const summary = await computePricingReferenceDiff(
    db,
    baseSnapshotId,
    input.target_snapshot_id,
  );
  return toComputeResponse(requestId, summary, "computed");
};
