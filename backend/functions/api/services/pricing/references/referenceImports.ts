import { and, desc, eq, type SQL, sql } from "drizzle-orm";
import { strToU8, zipSync } from "fflate";
import {
  escapePricingReferenceLikeTerm,
  expandPricingReferenceSearchTerms,
  normalizePricingReferenceBrands,
} from "./referenceSemantics.ts";

import {
  pricing_reference_anomalies,
  pricing_reference_column_mapping_profiles,
  pricing_reference_import_files,
  pricing_reference_imports,
  pricing_reference_snapshots,
} from "../../../../../drizzle/schema.ts";
import {
  PRICING_REFERENCE_ANOMALY_DEFAULT_MARQUE,
  PRICING_REFERENCE_CLASSIFICATION_COLUMNS,
  PRICING_REFERENCE_SEGMENTS_GRIDS_COLUMNS,
  PRICING_REFERENCE_STORAGE_BUCKET,
  PRICING_REFERENCE_XLSX_MIME,
  type PricingReferenceAnomaliesExportFile,
  type PricingReferenceAnomaliesExportInput,
  type PricingReferenceAnomaliesExportResponse,
  pricingReferenceAnomaliesExportResponseSchema,
  type PricingReferenceAnomaliesListInput,
  type PricingReferenceAnomaliesListResponse,
  type PricingReferenceAnomaliesSortBy,
  type PricingReferenceAnomaliesSummaryGetInput,
  type PricingReferenceAnomaliesSummaryResponse,
  type PricingReferenceAnomalySeverity,
  pricingReferenceAnomalySeverityLabels,
  type PricingReferenceAnomalyType,
  pricingReferenceAnomalyTypeActionLabels,
  pricingReferenceAnomalyTypeLabels,
  type PricingReferenceClassificationListAllInput,
  type PricingReferenceClassificationListAllResponse,
  type PricingReferenceClassificationListInput,
  type PricingReferenceClassificationListResponse,
  type PricingReferenceClassificationSortBy,
  type PricingReferenceColumnAliases,
  pricingReferenceColumnAliasesSchema,
  type PricingReferenceColumnMapping,
  type PricingReferenceColumnMappingProfile,
  pricingReferenceColumnMappingProfileSchema,
  pricingReferenceColumnMappingSchema,
  type PricingReferenceEffectiveImportFile,
  type PricingReferenceFileKind,
  type PricingReferenceHealthGetResponse,
  type PricingReferenceHealthReport,
  pricingReferenceHealthReportSchema,
  type PricingReferenceImportAnalyzeInput,
  type PricingReferenceImportAnalyzeResponse,
  type PricingReferenceImportAssistMappingInput,
  type PricingReferenceImportAssistMappingResponse,
  pricingReferenceImportAssistMappingResponseSchema,
  type PricingReferenceImportConfirmMappingInput,
  type PricingReferenceImportConfirmMappingResponse,
  pricingReferenceImportConfirmMappingResponseSchema,
  type PricingReferenceImportGetInput,
  type PricingReferenceImportGetResponse,
  type PricingReferenceImportInspectInput,
  type PricingReferenceImportInspectResponse,
  pricingReferenceImportInspectResponseSchema,
  type PricingReferenceImportsListInput,
  type PricingReferenceImportsListResponse,
  type PricingReferenceImportsPrepareInput,
  type PricingReferenceImportsPrepareResponse,
  type PricingReferenceImportStatus,
  type PricingReferenceLinkStatus,
  type PricingReferenceRowsListInput,
  type PricingReferenceSegmentDetailInput,
  type PricingReferenceSegmentDetailResponse,
  pricingReferenceSegmentDetailResponseSchema,
  type PricingReferenceSegmentsListInput,
  type PricingReferenceSegmentsListResponse,
  type PricingReferenceSegmentsSortBy,
  type PricingReferenceSnapshotStatus,
  type PricingReferenceSortDirection,
} from "../../../../../../shared/schemas/pricing/references.schema.ts";
import { getSupabaseAdmin } from "../../../middleware/auth/auth.ts";
import { httpError } from "../../../middleware/errorHandler.ts";
import type { DbClient } from "../../../types.ts";
import { checkRateLimit } from "../../rate-limiting/rateLimit.ts";
import { computePricingReferenceDiffBestEffort } from "./referenceDiffs.ts";
import {
  analyzePricingReferenceWorkbooks,
  computeSha256,
  ensurePricingReferenceFileAccepted,
  getPricingReferenceExpectedColumns,
  inspectPricingReferenceWorkbook,
  type ParsedClassificationRow,
  type ParsedReferenceAnomaly,
  type ParsedSegmentClassificationLinkRow,
  type ParsedSegmentPurchaseGridRow,
  type ParsedSupplierSegmentRow,
  type PricingReferenceAnalysisResult,
} from "./referenceExcelParser.ts";

type ImportFileRow = typeof pricing_reference_import_files.$inferSelect;
type ImportRow = typeof pricing_reference_imports.$inferSelect;
type SnapshotRow = typeof pricing_reference_snapshots.$inferSelect;
type ColumnMappingProfileRow =
  typeof pricing_reference_column_mapping_profiles.$inferSelect;
type ReusableImportFileSourceRow = {
  file_kind: PricingReferenceFileKind;
  sha256: string;
  import_id: string;
  source_import_created_at: string;
  snapshot_created_at: string;
};
type ImportActivationSummary = {
  import_id: string;
  is_active_version: boolean;
  snapshot_status: PricingReferenceSnapshotStatus;
  activated_at: string | null;
  deactivated_at: string | null;
};
export type PricingReferenceAnomalyQueryRow = {
  id: string;
  import_id: string;
  snapshot_id: string | null;
  source_file_id: string | null;
  source_file: {
    file_kind: PricingReferenceFileKind;
    original_filename: string;
  } | null;
  source_row_number: number | null;
  type: PricingReferenceAnomalyType;
  severity: PricingReferenceAnomalySeverity;
  object_type: string | null;
  object_id: string | null;
  columns: string[];
  message: string;
  details: Record<string, unknown>;
  created_at: string;
};
type PersistedAnalysisState = {
  snapshotId: string;
  importStatus: PricingReferenceImportStatus;
};
type JsonbRecordsetRow = Record<string, unknown>;
type JsonbRecordsetQueryFactory = (payload: string) => SQL;
export type PricingReferenceExportSourceRow = {
  file_kind: PricingReferenceFileKind;
  source_row_number: number;
  raw_values: Record<string, string>;
};

const SIGNED_UPLOAD_EXPIRES_IN_SECONDS = 60 * 60 * 2;
const EXPORT_SIGNED_URL_EXPIRES_IN_SECONDS = 60 * 60;
const EXPORT_RETENTION_DAYS = 7;
const ANOMALIES_EXPORT_MAX_ROWS = 50_000;
const INSERT_CHUNK_SIZE = 250;
const BULK_INSERT_CHUNK_SIZE = 1000;

const toOffset = (page: number, pageSize: number): number =>
  (page - 1) * pageSize;
const sortDirectionSql = (direction: PricingReferenceSortDirection): SQL =>
  direction === "desc" ? sql`desc` : sql`asc`;

const uniqueValues = <T>(values: T[]): T[] => Array.from(new Set(values));

const severityWeight: Record<PricingReferenceAnomalySeverity, number> = {
  bloquante: 4,
  haute: 3,
  moyenne: 2,
  faible: 1,
};

const severityFromWeight = (
  weight: number,
): PricingReferenceAnomalySeverity => {
  if (weight >= severityWeight.bloquante) return "bloquante";
  if (weight === severityWeight.haute) return "haute";
  if (weight === severityWeight.moyenne) return "moyenne";
  return "faible";
};

const anomalyMarqueSql = (): SQL =>
  sql`coalesce(
  nullif(trim(${pricing_reference_anomalies.details}->'raw_values'->>'MARQUE'), ''),
  nullif(trim(split_part(coalesce(${pricing_reference_anomalies.details}->>'segment_key', ${pricing_reference_anomalies.object_id}, ''), '|', 3)), ''),
  ${PRICING_REFERENCE_ANOMALY_DEFAULT_MARQUE}
)`;

const anomalySeverityWeightSql = (): SQL =>
  sql`case ${pricing_reference_anomalies.severity}
  when 'bloquante' then 4
  when 'haute' then 3
  when 'moyenne' then 2
  else 1
end`;

const classificationSortSql = (
  sortBy: PricingReferenceClassificationSortBy,
): SQL => {
  switch (sortBy) {
    case "cir_key":
      return sql`cir_key`;
    case "fam":
      return sql`fam`;
    case "sfa":
      return sql`sfa`;
    case "source_row_number":
      return sql`source_row_number`;
    case "mega":
    default:
      return sql`mega`;
  }
};

const segmentSortSql = (sortBy: PricingReferenceSegmentsSortBy): SQL => {
  switch (sortBy) {
    case "cat_fab":
      return sql`s.cat_fab`;
    case "segment":
      return sql`s.segment`;
    case "idnumerique":
      return sql`s.idnumerique`;
    case "link_status":
      return sql`l.link_status`;
    case "purchase_grid_rows_count":
      return sql`purchase_grid_rows_count`;
    case "source_row_number":
      return sql`s.source_row_number`;
    case "marque":
    default:
      return sql`s.marque`;
  }
};

const anomalySortSql = (sortBy: PricingReferenceAnomaliesSortBy): SQL => {
  switch (sortBy) {
    case "severity":
      return sql`pricing_reference_anomalies.severity`;
    case "type":
      return sql`pricing_reference_anomalies.type`;
    case "source_row_number":
      return sql`pricing_reference_anomalies.source_row_number`;
    case "created_at":
    default:
      return sql`pricing_reference_anomalies.created_at`;
  }
};

const optionalExactFilter = (
  column: SQL,
  value: string | undefined,
): SQL | null => {
  const normalized = value?.trim();
  return normalized
    ? sql<boolean>`lower(${column}) = ${normalized.toLowerCase()}`
    : null;
};

const andSql = (conditions: SQL[]): SQL =>
  conditions.length > 0 ? sql.join(conditions, sql` and `) : sql`true`;

const uniqueNonEmptyStrings = (values: string[] | undefined): string[] =>
  uniqueValues((values ?? []).map((value) => value.trim()).filter(Boolean));

const inValuesSql = (column: SQL, values: string[] | undefined): SQL | null => {
  const normalized = uniqueNonEmptyStrings(values);
  return normalized.length > 0
    ? sql<boolean>`${column} in (${
      sql.join(normalized.map((value) => sql`${value}`), sql`, `)
    })`
    : null;
};

const anomalySearchSql = (search: string | undefined): SQL | null => {
  const pattern = searchPattern(search);
  return pattern
    ? sql<boolean>`(
      lower(${pricing_reference_anomalies.message}) like ${pattern}
      or lower(coalesce(${pricing_reference_anomalies.object_type}, '')) like ${pattern}
      or lower(coalesce(${pricing_reference_anomalies.object_id}, '')) like ${pattern}
      or lower(array_to_string(${pricing_reference_anomalies.columns}, ' ')) like ${pattern}
      or lower(coalesce(${pricing_reference_anomalies.details}::text, '')) like ${pattern}
    )`
    : null;
};

const buildAnomalyFilterConditions = (
  input: Pick<
    PricingReferenceAnomaliesListInput,
    "import_id" | "snapshot_id" | "search" | "severities" | "types" | "marques"
  >,
  snapshotId: string | null,
  omittedFacet?: "severities" | "types" | "marques",
): SQL[] => {
  const conditions: SQL[] = [];
  if (input.import_id) {
    conditions.push(eq(pricing_reference_anomalies.import_id, input.import_id));
  }
  if (snapshotId) {
    conditions.push(eq(pricing_reference_anomalies.snapshot_id, snapshotId));
  }
  if (omittedFacet !== "severities") {
    const severityFilter = inValuesSql(
      sql`${pricing_reference_anomalies.severity}`,
      input.severities,
    );
    if (severityFilter) conditions.push(severityFilter);
  }
  if (omittedFacet !== "types") {
    const typeFilter = inValuesSql(
      sql`${pricing_reference_anomalies.type}`,
      input.types,
    );
    if (typeFilter) conditions.push(typeFilter);
  }
  if (omittedFacet !== "marques") {
    const marqueFilter = inValuesSql(anomalyMarqueSql(), input.marques);
    if (marqueFilter) conditions.push(marqueFilter);
  }
  const searchFilter = anomalySearchSql(input.search);
  if (searchFilter) conditions.push(searchFilter);
  return conditions;
};

const normalizeFilename = (filename: string): string =>
  filename
    .trim()
    .replace(/[^a-zA-Z0-9._-]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");

const flushJsonbRecordsetInsert = async (
  tx: DbClient,
  chunk: JsonbRecordsetRow[],
  buildQuery: JsonbRecordsetQueryFactory,
): Promise<void> => {
  if (chunk.length === 0) return;
  const payload = JSON.stringify(chunk);
  chunk.length = 0;
  await tx.execute(buildQuery(payload));
};

const assertHealthReport = (value: unknown) => {
  if (value === null || value === undefined) return null;
  const parsed = pricingReferenceHealthReportSchema.safeParse(value);
  if (!parsed.success) {
    throw httpError(
      500,
      "DB_READ_FAILED",
      "Rapport de sante referentiel invalide.",
    );
  }
  return parsed.data;
};

const assertColumnMapping = (value: unknown): PricingReferenceColumnMapping => {
  const parsed = pricingReferenceColumnMappingSchema.safeParse(value ?? {});
  if (!parsed.success) {
    throw httpError(
      500,
      "DB_READ_FAILED",
      "Mapping de colonnes referentiel invalide.",
      parsed.error.issues.map((issue) => issue.message).join(" | "),
    );
  }
  return parsed.data;
};

const assertColumnAliases = (value: unknown): PricingReferenceColumnAliases => {
  const parsed = pricingReferenceColumnAliasesSchema.safeParse(value ?? {});
  if (!parsed.success) {
    throw httpError(
      500,
      "DB_READ_FAILED",
      "Alias de colonnes referentiel invalides.",
      parsed.error.issues.map((issue) => issue.message).join(" | "),
    );
  }
  return parsed.data;
};

const toColumnMappingProfile = (
  row: ColumnMappingProfileRow,
): PricingReferenceColumnMappingProfile => {
  const parsed = pricingReferenceColumnMappingProfileSchema.safeParse({
    id: row.id,
    file_kind: row.file_kind,
    name: row.name,
    column_mapping: row.column_mapping,
    aliases: row.aliases,
    is_default: row.is_default,
    created_by: row.created_by,
    updated_by: row.updated_by,
    created_at: row.created_at,
    updated_at: row.updated_at,
  });
  if (!parsed.success) {
    throw httpError(
      500,
      "DB_READ_FAILED",
      "Profil de mapping referentiel invalide.",
      parsed.error.issues.map((issue) => issue.message).join(" | "),
    );
  }
  return parsed.data;
};

const getDefaultColumnMappingProfile = async (
  db: DbClient,
  fileKind: PricingReferenceFileKind,
): Promise<PricingReferenceColumnMappingProfile | null> => {
  const [row] = await db
    .select()
    .from(pricing_reference_column_mapping_profiles)
    .where(and(
      eq(pricing_reference_column_mapping_profiles.file_kind, fileKind),
      eq(pricing_reference_column_mapping_profiles.is_default, true),
    ))
    .limit(1);

  return row ? toColumnMappingProfile(row) : null;
};

const requireImport = async (
  db: DbClient,
  importId: string,
): Promise<ImportRow> => {
  const [row] = await db
    .select()
    .from(pricing_reference_imports)
    .where(eq(pricing_reference_imports.id, importId))
    .limit(1);

  if (!row) {
    throw httpError(
      404,
      "PRICING_REFERENCE_IMPORT_NOT_FOUND",
      "Import referentiel introuvable.",
    );
  }

  return row;
};

const requireImportFile = async (
  db: DbClient,
  importId: string,
  fileId: string,
  fileKind: PricingReferenceFileKind,
): Promise<ImportFileRow> => {
  const [row] = await db
    .select()
    .from(pricing_reference_import_files)
    .where(and(
      eq(pricing_reference_import_files.id, fileId),
      eq(pricing_reference_import_files.import_id, importId),
      eq(pricing_reference_import_files.file_kind, fileKind),
    ))
    .limit(1);

  if (!row) {
    throw httpError(
      404,
      "PRICING_REFERENCE_IMPORT_FILE_NOT_FOUND",
      "Fichier d import referentiel introuvable.",
    );
  }

  return row;
};

const getImportFiles = async (
  db: DbClient,
  importId: string,
): Promise<ImportFileRow[]> =>
  await db
    .select()
    .from(pricing_reference_import_files)
    .where(eq(pricing_reference_import_files.import_id, importId));

const sqlValues = (values: string[]) =>
  sql.join(values.map((value) => sql`${value}`), sql`, `);

const effectiveFileKey = (
  fileKind: PricingReferenceFileKind,
  sha256: string,
): string => `${fileKind}:${sha256.toLowerCase()}`;

const toTimestamp = (value: string | null | undefined): number | null => {
  if (!value) return null;
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? timestamp : null;
};

const getAnalysisCutoff = (row: ImportRow): number | null =>
  toTimestamp(
    row.analysis_started_at ?? row.analysis_completed_at ?? row.created_at,
  );

const groupImportFilesByImportId = (
  files: ImportFileRow[],
): Map<string, ImportFileRow[]> => {
  const grouped = new Map<string, ImportFileRow[]>();
  files.forEach((file) => {
    const current = grouped.get(file.import_id) ?? [];
    current.push(file);
    grouped.set(file.import_id, current);
  });
  return grouped;
};

const getImportFilesByImportIds = async (
  db: DbClient,
  importIds: string[],
): Promise<ImportFileRow[]> => {
  const uniqueImportIds = Array.from(new Set(importIds));
  if (uniqueImportIds.length === 0) return [];

  return await db.execute<ImportFileRow>(sql`
    select *
    from public.pricing_reference_import_files
    where import_id in (${sqlValues(uniqueImportIds)})
    order by import_id asc, file_kind asc, created_at desc
  `);
};

const getImportActivationSummaries = async (
  db: DbClient,
  importIds: string[],
): Promise<Map<string, ImportActivationSummary>> => {
  const uniqueImportIds = Array.from(new Set(importIds));
  const summaries = new Map<string, ImportActivationSummary>();
  if (uniqueImportIds.length === 0) return summaries;

  const rows = await db.execute<ImportActivationSummary>(sql`
    select
      import_id,
      is_active as is_active_version,
      status as snapshot_status,
      activated_at,
      deactivated_at
    from public.pricing_reference_snapshots
    where import_id in (${sqlValues(uniqueImportIds)})
  `);

  rows.forEach((row) => summaries.set(row.import_id, row));
  return summaries;
};

const getReusableImportFileSources = async (
  db: DbClient,
  files: Pick<PricingReferenceEffectiveImportFile, "file_kind" | "sha256">[],
): Promise<ReusableImportFileSourceRow[]> => {
  const uniquePairs = Array.from(
    new Map(
      files.map((file) => [
        effectiveFileKey(file.file_kind, file.sha256),
        file,
      ]),
    ).values(),
  );
  if (uniquePairs.length === 0) return [];

  const pairValues = sql.join(
    uniquePairs.map((file) => sql`(${file.file_kind}, ${file.sha256})`),
    sql`, `,
  );

  return await db.execute<ReusableImportFileSourceRow>(sql`
    select
      f.file_kind,
      f.sha256,
      f.import_id,
      i.created_at as source_import_created_at,
      s.created_at as snapshot_created_at
    from public.pricing_reference_import_files f
    join public.pricing_reference_imports i on i.id = f.import_id
    join public.pricing_reference_snapshots s on s.import_id = i.id
    where (f.file_kind, f.sha256) in (${pairValues})
    order by f.file_kind asc, f.sha256 asc, s.created_at desc
  `);
};

const toEffectiveFileFromAttached = (
  file: ImportFileRow,
): PricingReferenceEffectiveImportFile => ({
  file_kind: file.file_kind,
  original_filename: file.original_filename,
  size_bytes: file.size_bytes,
  sha256: file.sha256,
  row_count: file.row_count,
  source: "fourni",
  source_import_id: null,
  source_import_created_at: null,
});

const toEffectiveFileFromHealth = (
  file: PricingReferenceHealthReport["files"][PricingReferenceFileKind],
  source: Pick<
    PricingReferenceEffectiveImportFile,
    "source" | "source_import_id" | "source_import_created_at"
  >,
): PricingReferenceEffectiveImportFile => ({
  file_kind: file.file_kind,
  original_filename: file.original_filename,
  size_bytes: file.size_bytes,
  sha256: file.sha256,
  row_count: file.rows_count,
  ...source,
});

const selectReusableImportFileSource = (
  row: ImportRow,
  file: Pick<PricingReferenceEffectiveImportFile, "file_kind" | "sha256">,
  sourcesByFile: Map<string, ReusableImportFileSourceRow[]>,
): ReusableImportFileSourceRow | null => {
  const cutoff = getAnalysisCutoff(row);
  const candidates =
    sourcesByFile.get(effectiveFileKey(file.file_kind, file.sha256))
      ?.filter((source) => source.import_id !== row.id) ?? [];

  if (cutoff === null) return candidates[0] ?? null;
  return candidates.find((source) => {
    const sourceTimestamp = toTimestamp(source.snapshot_created_at);
    return sourceTimestamp !== null && sourceTimestamp <= cutoff;
  }) ?? null;
};

const resolveEffectiveImportFiles = async (
  db: DbClient,
  rows: ImportRow[],
  filesByImportId: Map<string, ImportFileRow[]>,
): Promise<Map<string, PricingReferenceEffectiveImportFile[]>> => {
  const draftsByImportId = new Map<
    string,
    {
      file: PricingReferenceEffectiveImportFile;
      needsSourceResolution: boolean;
    }[]
  >();
  const reusedFilesToResolve: Pick<
    PricingReferenceEffectiveImportFile,
    "file_kind" | "sha256"
  >[] = [];

  rows.forEach((row) => {
    const health = assertHealthReport(row.health_report);
    const attachedFiles = filesByImportId.get(row.id) ?? [];
    const attachedKeys = new Set(
      attachedFiles.map((file) =>
        effectiveFileKey(file.file_kind, file.sha256)
      ),
    );

    if (!health) {
      draftsByImportId.set(
        row.id,
        attachedFiles.map((file) => ({
          file: toEffectiveFileFromAttached(file),
          needsSourceResolution: false,
        })),
      );
      return;
    }

    const effectiveFiles = [
      health.files.classification,
      health.files.segments_grids,
    ].map((file) => {
      const isProvided = attachedKeys.has(
        effectiveFileKey(file.file_kind, file.sha256),
      );
      if (isProvided) {
        return {
          file: toEffectiveFileFromHealth(file, {
            source: "fourni",
            source_import_id: null,
            source_import_created_at: null,
          }),
          needsSourceResolution: false,
        };
      }

      reusedFilesToResolve.push({
        file_kind: file.file_kind,
        sha256: file.sha256,
      });
      return {
        file: toEffectiveFileFromHealth(file, {
          source: "reutilise",
          source_import_id: null,
          source_import_created_at: null,
        }),
        needsSourceResolution: true,
      };
    });

    draftsByImportId.set(row.id, effectiveFiles);
  });

  const sourceRows = await getReusableImportFileSources(
    db,
    reusedFilesToResolve,
  );
  const sourcesByFile = new Map<string, ReusableImportFileSourceRow[]>();
  sourceRows.forEach((source) => {
    const key = effectiveFileKey(source.file_kind, source.sha256);
    const current = sourcesByFile.get(key) ?? [];
    current.push(source);
    sourcesByFile.set(key, current);
  });

  const resolved = new Map<string, PricingReferenceEffectiveImportFile[]>();
  rows.forEach((row) => {
    const drafts = draftsByImportId.get(row.id) ?? [];
    resolved.set(
      row.id,
      drafts.map((draft) => {
        if (!draft.needsSourceResolution) return draft.file;
        const source = selectReusableImportFileSource(
          row,
          draft.file,
          sourcesByFile,
        );
        return {
          ...draft.file,
          source_import_id: source?.import_id ?? null,
          source_import_created_at: source?.source_import_created_at ?? null,
        };
      }),
    );
  });

  return resolved;
};

const getCurrentImportFiles = async (
  db: DbClient,
  importId: string,
): Promise<Partial<Record<PricingReferenceFileKind, ImportFileRow>>> => {
  const files = await getImportFiles(db, importId);
  const classification = files.find((file) =>
    file.file_kind === "classification"
  );
  const segments = files.find((file) => file.file_kind === "segments_grids");

  return {
    ...(classification ? { classification } : {}),
    ...(segments ? { segments_grids: segments } : {}),
  };
};

const getLatestReusableImportFile = async (
  db: DbClient,
  importId: string,
  fileKind: PricingReferenceFileKind,
): Promise<ImportFileRow | null> => {
  const rows = await db.execute<ImportFileRow>(sql`
    with active_file as (
      select f.*
      from public.pricing_reference_import_files f
      join public.pricing_reference_snapshots s on s.import_id = f.import_id
      where f.file_kind = ${fileKind}
        and f.import_id <> ${importId}
        and s.is_active = true
      order by s.activated_at desc nulls last, s.created_at desc
      limit 1
    ),
    fallback_file as (
      select f.*
      from public.pricing_reference_import_files f
      join public.pricing_reference_imports i on i.id = f.import_id
      join public.pricing_reference_snapshots s on s.import_id = i.id
      where f.file_kind = ${fileKind}
        and f.import_id <> ${importId}
        and i.status = 'analyse_ok'
        and not exists (select 1 from active_file)
      order by i.analysis_completed_at desc nulls last, s.created_at desc
      limit 1
    )
    select *
    from active_file
    union all
    select *
    from fallback_file
    limit 1
  `);

  return rows[0] ?? null;
};

const resolveAnalysisFiles = async (
  db: DbClient,
  importId: string,
): Promise<
  { classification: ImportFileRow; segments_grids: ImportFileRow }
> => {
  const currentFiles = await getCurrentImportFiles(db, importId);
  if (!currentFiles.classification && !currentFiles.segments_grids) {
    throw httpError(
      400,
      "PRICING_REFERENCE_IMPORT_INVALID_FILE",
      "Aucun fichier referentiel CIR n a ete fourni.",
    );
  }

  const [classificationFallback, segmentsFallback] = await Promise.all([
    currentFiles.classification
      ? Promise.resolve(null)
      : getLatestReusableImportFile(db, importId, "classification"),
    currentFiles.segments_grids
      ? Promise.resolve(null)
      : getLatestReusableImportFile(db, importId, "segments_grids"),
  ]);

  const classification = currentFiles.classification ?? classificationFallback;
  const segments = currentFiles.segments_grids ?? segmentsFallback;

  if (!classification) {
    throw httpError(
      400,
      "PRICING_REFERENCE_IMPORT_INVALID_FILE",
      "Le fichier classification CIR est requis car aucun import precedent ne permet de le reutiliser.",
    );
  }
  if (!segments) {
    throw httpError(
      400,
      "PRICING_REFERENCE_IMPORT_INVALID_FILE",
      "Le fichier segments/grilles fabricant est requis car aucun import precedent ne permet de le reutiliser.",
    );
  }

  return { classification, segments_grids: segments };
};

export const assertPricingReferenceCurrentMappingsConfirmed = (
  currentFiles: Partial<Record<PricingReferenceFileKind, ImportFileRow>>,
): void => {
  for (const file of Object.values(currentFiles)) {
    if (!file) continue;
    if (file.mapping_status === "confirme") continue;
    throw httpError(
      400,
      "PRICING_REFERENCE_MAPPING_REQUIRED",
      `Confirmez le mapping des colonnes pour ${file.original_filename} avant analyse.`,
    );
  }
};

const toParserFileInput = (
  file: ImportFileRow,
  bytes: Uint8Array,
  sha256: string,
) => ({
  file_kind: file.file_kind,
  original_filename: file.original_filename,
  bytes,
  sha256,
  storage_path: file.storage_path,
  sheet_name: file.sheet_name,
  column_mapping: file.mapping_status === "confirme"
    ? assertColumnMapping(file.column_mapping)
    : null,
});

const createSignedUpload = async (path: string) => {
  const { data, error } = await getSupabaseAdmin()
    .storage
    .from(PRICING_REFERENCE_STORAGE_BUCKET)
    .createSignedUploadUrl(path);

  if (error || !data?.signedUrl) {
    throw httpError(
      500,
      "PRICING_REFERENCE_IMPORT_STORAGE_FAILED",
      "Impossible de preparer l upload du fichier referentiel.",
      error?.message,
    );
  }

  return {
    signed_upload_url: data.signedUrl,
    signed_upload_token: data.token ?? null,
  };
};

const downloadStorageBytes = async (
  file: ImportFileRow,
): Promise<Uint8Array> => {
  const { data, error } = await getSupabaseAdmin()
    .storage
    .from(file.storage_bucket)
    .download(file.storage_path);

  if (error || !data) {
    throw httpError(
      500,
      "PRICING_REFERENCE_IMPORT_STORAGE_FAILED",
      `Impossible de telecharger le fichier ${file.original_filename}.`,
      error?.message,
    );
  }

  return new Uint8Array(await data.arrayBuffer());
};

const assertDownloadedFileMatchesMetadata = async (
  file: ImportFileRow,
  bytes: Uint8Array,
): Promise<string> => {
  ensurePricingReferenceFileAccepted(
    file.file_kind,
    file.original_filename,
    bytes.byteLength,
  );

  if (bytes.byteLength !== file.size_bytes) {
    throw httpError(
      409,
      "PRICING_REFERENCE_IMPORT_INVALID_FILE",
      `La taille du fichier ${file.original_filename} ne correspond pas aux metadata.`,
    );
  }

  const hash = await computeSha256(bytes);
  if (hash.toLowerCase() !== file.sha256.toLowerCase()) {
    throw httpError(
      409,
      "PRICING_REFERENCE_IMPORT_HASH_MISMATCH",
      `Le hash du fichier ${file.original_filename} ne correspond pas aux metadata.`,
    );
  }

  return hash;
};

const readErrorString = (error: unknown, key: string): string | null => {
  if (!error || typeof error !== "object") return null;
  const value = Reflect.get(error, key);
  return typeof value === "string" ? value : null;
};

const recordPricingReferenceAnalysisFailure = async (
  db: DbClient,
  importId: string,
  callerId: string,
  error: unknown,
): Promise<void> => {
  const message = error instanceof Error
    ? error.message
    : "Analyse referentiel impossible.";
  const details = readErrorString(error, "details");
  try {
    await db.update(pricing_reference_imports)
      .set({
        status: "analyse_erreur",
        analyzed_by: callerId,
        analysis_completed_at: new Date().toISOString(),
        error_code: readErrorString(error, "code") ?? "REQUEST_FAILED",
        error_message: message,
        error_details: details,
      })
      .where(eq(pricing_reference_imports.id, importId));
  } catch {
    // Preserve the original analysis error if the best-effort status update fails.
  }
};

const markPricingReferenceAnalysisProgress = async (
  db: DbClient,
  importId: string,
  callerId: string,
  details: string,
): Promise<void> => {
  await db.update(pricing_reference_imports)
    .set({
      status: "analyse_en_cours",
      analyzed_by: callerId,
      analysis_started_at: new Date().toISOString(),
      error_code: null,
      error_message: null,
      error_details: details,
    })
    .where(eq(pricing_reference_imports.id, importId));
};

export const preparePricingReferenceImport = async (
  db: DbClient,
  callerId: string,
  requestId: string,
  input: PricingReferenceImportsPrepareInput,
): Promise<PricingReferenceImportsPrepareResponse> => {
  const allowed = await checkRateLimit(
    "pricing-reference-imports:prepare",
    callerId,
    {
      max: 20,
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

  const importId = crypto.randomUUID();
  const nowPrefix = new Date().toISOString().slice(0, 10);
  const preparedFiles: Partial<
    Record<
      PricingReferenceFileKind,
      PricingReferenceImportsPrepareResponse["files"][PricingReferenceFileKind]
    >
  > = {};
  const fileRows: Array<typeof pricing_reference_import_files.$inferInsert> =
    [];

  for (const fileKind of ["classification", "segments_grids"] as const) {
    const fileInput = input.files[fileKind];
    if (!fileInput) continue;

    ensurePricingReferenceFileAccepted(
      fileKind,
      fileInput.original_filename,
      fileInput.size_bytes,
    );
    const fileId = crypto.randomUUID();
    const pathPrefix = fileKind === "classification"
      ? "classification"
      : "segments-grids";
    const storagePath = `imports/${nowPrefix}/${importId}/${pathPrefix}-${
      normalizeFilename(fileInput.original_filename)
    }`;
    const upload = await createSignedUpload(storagePath);
    const originalFilename = fileInput.original_filename.trim();
    const contentType = fileInput.content_type ?? PRICING_REFERENCE_XLSX_MIME;
    const sha256 = fileInput.sha256.toLowerCase();

    fileRows.push({
      id: fileId,
      import_id: importId,
      file_kind: fileKind,
      original_filename: originalFilename,
      storage_bucket: PRICING_REFERENCE_STORAGE_BUCKET,
      storage_path: storagePath,
      size_bytes: fileInput.size_bytes,
      sha256,
      content_type: contentType,
      uploaded_by: callerId,
    });

    preparedFiles[fileKind] = {
      id: fileId,
      file_kind: fileKind,
      original_filename: originalFilename,
      storage_bucket: PRICING_REFERENCE_STORAGE_BUCKET,
      storage_path: storagePath,
      size_bytes: fileInput.size_bytes,
      sha256,
      content_type: contentType,
      ...upload,
      signed_upload_expires_in_seconds: SIGNED_UPLOAD_EXPIRES_IN_SECONDS,
    };
  }

  await db.transaction(async (tx) => {
    await tx.insert(pricing_reference_imports).values({
      id: importId,
      status: "brouillon",
      created_by: callerId,
      counters: {},
    });

    await tx.insert(pricing_reference_import_files).values(fileRows);
  });

  return {
    ok: true,
    request_id: requestId,
    import_id: importId,
    status: "brouillon",
    files: preparedFiles,
  };
};

const buildSavedAliases = (
  currentAliases: PricingReferenceColumnAliases,
  mapping: PricingReferenceColumnMapping,
): PricingReferenceColumnAliases => {
  const aliases: PricingReferenceColumnAliases = { ...currentAliases };
  Object.entries(mapping).forEach(([canonicalColumn, sourceColumn]) => {
    const values = aliases[canonicalColumn] ?? [];
    aliases[canonicalColumn] = uniqueValues([
      ...values,
      sourceColumn,
    ]);
  });
  return aliases;
};

const validateConfirmedMapping = (
  file: ImportFileRow,
  sheetName: string,
  mapping: PricingReferenceColumnMapping,
): void => {
  if (file.sheet_name !== sheetName || file.detected_columns.length === 0) {
    throw httpError(
      400,
      "PRICING_REFERENCE_MAPPING_REQUIRED",
      "Previsualisez l onglet Excel avant de confirmer le mapping.",
    );
  }

  const expectedColumns = getPricingReferenceExpectedColumns(file.file_kind);
  const missingCanonicalColumns = expectedColumns.filter((column) =>
    !mapping[column]
  );
  if (missingCanonicalColumns.length > 0) {
    throw httpError(
      400,
      "PRICING_REFERENCE_MAPPING_REQUIRED",
      `Colonnes obligatoires non mappees: ${
        missingCanonicalColumns.join(", ")
      }.`,
    );
  }

  const invalidSourceColumns = expectedColumns
    .map((column) => mapping[column])
    .filter((sourceColumn): sourceColumn is string => Boolean(sourceColumn))
    .filter((sourceColumn) => !file.detected_columns.includes(sourceColumn));

  if (invalidSourceColumns.length > 0) {
    throw httpError(
      400,
      "PRICING_REFERENCE_MAPPING_INVALID",
      `Colonnes source introuvables dans l onglet: ${
        uniqueValues(invalidSourceColumns).join(", ")
      }.`,
    );
  }
};

const assertInspectResponse = (
  value: unknown,
): PricingReferenceImportInspectResponse => {
  const parsed = pricingReferenceImportInspectResponseSchema.safeParse(value);
  if (!parsed.success) {
    throw httpError(
      500,
      "REQUEST_FAILED",
      "Reponse inspection mapping invalide.",
      parsed.error.issues.map((issue) => issue.message).join(" | "),
    );
  }
  return parsed.data;
};

const assertConfirmMappingResponse = (
  value: unknown,
): PricingReferenceImportConfirmMappingResponse => {
  const parsed = pricingReferenceImportConfirmMappingResponseSchema.safeParse(
    value,
  );
  if (!parsed.success) {
    throw httpError(
      500,
      "REQUEST_FAILED",
      "Reponse confirmation mapping invalide.",
      parsed.error.issues.map((issue) => issue.message).join(" | "),
    );
  }
  return parsed.data;
};

const assertAssistMappingResponse = (
  value: unknown,
): PricingReferenceImportAssistMappingResponse => {
  const parsed = pricingReferenceImportAssistMappingResponseSchema.safeParse(
    value,
  );
  if (!parsed.success) {
    throw httpError(
      500,
      "REQUEST_FAILED",
      "Reponse assistance mapping invalide.",
      parsed.error.issues.map((issue) => issue.message).join(" | "),
    );
  }
  return parsed.data;
};

const assertAnomaliesExportResponse = (
  value: unknown,
): PricingReferenceAnomaliesExportResponse => {
  const parsed = pricingReferenceAnomaliesExportResponseSchema.safeParse(value);
  if (!parsed.success) {
    throw httpError(
      500,
      "REQUEST_FAILED",
      "Reponse export anomalies invalide.",
      parsed.error.issues.map((issue) => issue.message).join(" | "),
    );
  }
  return parsed.data;
};

export const inspectPricingReferenceImport = async (
  db: DbClient,
  callerId: string,
  requestId: string,
  input: PricingReferenceImportInspectInput,
): Promise<PricingReferenceImportInspectResponse> => {
  const allowed = await checkRateLimit(
    "pricing-reference-imports:inspect",
    callerId,
    {
      max: 30,
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

  await requireImport(db, input.import_id);
  const file = await requireImportFile(
    db,
    input.import_id,
    input.file_id,
    input.file_kind,
  );
  const defaultProfile = await getDefaultColumnMappingProfile(
    db,
    input.file_kind,
  );
  const bytes = await downloadStorageBytes(file);
  const sha256 = await assertDownloadedFileMatchesMetadata(file, bytes);
  const inspection = inspectPricingReferenceWorkbook(
    {
      file_kind: input.file_kind,
      original_filename: file.original_filename,
      bytes,
      sha256,
      storage_path: file.storage_path,
      sheet_name: input.sheet_name ?? file.sheet_name ?? null,
    },
    defaultProfile?.aliases ?? null,
    defaultProfile?.column_mapping ?? null,
  );

  await db.update(pricing_reference_import_files)
    .set({
      sheet_name: inspection.sheet_name,
      detected_columns: inspection.detected_columns,
      row_count: inspection.row_count,
      column_mapping: inspection.proposed_mapping,
      mapping_status: inspection.mapping_status,
    })
    .where(eq(pricing_reference_import_files.id, file.id));

  return assertInspectResponse({
    ok: true,
    request_id: requestId,
    import_id: input.import_id,
    file_id: file.id,
    file_kind: input.file_kind,
    original_filename: file.original_filename,
    ...inspection,
    default_profile: defaultProfile,
  });
};

export const assistPricingReferenceImportMapping = async (
  db: DbClient,
  callerId: string,
  requestId: string,
  input: PricingReferenceImportAssistMappingInput,
): Promise<PricingReferenceImportAssistMappingResponse> => {
  const inspection = await inspectPricingReferenceImport(
    db,
    callerId,
    requestId,
    input,
  );
  const mappedCandidates = inspection.candidates.filter((candidate) =>
    candidate.source_column
  );
  const confidentCandidates = inspection.candidates.filter((candidate) =>
    candidate.confidence >= 0.9
  );
  const worksheetScore = inspection.expected_columns.length === 0
    ? 0
    : mappedCandidates.length / inspection.expected_columns.length;
  const headerQuality = inspection.expected_columns.length === 0
    ? 0
    : confidentCandidates.length / inspection.expected_columns.length;
  const aiNeeded = inspection.mapping_status === "a_confirmer" ||
    inspection.mapping_status === "invalide";
  const missing = inspection.candidates
    .filter((candidate) => !candidate.source_column)
    .map((candidate) => candidate.canonical_column);
  const evidence = [
    `${mappedCandidates.length}/${inspection.expected_columns.length} colonne(s) mappees par le moteur deterministe.`,
    `${confidentCandidates.length}/${inspection.expected_columns.length} correspondance(s) a confiance forte.`,
    missing.length > 0
      ? `Colonnes a arbitrer: ${missing.join(", ")}.`
      : "Aucune colonne obligatoire manquante apres inspection.",
  ];

  return assertAssistMappingResponse({
    ok: true,
    request_id: requestId,
    import_id: inspection.import_id,
    file_id: inspection.file_id,
    file_kind: inspection.file_kind,
    sheet_name: inspection.sheet_name,
    mapping_status: inspection.mapping_status,
    ai_needed: aiNeeded,
    human_validation_required: true,
    worksheet_score: worksheetScore,
    header_quality: headerQuality,
    expected_columns: inspection.expected_columns,
    detected_columns: inspection.detected_columns,
    candidates: inspection.candidates,
    proposed_mapping: inspection.proposed_mapping,
    evidence,
    ai_policy: {
      trigger: aiNeeded ? "ambiguous_or_invalid_only" : "not_needed",
      response_schema: "strict_mapping_candidate",
      can_confirm_mapping: false,
    },
  });
};

export const confirmPricingReferenceImportMapping = async (
  db: DbClient,
  callerId: string,
  requestId: string,
  input: PricingReferenceImportConfirmMappingInput,
): Promise<PricingReferenceImportConfirmMappingResponse> => {
  const allowed = await checkRateLimit(
    "pricing-reference-imports:confirm-mapping",
    callerId,
    {
      max: 30,
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

  await requireImport(db, input.import_id);
  const file = await requireImportFile(
    db,
    input.import_id,
    input.file_id,
    input.file_kind,
  );
  validateConfirmedMapping(file, input.sheet_name, input.column_mapping);

  let savedProfile: PricingReferenceColumnMappingProfile | null = null;
  await db.transaction(async (tx) => {
    if (input.save_as_default) {
      const [currentProfile] = await tx
        .select()
        .from(pricing_reference_column_mapping_profiles)
        .where(and(
          eq(
            pricing_reference_column_mapping_profiles.file_kind,
            input.file_kind,
          ),
          eq(pricing_reference_column_mapping_profiles.is_default, true),
        ))
        .limit(1);

      const aliases = buildSavedAliases(
        currentProfile ? assertColumnAliases(currentProfile.aliases) : {},
        input.column_mapping,
      );

      const profileName = input.file_kind === "classification"
        ? "Mapping par defaut classification produit CIR"
        : "Mapping par defaut segments et grilles fabricant";

      const [profileRow] = currentProfile
        ? await tx.update(pricing_reference_column_mapping_profiles)
          .set({
            name: profileName,
            column_mapping: input.column_mapping,
            aliases,
            updated_by: callerId,
          })
          .where(
            eq(pricing_reference_column_mapping_profiles.id, currentProfile.id),
          )
          .returning()
        : await tx.insert(pricing_reference_column_mapping_profiles)
          .values({
            file_kind: input.file_kind,
            name: profileName,
            column_mapping: input.column_mapping,
            aliases,
            is_default: true,
            created_by: callerId,
            updated_by: callerId,
          })
          .returning();

      if (profileRow) savedProfile = toColumnMappingProfile(profileRow);
    }

    await tx.update(pricing_reference_import_files)
      .set({
        sheet_name: input.sheet_name,
        column_mapping: input.column_mapping,
        mapping_profile_id: savedProfile?.id ?? file.mapping_profile_id,
        mapping_status: "confirme",
        mapping_confirmed_by: callerId,
        mapping_confirmed_at: new Date().toISOString(),
      })
      .where(eq(pricing_reference_import_files.id, file.id));
  });

  return assertConfirmMappingResponse({
    ok: true,
    request_id: requestId,
    import_id: input.import_id,
    file_id: file.id,
    file_kind: input.file_kind,
    mapping_status: "confirme",
    column_mapping: input.column_mapping,
    saved_profile: savedProfile,
  });
};

const insertClassificationRows = async (
  tx: DbClient,
  snapshotId: string,
  importId: string,
  fileId: string,
  rows: ParsedClassificationRow[],
): Promise<Map<string, string>> => {
  const ids = new Map<string, string>();
  const chunk: JsonbRecordsetRow[] = [];
  const flush = () =>
    flushJsonbRecordsetInsert(tx, chunk, (payload) =>
      sql`
    insert into public.pricing_classification_cir (
      id,
      snapshot_id,
      import_id,
      source_file_id,
      source_row_number,
      mega,
      fam,
      sfa,
      mega_lib,
      fam_lib,
      sfa_lib,
      cir_key,
      raw_values,
      normalized_values
    )
    select
      x.id,
      x.snapshot_id,
      x.import_id,
      x.source_file_id,
      x.source_row_number,
      x.mega,
      x.fam,
      x.sfa,
      x.mega_lib,
      x.fam_lib,
      x.sfa_lib,
      x.cir_key,
      x.raw_values,
      x.normalized_values
    from jsonb_to_recordset(${payload}::jsonb) as x(
      id uuid,
      snapshot_id uuid,
      import_id uuid,
      source_file_id uuid,
      source_row_number integer,
      mega text,
      fam text,
      sfa text,
      mega_lib text,
      fam_lib text,
      sfa_lib text,
      cir_key text,
      raw_values jsonb,
      normalized_values jsonb
    )
  `);

  for (const row of rows) {
    const id = crypto.randomUUID();
    ids.set(row.cir_key, id);
    chunk.push({
      id,
      snapshot_id: snapshotId,
      import_id: importId,
      source_file_id: fileId,
      source_row_number: row.source_row_number,
      mega: row.mega,
      fam: row.fam,
      sfa: row.sfa,
      mega_lib: row.mega_lib,
      fam_lib: row.fam_lib,
      sfa_lib: row.sfa_lib,
      cir_key: row.cir_key,
      raw_values: row.raw_values,
      normalized_values: row.normalized_values,
    });
    if (chunk.length >= BULK_INSERT_CHUNK_SIZE) await flush();
  }
  await flush();
  return ids;
};

const insertSegmentRows = async (
  tx: DbClient,
  snapshotId: string,
  importId: string,
  fileId: string,
  rows: ParsedSupplierSegmentRow[],
): Promise<Map<string, string>> => {
  const ids = new Map<string, string>();
  const chunk: JsonbRecordsetRow[] = [];
  const flush = () =>
    flushJsonbRecordsetInsert(tx, chunk, (payload) =>
      sql`
    insert into public.pricing_supplier_segments (
      id,
      snapshot_id,
      import_id,
      source_file_id,
      source_row_number,
      segment,
      idnumerique,
      marque,
      cat_fab,
      cat_fab_l,
      strategiq,
      codif_fair,
      tarif_fab,
      segment_key,
      raw_values,
      normalized_values
    )
    select
      x.id,
      x.snapshot_id,
      x.import_id,
      x.source_file_id,
      x.source_row_number,
      x.segment,
      x.idnumerique,
      x.marque,
      x.cat_fab,
      x.cat_fab_l,
      x.strategiq,
      x.codif_fair,
      x.tarif_fab,
      x.segment_key,
      x.raw_values,
      x.normalized_values
    from jsonb_to_recordset(${payload}::jsonb) as x(
      id uuid,
      snapshot_id uuid,
      import_id uuid,
      source_file_id uuid,
      source_row_number integer,
      segment text,
      idnumerique text,
      marque text,
      cat_fab text,
      cat_fab_l text,
      strategiq text,
      codif_fair text,
      tarif_fab text,
      segment_key text,
      raw_values jsonb,
      normalized_values jsonb
    )
  `);

  for (const row of rows) {
    const id = crypto.randomUUID();
    ids.set(row.segment_key, id);
    chunk.push({
      id,
      snapshot_id: snapshotId,
      import_id: importId,
      source_file_id: fileId,
      source_row_number: row.source_row_number,
      segment: row.segment,
      idnumerique: row.idnumerique,
      marque: row.marque,
      cat_fab: row.cat_fab,
      cat_fab_l: row.cat_fab_l,
      strategiq: row.strategiq,
      codif_fair: row.codif_fair,
      tarif_fab: row.tarif_fab,
      segment_key: row.segment_key,
      raw_values: row.raw_values,
      normalized_values: row.normalized_values,
    });
    if (chunk.length >= BULK_INSERT_CHUNK_SIZE) await flush();
  }
  await flush();
  return ids;
};

const insertLinkRows = async (
  tx: DbClient,
  snapshotId: string,
  importId: string,
  fileId: string,
  rows: ParsedSegmentClassificationLinkRow[],
  segmentIds: Map<string, string>,
  classificationIds: Map<string, string>,
): Promise<void> => {
  const chunk: JsonbRecordsetRow[] = [];
  const flush = () =>
    flushJsonbRecordsetInsert(tx, chunk, (payload) =>
      sql`
    insert into public.pricing_segment_classification_links (
      snapshot_id,
      import_id,
      segment_id,
      classification_id,
      source_file_id,
      source_row_number,
      mega_famille,
      famille,
      sous_famille,
      cir_key,
      link_status,
      raw_values,
      normalized_values
    )
    select
      x.snapshot_id,
      x.import_id,
      x.segment_id,
      x.classification_id,
      x.source_file_id,
      x.source_row_number,
      x.mega_famille,
      x.famille,
      x.sous_famille,
      x.cir_key,
      x.link_status,
      x.raw_values,
      x.normalized_values
    from jsonb_to_recordset(${payload}::jsonb) as x(
      snapshot_id uuid,
      import_id uuid,
      segment_id uuid,
      classification_id uuid,
      source_file_id uuid,
      source_row_number integer,
      mega_famille text,
      famille text,
      sous_famille text,
      cir_key text,
      link_status text,
      raw_values jsonb,
      normalized_values jsonb
    )
  `);

  for (const row of rows) {
    const segmentId = segmentIds.get(row.segment_key);
    if (!segmentId) continue;
    chunk.push({
      snapshot_id: snapshotId,
      import_id: importId,
      segment_id: segmentId,
      classification_id: row.classification_cir_key
        ? classificationIds.get(row.classification_cir_key) ?? null
        : null,
      source_file_id: fileId,
      source_row_number: row.source_row_number,
      mega_famille: row.mega_famille,
      famille: row.famille,
      sous_famille: row.sous_famille,
      cir_key: row.cir_key,
      link_status: row.link_status,
      raw_values: row.raw_values,
      normalized_values: row.normalized_values,
    });
    if (chunk.length >= BULK_INSERT_CHUNK_SIZE) await flush();
  }
  await flush();
};

const insertPurchaseGridRows = async (
  tx: DbClient,
  snapshotId: string,
  importId: string,
  fileId: string,
  rows: ParsedSegmentPurchaseGridRow[],
  segmentIds: Map<string, string>,
): Promise<void> => {
  const chunk: JsonbRecordsetRow[] = [];
  const flush = () =>
    flushJsonbRecordsetInsert(tx, chunk, (payload) =>
      sql`
    insert into public.pricing_segment_purchase_grids (
      snapshot_id,
      import_id,
      segment_id,
      source_file_id,
      source_row_number,
      num_four,
      remise_ha,
      col_ha,
      priorite,
      type_grill,
      date_debut_raw,
      date_fin_raw,
      date_debut_normalized,
      date_fin_normalized,
      borne_acha,
      coef_retro,
      coef_ha,
      coef_majvte,
      raw_values,
      normalized_values
    )
    select
      x.snapshot_id,
      x.import_id,
      x.segment_id,
      x.source_file_id,
      x.source_row_number,
      x.num_four,
      x.remise_ha,
      x.col_ha,
      x.priorite,
      x.type_grill,
      x.date_debut_raw,
      x.date_fin_raw,
      x.date_debut_normalized,
      x.date_fin_normalized,
      x.borne_acha,
      x.coef_retro,
      x.coef_ha,
      x.coef_majvte,
      x.raw_values,
      x.normalized_values
    from jsonb_to_recordset(${payload}::jsonb) as x(
      snapshot_id uuid,
      import_id uuid,
      segment_id uuid,
      source_file_id uuid,
      source_row_number integer,
      num_four text,
      remise_ha text,
      col_ha text,
      priorite text,
      type_grill text,
      date_debut_raw text,
      date_fin_raw text,
      date_debut_normalized text,
      date_fin_normalized text,
      borne_acha text,
      coef_retro text,
      coef_ha text,
      coef_majvte text,
      raw_values jsonb,
      normalized_values jsonb
    )
  `);

  for (const row of rows) {
    const segmentId = segmentIds.get(row.segment_key);
    if (!segmentId) continue;
    chunk.push({
      snapshot_id: snapshotId,
      import_id: importId,
      segment_id: segmentId,
      source_file_id: fileId,
      source_row_number: row.source_row_number,
      num_four: row.num_four,
      remise_ha: row.remise_ha,
      col_ha: row.col_ha,
      priorite: row.priorite,
      type_grill: row.type_grill,
      date_debut_raw: row.date_debut_raw,
      date_fin_raw: row.date_fin_raw,
      date_debut_normalized: row.date_debut_normalized,
      date_fin_normalized: row.date_fin_normalized,
      borne_acha: row.borne_acha,
      coef_retro: row.coef_retro,
      coef_ha: row.coef_ha,
      coef_majvte: row.coef_majvte,
      raw_values: row.raw_values,
      normalized_values: row.normalized_values,
    });
    if (chunk.length >= BULK_INSERT_CHUNK_SIZE) await flush();
  }
  await flush();
};

const insertAnomalyRows = async (
  tx: DbClient,
  snapshotId: string,
  importId: string,
  fileIds: { classification: string; segments_grids: string },
  anomalies: ParsedReferenceAnomaly[],
): Promise<void> => {
  const values = anomalies.map((anomaly) => ({
    import_id: importId,
    snapshot_id: snapshotId,
    source_file_id: anomaly.file_kind ? fileIds[anomaly.file_kind] : null,
    source_row_number: anomaly.source_row_number,
    type: anomaly.type,
    severity: anomaly.severity,
    object_type: anomaly.object_type ?? null,
    object_id: anomaly.object_id ?? null,
    columns: anomaly.columns,
    message: anomaly.message,
    details: anomaly.details ?? {},
  }));

  for (let index = 0; index < values.length; index += INSERT_CHUNK_SIZE) {
    await tx.insert(pricing_reference_anomalies).values(
      values.slice(index, index + INSERT_CHUNK_SIZE),
    );
  }
};

export const resolvePricingReferenceAnalysisStatus = (
  analysis: Pick<PricingReferenceAnalysisResult, "health_report">,
): PricingReferenceImportStatus =>
  analysis.health_report.anomalies.bloquante > 0
    ? "analyse_erreur"
    : "analyse_ok";

const persistAnalysis = async (
  db: DbClient,
  importId: string,
  callerId: string,
  files: { classification: ImportFileRow; segments_grids: ImportFileRow },
  analysis: PricingReferenceAnalysisResult,
): Promise<PersistedAnalysisState> => {
  const snapshotId = crypto.randomUUID();
  const importStatus = resolvePricingReferenceAnalysisStatus(analysis);

  await markPricingReferenceAnalysisProgress(
    db,
    importId,
    callerId,
    "Analyse referentiel: nettoyage des donnees partielles precedentes.",
  );
  await db.transaction(async (tx) => {
    await tx.execute(
      sql`delete from public.pricing_reference_anomalies where import_id = ${importId}`,
    );
    await tx.execute(
      sql`delete from public.pricing_segment_purchase_grids where import_id = ${importId}`,
    );
    await tx.execute(
      sql`delete from public.pricing_segment_classification_links where import_id = ${importId}`,
    );
    await tx.execute(
      sql`delete from public.pricing_classification_cir where import_id = ${importId}`,
    );
    await tx.execute(
      sql`delete from public.pricing_supplier_segments where import_id = ${importId}`,
    );
    await tx.execute(
      sql`delete from public.pricing_reference_snapshots where import_id = ${importId}`,
    );

    await tx.update(pricing_reference_imports)
      .set({
        status: "analyse_en_cours",
        analyzed_by: callerId,
        analysis_started_at: new Date().toISOString(),
        error_code: null,
        error_message: null,
        error_details: null,
      })
      .where(eq(pricing_reference_imports.id, importId));

    await tx.update(pricing_reference_import_files)
      .set({
        sheet_name: analysis.health_report.files.classification.sheet_name,
        detected_columns:
          analysis.health_report.files.classification.columns.detected,
        row_count: analysis.health_report.files.classification.rows_count,
      })
      .where(eq(pricing_reference_import_files.id, files.classification.id));

    await tx.update(pricing_reference_import_files)
      .set({
        sheet_name: analysis.health_report.files.segments_grids.sheet_name,
        detected_columns:
          analysis.health_report.files.segments_grids.columns.detected,
        row_count: analysis.health_report.files.segments_grids.rows_count,
      })
      .where(eq(pricing_reference_import_files.id, files.segments_grids.id));

    await tx.insert(pricing_reference_snapshots).values({
      id: snapshotId,
      import_id: importId,
      status: "cree",
      is_active: false,
      created_by: callerId,
      counters: {
        classification: analysis.health_report.classification,
        segments_grids: analysis.health_report.segments_grids,
        anomalies: analysis.health_report.anomalies,
      },
    });
  });

  await markPricingReferenceAnalysisProgress(
    db,
    importId,
    callerId,
    `Analyse referentiel: insertion classifications (${analysis.classification_rows.length}).`,
  );
  const classificationIds = await insertClassificationRows(
    db,
    snapshotId,
    importId,
    files.classification.id,
    analysis.classification_rows,
  );
  await markPricingReferenceAnalysisProgress(
    db,
    importId,
    callerId,
    `Analyse referentiel: insertion segments (${analysis.segment_rows.length}).`,
  );
  const segmentIds = await insertSegmentRows(
    db,
    snapshotId,
    importId,
    files.segments_grids.id,
    analysis.segment_rows,
  );
  await markPricingReferenceAnalysisProgress(
    db,
    importId,
    callerId,
    `Analyse referentiel: insertion liaisons classification (${analysis.link_rows.length}).`,
  );
  await insertLinkRows(
    db,
    snapshotId,
    importId,
    files.segments_grids.id,
    analysis.link_rows,
    segmentIds,
    classificationIds,
  );
  await markPricingReferenceAnalysisProgress(
    db,
    importId,
    callerId,
    `Analyse referentiel: insertion grilles achat (${analysis.purchase_grid_rows.length}).`,
  );
  await insertPurchaseGridRows(
    db,
    snapshotId,
    importId,
    files.segments_grids.id,
    analysis.purchase_grid_rows,
    segmentIds,
  );
  await markPricingReferenceAnalysisProgress(
    db,
    importId,
    callerId,
    `Analyse referentiel: insertion anomalies (${analysis.anomalies.length}).`,
  );
  await insertAnomalyRows(
    db,
    snapshotId,
    importId,
    {
      classification: files.classification.id,
      segments_grids: files.segments_grids.id,
    },
    analysis.anomalies,
  );

  await db.update(pricing_reference_imports)
    .set({
      status: importStatus,
      analyzed_by: callerId,
      analysis_completed_at: new Date().toISOString(),
      health_report: analysis.health_report,
      counters: {
        classification: analysis.health_report.classification,
        segments_grids: analysis.health_report.segments_grids,
        anomalies: analysis.health_report.anomalies,
      },
      error_code: importStatus === "analyse_erreur"
        ? "PRICING_REFERENCE_IMPORT_BLOCKING_ANOMALIES"
        : null,
      error_message: importStatus === "analyse_erreur"
        ? "Des anomalies bloquantes empechent l activation du snapshot referentiel."
        : null,
      error_details: importStatus === "analyse_erreur"
        ? `${analysis.health_report.anomalies.bloquante} anomalie(s) bloquante(s) detectee(s).`
        : null,
    })
    .where(eq(pricing_reference_imports.id, importId));

  return { snapshotId, importStatus };
};

export const analyzePricingReferenceImport = async (
  db: DbClient,
  callerId: string,
  requestId: string,
  input: PricingReferenceImportAnalyzeInput,
): Promise<PricingReferenceImportAnalyzeResponse> => {
  const allowed = await checkRateLimit(
    "pricing-reference-imports:analyze",
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

  await requireImport(db, input.import_id);

  try {
    await markPricingReferenceAnalysisProgress(
      db,
      input.import_id,
      callerId,
      "Analyse referentiel: resolution des fichiers source.",
    );
    const currentFiles = await getCurrentImportFiles(db, input.import_id);
    assertPricingReferenceCurrentMappingsConfirmed(currentFiles);
    const files = await resolveAnalysisFiles(db, input.import_id);
    await markPricingReferenceAnalysisProgress(
      db,
      input.import_id,
      callerId,
      "Analyse referentiel: telechargement des fichiers XLSX.",
    );
    const [classificationBytes, segmentsBytes] = await Promise.all([
      downloadStorageBytes(files.classification),
      downloadStorageBytes(files.segments_grids),
    ]);

    await markPricingReferenceAnalysisProgress(
      db,
      input.import_id,
      callerId,
      "Analyse referentiel: verification des empreintes fichiers.",
    );
    const [classificationHash, segmentsHash] = await Promise.all([
      assertDownloadedFileMatchesMetadata(
        files.classification,
        classificationBytes,
      ),
      assertDownloadedFileMatchesMetadata(files.segments_grids, segmentsBytes),
    ]);

    await markPricingReferenceAnalysisProgress(
      db,
      input.import_id,
      callerId,
      "Analyse referentiel: parsing des classeurs XLSX.",
    );
    const analysis = await analyzePricingReferenceWorkbooks(
      toParserFileInput(
        files.classification,
        classificationBytes,
        classificationHash,
      ),
      toParserFileInput(files.segments_grids, segmentsBytes, segmentsHash),
    );

    await markPricingReferenceAnalysisProgress(
      db,
      input.import_id,
      callerId,
      `Analyse referentiel: persistance snapshot (${analysis.classification_rows.length} classifications, ${analysis.segment_rows.length} segments, ${analysis.purchase_grid_rows.length} grilles).`,
    );
    const { snapshotId, importStatus } = await persistAnalysis(
      db,
      input.import_id,
      callerId,
      files,
      analysis,
    );
    await computePricingReferenceDiffBestEffort(db, snapshotId);

    return {
      ok: true,
      request_id: requestId,
      import_id: input.import_id,
      snapshot_id: snapshotId,
      status: importStatus,
      health_report: analysis.health_report,
    };
  } catch (error) {
    await recordPricingReferenceAnalysisFailure(
      db,
      input.import_id,
      callerId,
      error,
    );
    throw error;
  }
};

const toImportSummary = (
  row: ImportRow,
  files: PricingReferenceEffectiveImportFile[],
  activation: ImportActivationSummary | null,
) => {
  const health = assertHealthReport(row.health_report);
  return {
    id: row.id,
    status: row.status,
    created_by: row.created_by,
    analyzed_by: row.analyzed_by,
    created_at: row.created_at,
    updated_at: row.updated_at,
    analysis_started_at: row.analysis_started_at,
    analysis_completed_at: row.analysis_completed_at,
    error_code: row.error_code,
    error_message: row.error_message,
    classification_rows_count: health?.classification.rows_count ?? null,
    segments_rows_count: health?.segments_grids.rows_count ?? null,
    anomalies_total: health?.anomalies.total ?? null,
    is_active_version: activation?.is_active_version ?? false,
    snapshot_status: activation?.snapshot_status ?? null,
    activated_at: activation?.activated_at ?? null,
    deactivated_at: activation?.deactivated_at ?? null,
    files,
  };
};

const toImportFileDetail = (
  file: ImportFileRow,
): PricingReferenceImportGetResponse["import"]["files"][number] => ({
  id: file.id,
  import_id: file.import_id,
  file_kind: file.file_kind,
  original_filename: file.original_filename,
  storage_bucket: PRICING_REFERENCE_STORAGE_BUCKET,
  storage_path: file.storage_path,
  size_bytes: file.size_bytes,
  sha256: file.sha256,
  content_type: file.content_type,
  sheet_name: file.sheet_name,
  detected_columns: file.detected_columns,
  row_count: file.row_count,
  mapping_profile_id: file.mapping_profile_id,
  column_mapping: assertColumnMapping(file.column_mapping),
  mapping_status: file.mapping_status,
  mapping_confirmed_by: file.mapping_confirmed_by,
  mapping_confirmed_at: file.mapping_confirmed_at,
  created_at: file.created_at,
});

export const listPricingReferenceImports = async (
  db: DbClient,
  _callerId: string,
  requestId: string,
  input: PricingReferenceImportsListInput,
): Promise<PricingReferenceImportsListResponse> => {
  const conditions: SQL[] = [];
  if (input.status) {
    conditions.push(eq(pricing_reference_imports.status, input.status));
  }
  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const [rows, totalRows] = await Promise.all([
    db
      .select()
      .from(pricing_reference_imports)
      .where(whereClause)
      .orderBy(desc(pricing_reference_imports.created_at))
      .limit(input.page_size)
      .offset(toOffset(input.page, input.page_size)),
    db
      .select({ total: sql<number>`count(*)::int` })
      .from(pricing_reference_imports)
      .where(whereClause),
  ]);
  const files = await getImportFilesByImportIds(db, rows.map((row) => row.id));
  const filesByImportId = groupImportFilesByImportId(files);
  const effectiveFilesByImportId = await resolveEffectiveImportFiles(
    db,
    rows,
    filesByImportId,
  );
  const activationByImportId = await getImportActivationSummaries(
    db,
    rows.map((row) => row.id),
  );

  return {
    ok: true,
    request_id: requestId,
    imports: rows.map((row) =>
      toImportSummary(
        row,
        effectiveFilesByImportId.get(row.id) ?? [],
        activationByImportId.get(row.id) ?? null,
      )
    ),
    page: input.page,
    page_size: input.page_size,
    total: totalRows[0]?.total ?? 0,
  };
};

export const getPricingReferenceImport = async (
  db: DbClient,
  _callerId: string,
  requestId: string,
  input: PricingReferenceImportGetInput,
): Promise<PricingReferenceImportGetResponse> => {
  const row = await requireImport(db, input.import_id);
  const files = await getImportFilesByImportIds(db, [input.import_id]);
  const filesByImportId = groupImportFilesByImportId(files);
  const effectiveFilesByImportId = await resolveEffectiveImportFiles(
    db,
    [row],
    filesByImportId,
  );
  const effectiveFiles = effectiveFilesByImportId.get(input.import_id) ?? [];
  const activationByImportId = await getImportActivationSummaries(
    db,
    [input.import_id],
  );

  return {
    ok: true,
    request_id: requestId,
    import: {
      ...toImportSummary(
        row,
        effectiveFiles,
        activationByImportId.get(input.import_id) ?? null,
      ),
      health_report: assertHealthReport(row.health_report),
      files: files.map(toImportFileDetail),
      effective_files: effectiveFiles,
    },
  };
};

export const getPricingReferenceHealth = async (
  db: DbClient,
  _callerId: string,
  requestId: string,
  input: { import_id?: string },
): Promise<PricingReferenceHealthGetResponse> => {
  const rows = input.import_id
    ? await db
      .select()
      .from(pricing_reference_imports)
      .where(eq(pricing_reference_imports.id, input.import_id))
      .limit(1)
    : await db.execute<ImportRow>(sql`
      with active_import as (
        select i.*
        from public.pricing_reference_snapshots s
        join public.pricing_reference_imports i on i.id = s.import_id
        where s.is_active = true
        order by s.activated_at desc nulls last, s.created_at desc
        limit 1
      ),
      fallback_import as (
        select i.*
        from public.pricing_reference_imports i
        join public.pricing_reference_snapshots s on s.import_id = i.id
        where i.status = 'analyse_ok'
          and not exists (select 1 from active_import)
        order by i.analysis_completed_at desc nulls last, s.created_at desc
        limit 1
      )
      select *
      from active_import
      union all
      select *
      from fallback_import
      limit 1
    `);

  return {
    ok: true,
    request_id: requestId,
    health_report: rows[0] ? assertHealthReport(rows[0].health_report) : null,
  };
};

export const resolveSnapshotId = async (
  db: DbClient,
  input: Pick<PricingReferenceRowsListInput, "import_id" | "snapshot_id">,
): Promise<string | null> => {
  if (input.snapshot_id) return input.snapshot_id;

  if (input.import_id) {
    const [snapshot] = await db
      .select()
      .from(pricing_reference_snapshots)
      .where(eq(pricing_reference_snapshots.import_id, input.import_id))
      .limit(1);
    return snapshot?.id ?? null;
  }

  const activeRows = await db.execute<{ id: string }>(sql`
    select id
    from public.pricing_reference_snapshots
    where is_active = true
    order by activated_at desc nulls last, created_at desc
    limit 1
  `);
  if (activeRows[0]?.id) return activeRows[0].id;

  const rows = await db.execute<{ id: string }>(sql`
    select s.id
    from public.pricing_reference_snapshots s
    join public.pricing_reference_imports i on i.id = s.import_id
    where i.status = 'analyse_ok'
    order by i.analysis_completed_at desc nulls last, s.created_at desc
    limit 1
  `);
  return rows[0]?.id ?? null;
};

const searchPattern = (search: string | undefined): string | null => {
  const value = search?.trim().toLowerCase();
  return value ? `%${value}%` : null;
};

export const listPricingReferenceClassification = async (
  db: DbClient,
  _callerId: string,
  requestId: string,
  input: PricingReferenceClassificationListInput,
): Promise<PricingReferenceClassificationListResponse> => {
  const snapshotId = await resolveSnapshotId(db, input);
  if (!snapshotId) {
    return {
      ok: true,
      request_id: requestId,
      rows: [],
      page: input.page,
      page_size: input.page_size,
      total: 0,
    };
  }

  const pattern = searchPattern(input.search);
  const conditions: SQL[] = [sql<boolean>`snapshot_id = ${snapshotId}`];
  if (pattern) {
    conditions.push(sql<boolean>`(
        lower(cir_key) like ${pattern}
        or lower(mega_lib) like ${pattern}
        or lower(fam_lib) like ${pattern}
        or lower(sfa_lib) like ${pattern}
      )`);
  }
  const megaFilter = optionalExactFilter(sql`mega`, input.filters?.mega);
  const famFilter = optionalExactFilter(sql`fam`, input.filters?.fam);
  if (megaFilter) conditions.push(megaFilter);
  if (famFilter) conditions.push(famFilter);
  const whereClause = andSql(conditions);
  const sortBy = classificationSortSql(input.sort_by);
  const sortDirection = sortDirectionSql(input.sort_direction);

  const rows = await db.execute<{
    id: string;
    snapshot_id: string;
    import_id: string;
    source_row_number: number;
    cir_key: string;
    mega: string;
    fam: string;
    sfa: string;
    mega_lib: string;
    fam_lib: string;
    sfa_lib: string;
  }>(sql`
    select id, snapshot_id, import_id, source_row_number, cir_key, mega, fam, sfa, mega_lib, fam_lib, sfa_lib
    from public.pricing_classification_cir
    where ${whereClause}
    order by ${sortBy} ${sortDirection}, mega asc, fam asc, sfa asc
    limit ${input.page_size}
    offset ${toOffset(input.page, input.page_size)}
  `);
  const totalRows = await db.execute<{ total: number }>(sql`
    select count(*)::int as total
    from public.pricing_classification_cir
    where ${whereClause}
  `);

  return {
    ok: true,
    request_id: requestId,
    rows,
    page: input.page,
    page_size: input.page_size,
    total: totalRows[0]?.total ?? 0,
  };
};

export const listPricingReferenceSegments = async (
  db: DbClient,
  _callerId: string,
  requestId: string,
  input: PricingReferenceSegmentsListInput,
): Promise<PricingReferenceSegmentsListResponse> => {
  const snapshotId = await resolveSnapshotId(db, input);
  if (!snapshotId) {
    return {
      ok: true,
      request_id: requestId,
      rows: [],
      page: input.page,
      page_size: input.page_size,
      total: 0,
    };
  }

  const pattern = searchPattern(input.search);
  const conditions: SQL[] = [sql<boolean>`s.snapshot_id = ${snapshotId}`];
  if (pattern) {
    conditions.push(sql<boolean>`(
        lower(s.segment_key) like ${pattern}
        or lower(s.marque) like ${pattern}
        or lower(s.cat_fab) like ${pattern}
        or lower(coalesce(s.cat_fab_l, '')) like ${pattern}
      )`);
  }
  const marqueFilter = optionalExactFilter(
    sql`s.marque`,
    input.filters?.marque,
  );
  const catFabFilter = optionalExactFilter(
    sql`s.cat_fab`,
    input.filters?.cat_fab,
  );
  if (marqueFilter) conditions.push(marqueFilter);
  if (catFabFilter) conditions.push(catFabFilter);
  if (input.filters?.link_status) {
    conditions.push(sql<boolean>`l.link_status = ${input.filters.link_status}`);
  }
  const whereClause = andSql(conditions);
  const sortBy = segmentSortSql(input.sort_by);
  const sortDirection = sortDirectionSql(input.sort_direction);

  const rows = await db.execute<{
    id: string;
    snapshot_id: string;
    import_id: string;
    source_row_number: number;
    segment_key: string;
    segment: string;
    idnumerique: string;
    marque: string;
    cat_fab: string;
    cat_fab_l: string | null;
    strategiq: string | null;
    codif_fair: string | null;
    tarif_fab: string | null;
    cir_key: string | null;
    link_status: PricingReferenceLinkStatus | null;
    mega_famille: string | null;
    famille: string | null;
    sous_famille: string | null;
    mega_libelle: string | null;
    famille_libelle: string | null;
    sfam_libelle: string | null;
    purchase_grid_rows_count: number;
  }>(sql`
    select
      s.id,
      s.snapshot_id,
      s.import_id,
      s.source_row_number,
      s.segment_key,
      s.segment,
      s.idnumerique,
      s.marque,
      s.cat_fab,
      s.cat_fab_l,
      s.strategiq,
      s.codif_fair,
      s.tarif_fab,
      l.cir_key,
      l.link_status,
      l.mega_famille,
      l.famille,
      l.sous_famille,
      coalesce(c.mega_lib, nullif(l.raw_values ->> 'MEGA_LIBELLE', '')) as mega_libelle,
      coalesce(c.fam_lib, nullif(l.raw_values ->> 'FAMILLE_LIBELLE', '')) as famille_libelle,
      coalesce(c.sfa_lib, nullif(l.raw_values ->> 'SFAM_LIBELLE', '')) as sfam_libelle,
      count(g.id)::int as purchase_grid_rows_count
    from public.pricing_supplier_segments s
    left join public.pricing_segment_classification_links l on l.segment_id = s.id
    left join public.pricing_classification_cir c on c.id = l.classification_id
    left join public.pricing_segment_purchase_grids g on g.segment_id = s.id
    where ${whereClause}
    group by
      s.id,
      l.cir_key,
      l.link_status,
      l.mega_famille,
      l.famille,
      l.sous_famille,
      l.raw_values,
      c.mega_lib,
      c.fam_lib,
      c.sfa_lib
    order by ${sortBy} ${sortDirection}, s.marque asc, s.cat_fab asc, s.segment asc
    limit ${input.page_size}
    offset ${toOffset(input.page, input.page_size)}
  `);
  const totalRows = await db.execute<{ total: number }>(sql`
    select count(distinct s.id)::int as total
    from public.pricing_supplier_segments s
    left join public.pricing_segment_classification_links l on l.segment_id = s.id
    where ${whereClause}
  `);

  return {
    ok: true,
    request_id: requestId,
    rows,
    page: input.page,
    page_size: input.page_size,
    total: totalRows[0]?.total ?? 0,
  };
};

export type PricingReferenceSegmentsAggregateInput = {
  import_id?: string;
  snapshot_id?: string;
  marques?: string[];
};

export type PricingReferenceSegmentsAggregate = {
  snapshot_id: string | null;
  marques: string[];
  segment_rows: number;
  distinct_cat_fab: number;
  distinct_segments: number;
};

export type PricingReferenceCategorySearchInput = {
  import_id?: string;
  snapshot_id?: string;
  terms: string[];
  marques?: string[];
  mode: "any" | "all";
  examples_limit?: number;
};

export type PricingReferenceCategorySearch = {
  snapshot_id: string | null;
  terms: string[];
  requested_terms: string[];
  canonical_terms: string[];
  query_terms: string[];
  marques: string[];
  matching_brands: string[];
  distinct_brand_count: number;
  segment_rows: number;
  counts_by_brand: Array<{ marque: string; segment_rows: number }>;
  examples: Array<
    { marque: string; cat_fab: string; cat_fab_l: string | null }
  >;
};

export const aggregatePricingReferenceSegments = async (
  db: DbClient,
  input: PricingReferenceSegmentsAggregateInput,
): Promise<PricingReferenceSegmentsAggregate> => {
  const snapshotId = await resolveSnapshotId(db, input);
  const marques = uniqueNonEmptyStrings(input.marques).map((value) =>
    value.toLowerCase()
  );
  if (!snapshotId) {
    return {
      snapshot_id: null,
      marques,
      segment_rows: 0,
      distinct_cat_fab: 0,
      distinct_segments: 0,
    };
  }

  const conditions: SQL[] = [sql<boolean>`s.snapshot_id = ${snapshotId}`];
  if (marques.length > 0) {
    conditions.push(
      sql<boolean>`lower(trim(s.marque)) in (${
        sql.join(marques.map((value) => sql`${value}`), sql`, `)
      })`,
    );
  }
  const rows = await db.execute<{
    segment_rows: number;
    distinct_cat_fab: number;
    distinct_segments: number;
  }>(sql`
    select
      count(distinct s.id)::int as segment_rows,
      count(distinct nullif(trim(s.cat_fab), ''))::int as distinct_cat_fab,
      count(distinct nullif(trim(s.segment), ''))::int as distinct_segments
    from public.pricing_supplier_segments s
    where ${andSql(conditions)}
  `);

  return {
    snapshot_id: snapshotId,
    marques: marques.map((value) => value.toUpperCase()),
    segment_rows: rows[0]?.segment_rows ?? 0,
    distinct_cat_fab: rows[0]?.distinct_cat_fab ?? 0,
    distinct_segments: rows[0]?.distinct_segments ?? 0,
  };
};

const categoryTermCondition = (term: string): SQL => {
  const pattern = `%${escapePricingReferenceLikeTerm(term)}%`;
  return sql<
    boolean
  >`lower(coalesce(s.cat_fab_l, '')) like ${pattern} escape '\\'`;
};

const categorySearchConditions = (
  snapshotId: string,
  termGroups: string[][],
  marques: string[],
  mode: "any" | "all",
): SQL => {
  const conditions: SQL[] = [sql<boolean>`s.snapshot_id = ${snapshotId}`];
  if (marques.length > 0) {
    conditions.push(
      sql<boolean>`upper(trim(s.marque)) in (${
        sql.join(marques.map((value) => sql`${value}`), sql`, `)
      })`,
    );
  }
  const groupedConditions = termGroups.map((terms) =>
    sql<boolean>`(${sql.join(terms.map(categoryTermCondition), sql` or `)})`
  );
  if (groupedConditions.length > 0) {
    conditions.push(
      mode === "all"
        ? sql<boolean>`(${sql.join(groupedConditions, sql` and `)})`
        : sql<boolean>`(${sql.join(groupedConditions, sql` or `)})`,
    );
  }
  return andSql(conditions);
};

export const searchPricingReferenceSupplierCategories = async (
  db: DbClient,
  input: PricingReferenceCategorySearchInput,
): Promise<PricingReferenceCategorySearch> => {
  const snapshotId = await resolveSnapshotId(db, input);
  const expandedTerms = expandPricingReferenceSearchTerms(input.terms);
  const terms = expandedTerms.query_terms;
  const termGroups = expandedTerms.requested_terms.map((term) =>
    expandPricingReferenceSearchTerms([term]).query_terms
  );
  const marques = normalizePricingReferenceBrands(input.marques);
  if (!snapshotId) {
    return {
      snapshot_id: null,
      terms,
      ...expandedTerms,
      marques,
      matching_brands: [],
      distinct_brand_count: 0,
      segment_rows: 0,
      counts_by_brand: [],
      examples: [],
    };
  }
  const whereClause = categorySearchConditions(
    snapshotId,
    termGroups,
    marques,
    input.mode,
  );
  const counts = await db.execute<{ marque: string; segment_rows: number }>(sql`
    select upper(trim(s.marque)) as marque, count(distinct s.id)::int as segment_rows
    from public.pricing_supplier_segments s
    where ${whereClause}
    group by upper(trim(s.marque))
    order by upper(trim(s.marque)) asc
  `);
  const examplesLimit = Math.max(0, Math.min(input.examples_limit ?? 0, 10));
  const examples = examplesLimit === 0 ? [] : await db.execute<{
    marque: string;
    cat_fab: string;
    cat_fab_l: string | null;
  }>(sql`
    select upper(trim(s.marque)) as marque, s.cat_fab, s.cat_fab_l
    from public.pricing_supplier_segments s
    where ${whereClause}
    order by upper(trim(s.marque)) asc, s.cat_fab asc, s.id asc
    limit ${examplesLimit}
  `);
  return {
    snapshot_id: snapshotId,
    terms,
    ...expandedTerms,
    marques,
    matching_brands: counts.map((row) => row.marque),
    distinct_brand_count: counts.length,
    segment_rows: counts.reduce((sum, row) => sum + row.segment_rows, 0),
    counts_by_brand: counts,
    examples,
  };
};

export const countPricingReferenceSupplierBrands = async (
  db: DbClient,
  input: Pick<
    PricingReferenceCategorySearchInput,
    "import_id" | "snapshot_id" | "marques"
  >,
): Promise<
  {
    snapshot_id: string | null;
    marques: string[];
    distinct_brand_count: number;
  }
> => {
  const snapshotId = await resolveSnapshotId(db, input);
  const marques = normalizePricingReferenceBrands(input.marques);
  if (!snapshotId) {
    return { snapshot_id: null, marques, distinct_brand_count: 0 };
  }
  const conditions: SQL[] = [sql<boolean>`s.snapshot_id = ${snapshotId}`];
  if (marques.length > 0) {
    conditions.push(
      sql<boolean>`upper(trim(s.marque)) in (${
        sql.join(marques.map((value) => sql`${value}`), sql`, `)
      })`,
    );
  }
  const rows = await db.execute<{ distinct_brand_count: number }>(sql`
    select count(distinct nullif(upper(trim(s.marque)), ''))::int as distinct_brand_count
    from public.pricing_supplier_segments s
    where ${andSql(conditions)}
  `);
  return {
    snapshot_id: snapshotId,
    marques,
    distinct_brand_count: rows[0]?.distinct_brand_count ?? 0,
  };
};

export const getPricingReferenceSegmentDetail = async (
  db: DbClient,
  _callerId: string,
  requestId: string,
  input: PricingReferenceSegmentDetailInput,
): Promise<PricingReferenceSegmentDetailResponse> => {
  const segmentRows = await db.execute<{
    id: string;
    snapshot_id: string;
    import_id: string;
    source_file_id: string;
    source_row_number: number;
    segment_key: string;
    segment: string;
    idnumerique: string;
    marque: string;
    cat_fab: string;
    cat_fab_l: string | null;
    strategiq: string | null;
    codif_fair: string | null;
    tarif_fab: string | null;
    cir_key: string | null;
    link_status: PricingReferenceLinkStatus | null;
    purchase_grid_rows_count: number;
    link_source_row_number: number | null;
    mega_famille: string | null;
    famille: string | null;
    sous_famille: string | null;
    mega_libelle: string | null;
    famille_libelle: string | null;
    sfam_libelle: string | null;
  }>(sql`
    select
      s.id,
      s.snapshot_id,
      s.import_id,
      s.source_file_id,
      s.source_row_number,
      s.segment_key,
      s.segment,
      s.idnumerique,
      s.marque,
      s.cat_fab,
      s.cat_fab_l,
      s.strategiq,
      s.codif_fair,
      s.tarif_fab,
      l.cir_key,
      l.link_status,
      count(g.id)::int as purchase_grid_rows_count,
      l.source_row_number as link_source_row_number,
      l.mega_famille,
      l.famille,
      l.sous_famille,
      coalesce(c.mega_lib, nullif(l.raw_values ->> 'MEGA_LIBELLE', '')) as mega_libelle,
      coalesce(c.fam_lib, nullif(l.raw_values ->> 'FAMILLE_LIBELLE', '')) as famille_libelle,
      coalesce(c.sfa_lib, nullif(l.raw_values ->> 'SFAM_LIBELLE', '')) as sfam_libelle
    from public.pricing_supplier_segments s
    left join public.pricing_segment_classification_links l on l.segment_id = s.id
    left join public.pricing_classification_cir c on c.id = l.classification_id
    left join public.pricing_segment_purchase_grids g on g.segment_id = s.id
    where s.id = ${input.segment_id}
    group by
      s.id,
      l.cir_key,
      l.link_status,
      l.source_row_number,
      l.mega_famille,
      l.famille,
      l.sous_famille,
      l.raw_values,
      c.mega_lib,
      c.fam_lib,
      c.sfa_lib
    limit 1
  `);
  const segment = segmentRows[0];
  if (!segment) {
    throw httpError(
      404,
      "NOT_FOUND",
      "Segment referentiel introuvable.",
    );
  }

  const purchaseGridRows = await db.execute<{
    id: string;
    snapshot_id: string;
    import_id: string;
    segment_id: string;
    source_file_id: string;
    source_row_number: number;
    num_four: string | null;
    remise_ha: string | null;
    col_ha: string | null;
    priorite: string | null;
    type_grill: string | null;
    date_debut_raw: string | null;
    date_fin_raw: string | null;
    date_debut_normalized: string | null;
    date_fin_normalized: string | null;
    borne_acha: string | null;
    coef_retro: string | null;
    coef_ha: string | null;
    coef_majvte: string | null;
  }>(sql`
    select
      id,
      snapshot_id,
      import_id,
      segment_id,
      source_file_id,
      source_row_number,
      num_four,
      remise_ha,
      col_ha,
      priorite,
      type_grill,
      date_debut_raw,
      date_fin_raw,
      date_debut_normalized,
      date_fin_normalized,
      borne_acha,
      coef_retro,
      coef_ha,
      coef_majvte
    from public.pricing_segment_purchase_grids
    where segment_id = ${input.segment_id}
    order by source_row_number asc, num_four asc nulls last, priorite asc nulls last
  `);

  return pricingReferenceSegmentDetailResponseSchema.parse({
    ok: true,
    request_id: requestId,
    segment,
    purchase_grid_rows: purchaseGridRows,
  });
};

export const listPricingReferenceAnomalies = async (
  db: DbClient,
  _callerId: string,
  requestId: string,
  input: PricingReferenceAnomaliesListInput,
): Promise<PricingReferenceAnomaliesListResponse> => {
  const snapshotId = await resolveSnapshotId(db, input);
  if (!snapshotId && !input.import_id) {
    return {
      ok: true,
      request_id: requestId,
      rows: [],
      page: input.page,
      page_size: input.page_size,
      total: 0,
    };
  }
  const whereClause = andSql(buildAnomalyFilterConditions(input, snapshotId));
  const sortBy = anomalySortSql(input.sort_by);
  const sortDirection = sortDirectionSql(input.sort_direction);

  const [rows, totalRows] = await Promise.all([
    db.execute<{
      id: string;
      import_id: string;
      snapshot_id: string | null;
      source_file_id: string | null;
      source_file: {
        file_kind: PricingReferenceFileKind;
        original_filename: string;
      } | null;
      source_row_number: number | null;
      type: PricingReferenceAnomalyType;
      severity: PricingReferenceAnomalySeverity;
      object_type: string | null;
      object_id: string | null;
      columns: string[];
      message: string;
      details: Record<string, unknown>;
      created_at: string;
    }>(sql`
      select
        pricing_reference_anomalies.id,
        pricing_reference_anomalies.import_id,
        pricing_reference_anomalies.snapshot_id,
        pricing_reference_anomalies.source_file_id,
        case
          when f.id is null then null
          else jsonb_build_object(
            'file_kind', f.file_kind,
            'original_filename', f.original_filename
          )
        end as source_file,
        pricing_reference_anomalies.source_row_number,
        pricing_reference_anomalies.type,
        pricing_reference_anomalies.severity,
        pricing_reference_anomalies.object_type,
        pricing_reference_anomalies.object_id,
        pricing_reference_anomalies.columns,
        pricing_reference_anomalies.message,
        pricing_reference_anomalies.details,
        pricing_reference_anomalies.created_at
      from public.pricing_reference_anomalies
      left join public.pricing_reference_import_files f on f.id = pricing_reference_anomalies.source_file_id
      where ${whereClause}
      order by ${sortBy} ${sortDirection}, pricing_reference_anomalies.created_at desc
      limit ${input.page_size}
      offset ${toOffset(input.page, input.page_size)}
    `),
    db.execute<{ total: number }>(sql`
      select count(*)::int as total
      from public.pricing_reference_anomalies
      where ${whereClause}
    `),
  ]);

  return {
    ok: true,
    request_id: requestId,
    rows,
    page: input.page,
    page_size: input.page_size,
    total: totalRows[0]?.total ?? 0,
  };
};

export const getPricingReferenceAnomaliesSummary = async (
  db: DbClient,
  _callerId: string,
  requestId: string,
  input: PricingReferenceAnomaliesSummaryGetInput,
): Promise<PricingReferenceAnomaliesSummaryResponse> => {
  const snapshotId = await resolveSnapshotId(db, input);
  if (!snapshotId && !input.import_id) {
    return {
      ok: true,
      request_id: requestId,
      total: 0,
      groups_by_type: [],
      facets: { severities: [], types: [], marques: [] },
    };
  }
  const whereClause = andSql(buildAnomalyFilterConditions(input, snapshotId));
  const severitySql = anomalySeverityWeightSql();
  const [totalRows, groups, severityFacets, typeFacets, marqueFacets] =
    await Promise.all([
      db.execute<{ total: number }>(sql`
      select count(*)::int as total
      from public.pricing_reference_anomalies
      where ${whereClause}
    `),
      db.execute<{
        type: PricingReferenceAnomalyType;
        count: number;
        max_severity_weight: number;
      }>(sql`
      select
        ${pricing_reference_anomalies.type} as type,
        count(*)::int as count,
        max(${severitySql})::int as max_severity_weight
      from public.pricing_reference_anomalies
      where ${whereClause}
      group by 1
      order by max(${severitySql}) desc, count(*) desc, 1 asc
    `),
      db.execute<{
        value: PricingReferenceAnomalySeverity;
        count: number;
        max_severity_weight: number;
      }>(sql`
      select
        ${pricing_reference_anomalies.severity} as value,
        count(*)::int as count,
        max(${severitySql})::int as max_severity_weight
      from public.pricing_reference_anomalies
      where ${
        andSql(buildAnomalyFilterConditions(input, snapshotId, "severities"))
      }
      group by 1
      order by max(${severitySql}) desc, 1 asc
    `),
      db.execute<{
        value: PricingReferenceAnomalyType;
        count: number;
        max_severity_weight: number;
      }>(sql`
      select
        ${pricing_reference_anomalies.type} as value,
        count(*)::int as count,
        max(${severitySql})::int as max_severity_weight
      from public.pricing_reference_anomalies
      where ${andSql(buildAnomalyFilterConditions(input, snapshotId, "types"))}
      group by 1
      order by max(${severitySql}) desc, count(*) desc, 1 asc
    `),
      db.execute<{
        value: string;
        count: number;
        max_severity_weight: number;
      }>(sql`
      select
        ${anomalyMarqueSql()} as value,
        count(*)::int as count,
        max(${severitySql})::int as max_severity_weight
      from public.pricing_reference_anomalies
      where ${
        andSql(buildAnomalyFilterConditions(input, snapshotId, "marques"))
      }
      group by 1
      order by count(*) desc, 1 asc
      limit 200
    `),
    ]);

  return {
    ok: true,
    request_id: requestId,
    total: totalRows[0]?.total ?? 0,
    groups_by_type: groups.map((group) => ({
      type: group.type,
      label: pricingReferenceAnomalyTypeLabels[group.type],
      action_label: pricingReferenceAnomalyTypeActionLabels[group.type] ?? null,
      count: group.count,
      max_severity: severityFromWeight(group.max_severity_weight),
    })),
    facets: {
      severities: severityFacets.map((facet) => ({
        value: facet.value,
        label: pricingReferenceAnomalySeverityLabels[facet.value],
        count: facet.count,
        max_severity: severityFromWeight(facet.max_severity_weight),
      })),
      types: typeFacets.map((facet) => ({
        value: facet.value,
        label: pricingReferenceAnomalyTypeLabels[facet.value],
        count: facet.count,
        max_severity: severityFromWeight(facet.max_severity_weight),
      })),
      marques: marqueFacets.map((facet) => ({
        value: facet.value,
        label: facet.value,
        count: facet.count,
        max_severity: severityFromWeight(facet.max_severity_weight),
      })),
    },
  };
};

const listAllPricingReferenceAnomaliesForExport = async (
  db: DbClient,
  input: PricingReferenceAnomaliesExportInput,
  snapshotId: string | null,
): Promise<PricingReferenceAnomalyQueryRow[]> => {
  if (!snapshotId && !input.import_id) return [];
  const whereClause = andSql(buildAnomalyFilterConditions(input, snapshotId));

  return await db.execute<PricingReferenceAnomalyQueryRow>(sql`
    select
      pricing_reference_anomalies.id,
      pricing_reference_anomalies.import_id,
      pricing_reference_anomalies.snapshot_id,
      pricing_reference_anomalies.source_file_id,
      case
        when f.id is null then null
        else jsonb_build_object(
          'file_kind', f.file_kind,
          'original_filename', f.original_filename
        )
      end as source_file,
      pricing_reference_anomalies.source_row_number,
      pricing_reference_anomalies.type,
      pricing_reference_anomalies.severity,
      pricing_reference_anomalies.object_type,
      pricing_reference_anomalies.object_id,
      pricing_reference_anomalies.columns,
      pricing_reference_anomalies.message,
      pricing_reference_anomalies.details,
      pricing_reference_anomalies.created_at
    from public.pricing_reference_anomalies
    left join public.pricing_reference_import_files f on f.id = pricing_reference_anomalies.source_file_id
    where ${whereClause}
    order by
      f.file_kind asc nulls last,
      pricing_reference_anomalies.source_row_number asc nulls last,
      ${anomalySeverityWeightSql()} desc,
      pricing_reference_anomalies.created_at desc
    limit ${ANOMALIES_EXPORT_MAX_ROWS + 1}
  `);
};

const listPricingReferenceExportSourceRows = async (
  db: DbClient,
  snapshotId: string | null,
): Promise<PricingReferenceExportSourceRow[]> => {
  if (!snapshotId) return [];

  const classificationRows = await db.execute<{
    source_row_number: number;
    raw_values: Record<string, string>;
  }>(sql`
    select
      source_row_number,
      raw_values
    from public.pricing_classification_cir
    where snapshot_id = ${snapshotId}
    order by source_row_number asc
  `);

  const segmentsRows = await db.execute<{
    source_row_number: number;
    raw_values: Record<string, string>;
  }>(sql`
    select
      g.source_row_number,
      coalesce(s.raw_values, '{}'::jsonb)
        || coalesce(l.raw_values, '{}'::jsonb)
        || coalesce(g.raw_values, '{}'::jsonb) as raw_values
    from public.pricing_segment_purchase_grids g
    join public.pricing_supplier_segments s on s.id = g.segment_id
    left join lateral (
      select raw_values
      from public.pricing_segment_classification_links l
      where l.segment_id = s.id
        and l.source_row_number = s.source_row_number
      order by l.created_at asc
      limit 1
    ) l on true
    where g.snapshot_id = ${snapshotId}
    order by g.source_row_number asc
  `);

  return [
    ...classificationRows.map((row) => ({
      file_kind: "classification" as const,
      source_row_number: row.source_row_number,
      raw_values: row.raw_values,
    })),
    ...segmentsRows.map((row) => ({
      file_kind: "segments_grids" as const,
      source_row_number: row.source_row_number,
      raw_values: row.raw_values,
    })),
  ];
};

const exportSourceColumnsForKind = (
  fileKind: PricingReferenceFileKind,
): readonly string[] =>
  fileKind === "classification"
    ? PRICING_REFERENCE_CLASSIFICATION_COLUMNS
    : PRICING_REFERENCE_SEGMENTS_GRIDS_COLUMNS;

const exportSheetNameForKind = (
  fileKind: PricingReferenceFileKind | "unknown",
): string => {
  if (fileKind === "classification") return "Classification";
  if (fileKind === "segments_grids") return "Segments grilles";
  return "Anomalies sans fichier";
};

const exportFilenameForKind = (
  fileKind: PricingReferenceFileKind,
  scopeId: string,
  requestId: string,
): string => {
  const label = fileKind === "classification"
    ? "classification"
    : "segments-grilles";
  return `anomalies-referentiel-${label}-${scopeId}-${requestId}.xlsx`;
};

const anomalyRowKey = (
  fileKind: PricingReferenceFileKind,
  sourceRowNumber: number | null,
): string | null => sourceRowNumber ? `${fileKind}:${sourceRowNumber}` : null;

const joinUniqueValues = (values: string[]): string =>
  uniqueValues(values.filter(Boolean)).join(" | ");

const groupAnomaliesBySourceRow = (
  rows: PricingReferenceAnomalyQueryRow[],
): {
  bySourceRow: Map<string, PricingReferenceAnomalyQueryRow[]>;
  withoutSourceRow: PricingReferenceAnomalyQueryRow[];
} => {
  const bySourceRow = new Map<string, PricingReferenceAnomalyQueryRow[]>();
  const withoutSourceRow: PricingReferenceAnomalyQueryRow[] = [];

  for (const row of rows) {
    const fileKind = row.source_file?.file_kind;
    const key = fileKind
      ? anomalyRowKey(fileKind, row.source_row_number)
      : null;
    if (!key) {
      withoutSourceRow.push(row);
      continue;
    }
    bySourceRow.set(key, [...(bySourceRow.get(key) ?? []), row]);
  }

  return { bySourceRow, withoutSourceRow };
};

const sourceRowToExportRecord = (
  row: PricingReferenceExportSourceRow,
  sourceColumns: readonly string[],
  anomalies: PricingReferenceAnomalyQueryRow[],
): Record<string, string | number> => {
  const record: Record<string, string | number> = {};
  for (const column of sourceColumns) {
    const value = row.raw_values[column];
    record[column] = typeof value === "string" || typeof value === "number"
      ? value
      : "";
  }
  record.TYPE_ANOMALIE = joinUniqueValues(
    anomalies.map((anomaly) => pricingReferenceAnomalyTypeLabels[anomaly.type]),
  );
  record.ACTION_CORRECTION = joinUniqueValues(
    anomalies.map((anomaly) =>
      pricingReferenceAnomalyTypeActionLabels[anomaly.type]
    ),
  );
  return record;
};

const fileAnomalyToExportRecord = (
  row: PricingReferenceAnomalyQueryRow,
): Record<string, string | number> => ({
  FICHIER: row.source_file?.original_filename ?? "",
  TYPE_ANOMALIE: pricingReferenceAnomalyTypeLabels[row.type],
  ACTION_CORRECTION: pricingReferenceAnomalyTypeActionLabels[row.type],
});

const sourceRowsForKind = (
  rows: PricingReferenceExportSourceRow[],
  fileKind: PricingReferenceFileKind,
): PricingReferenceExportSourceRow[] =>
  rows.filter((row) => row.file_kind === fileKind);

const anomalyRowsForKind = (
  rows: PricingReferenceAnomalyQueryRow[],
  fileKind: PricingReferenceFileKind,
): PricingReferenceAnomalyQueryRow[] =>
  rows.filter((row) => row.source_file?.file_kind === fileKind);

type ExportWorksheet = {
  name: string;
  headers: string[];
  records: Array<Record<string, string | number>>;
  minColumnWidth: number;
};

const escapeXml = (value: string): string =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");

const toColumnName = (columnIndex: number): string => {
  let index = columnIndex;
  let name = "";
  while (index > 0) {
    const remainder = (index - 1) % 26;
    name = String.fromCharCode(65 + remainder) + name;
    index = Math.floor((index - 1) / 26);
  }
  return name;
};

const toCellRef = (columnIndex: number, rowIndex: number): string =>
  `${toColumnName(columnIndex)}${rowIndex}`;

const toInlineStringCell = (
  columnIndex: number,
  rowIndex: number,
  value: string | number,
): string => {
  const text = String(value);
  return `<c r="${
    toCellRef(columnIndex, rowIndex)
  }" t="inlineStr"><is><t xml:space="preserve">${escapeXml(text)}</t></is></c>`;
};

const buildWorksheetXml = (sheet: ExportWorksheet): string => {
  const rowXml: string[] = [];
  const allRows = [
    sheet.headers,
    ...sheet.records.map((record) =>
      sheet.headers.map((header) => record[header] ?? "")
    ),
  ];

  allRows.forEach((row, rowIndex) => {
    const excelRowIndex = rowIndex + 1;
    const cells = row.map((value, columnIndex) =>
      toInlineStringCell(columnIndex + 1, excelRowIndex, value)
    );
    rowXml.push(`<row r="${excelRowIndex}">${cells.join("")}</row>`);
  });

  const lastColumn = toColumnName(Math.max(sheet.headers.length, 1));
  const lastRow = Math.max(allRows.length, 1);
  const range = `A1:${lastColumn}${lastRow}`;
  const cols = sheet.headers.map((header, index) => {
    const width = Math.min(
      Math.max(header.length + 2, sheet.minColumnWidth),
      54,
    );
    return `<col min="${index + 1}" max="${
      index + 1
    }" width="${width}" customWidth="1"/>`;
  }).join("");

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <dimension ref="${range}"/>
  <sheetViews><sheetView workbookViewId="0"/></sheetViews>
  <sheetFormatPr defaultRowHeight="15"/>
  <cols>${cols}</cols>
  <sheetData>${rowXml.join("")}</sheetData>
  <autoFilter ref="${range}"/>
  <pageMargins left="0.7" right="0.7" top="0.75" bottom="0.75" header="0.3" footer="0.3"/>
</worksheet>`;
};

const workbookToArrayBuffer = (sheets: ExportWorksheet[]): ArrayBuffer => {
  const sheetEntries = sheets.map((sheet, index) => ({
    sheet,
    sheetId: index + 1,
    relationshipId: `rId${index + 1}`,
    path: `xl/worksheets/sheet${index + 1}.xml`,
  }));

  const contentTypes = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
  <Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
  <Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>
  <Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>
  ${
    sheetEntries.map((entry) =>
      `<Override PartName="/${entry.path}" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`
    ).join("")
  }
</Types>`;
  const workbookXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheets>${
    sheetEntries.map((entry) =>
      `<sheet name="${
        escapeXml(entry.sheet.name)
      }" sheetId="${entry.sheetId}" r:id="${entry.relationshipId}"/>`
    ).join("")
  }</sheets>
</workbook>`;
  const workbookRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  ${
    sheetEntries.map((entry) =>
      `<Relationship Id="${entry.relationshipId}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${entry.sheetId}.xml"/>`
    ).join("")
  }
  <Relationship Id="rId${
    sheetEntries.length + 1
  }" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`;
  const rootRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>
  <Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/>
</Relationships>`;
  const stylesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <fonts count="1"><font><sz val="11"/><name val="Calibri"/></font></fonts>
  <fills count="1"><fill><patternFill patternType="none"/></fill></fills>
  <borders count="1"><border/></borders>
  <cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
  <cellXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/></cellXfs>
</styleSheet>`;
  const now = new Date().toISOString();
  const coreXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <dc:title>Export anomalies referentiel CIR</dc:title>
  <dcterms:created xsi:type="dcterms:W3CDTF">${now}</dcterms:created>
  <dcterms:modified xsi:type="dcterms:W3CDTF">${now}</dcterms:modified>
</cp:coreProperties>`;
  const appXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties" xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes">
  <Application>CIR Cockpit</Application>
</Properties>`;

  const files: Record<string, Uint8Array> = {
    "[Content_Types].xml": strToU8(contentTypes),
    "_rels/.rels": strToU8(rootRels),
    "docProps/app.xml": strToU8(appXml),
    "docProps/core.xml": strToU8(coreXml),
    "xl/workbook.xml": strToU8(workbookXml),
    "xl/_rels/workbook.xml.rels": strToU8(workbookRels),
    "xl/styles.xml": strToU8(stylesXml),
  };

  for (const entry of sheetEntries) {
    files[entry.path] = strToU8(buildWorksheetXml(entry.sheet));
  }

  const zipped = zipSync(files, { level: 0 });
  return zipped.buffer.slice(
    zipped.byteOffset,
    zipped.byteOffset + zipped.byteLength,
  ) as ArrayBuffer;
};

export const buildAnomaliesExportWorkbook = (
  sourceRows: PricingReferenceExportSourceRow[],
  anomalyRows: PricingReferenceAnomalyQueryRow[],
): ArrayBuffer => {
  const sheets: ExportWorksheet[] = [];
  const rowsByKind = new Map<
    PricingReferenceFileKind,
    PricingReferenceExportSourceRow[]
  >();
  for (const row of sourceRows) {
    const fileKind = row.file_kind;
    rowsByKind.set(fileKind, [...(rowsByKind.get(fileKind) ?? []), row]);
  }
  const { bySourceRow, withoutSourceRow } = groupAnomaliesBySourceRow(
    anomalyRows,
  );

  for (const [fileKind, sheetRows] of rowsByKind) {
    const sourceColumns = exportSourceColumnsForKind(fileKind);
    const headers = [
      ...sourceColumns,
      "TYPE_ANOMALIE",
      "ACTION_CORRECTION",
    ];
    sheets.push({
      name: exportSheetNameForKind(fileKind),
      headers,
      records: [...sheetRows]
        .sort((left, right) => left.source_row_number - right.source_row_number)
        .map((row) =>
          sourceRowToExportRecord(
            row,
            sourceColumns,
            bySourceRow.get(`${fileKind}:${row.source_row_number}`) ?? [],
          )
        ),
      minColumnWidth: 12,
    });
  }

  if (withoutSourceRow.length > 0) {
    const headers = ["FICHIER", "TYPE_ANOMALIE", "ACTION_CORRECTION"];
    sheets.push({
      name: "Anomalies fichier",
      headers,
      records: withoutSourceRow.map(fileAnomalyToExportRecord),
      minColumnWidth: 14,
    });
  }

  if (rowsByKind.size === 0) {
    sheets.push({
      name: "Anomalies",
      headers: ["MESSAGE"],
      records: [{ MESSAGE: "Aucune anomalie exportee." }],
      minColumnWidth: 14,
    });
  }

  return workbookToArrayBuffer(sheets);
};

const cleanupExpiredAnomalyExports = async (): Promise<void> => {
  const storage = getSupabaseAdmin().storage.from(
    PRICING_REFERENCE_STORAGE_BUCKET,
  );
  const cutoff = Date.now() - EXPORT_RETENTION_DAYS * 24 * 60 * 60 * 1000;
  const { data, error } = await storage.list("exports", {
    limit: 100,
    sortBy: { column: "created_at", order: "asc" },
  });
  if (error || !data) return;
  const expiredPaths = data
    .filter((item) => {
      const timestamp = item.created_at ?? item.updated_at ??
        item.last_accessed_at;
      return timestamp ? new Date(timestamp).getTime() < cutoff : false;
    })
    .map((item) => `exports/${item.name}`)
    .filter((path) => path.startsWith("exports/"))
    .slice(0, 100);
  if (expiredPaths.length > 0) {
    await storage.remove(expiredPaths);
  }
};

export const exportPricingReferenceAnomalies = async (
  db: DbClient,
  _callerId: string,
  requestId: string,
  input: PricingReferenceAnomaliesExportInput,
): Promise<PricingReferenceAnomaliesExportResponse> => {
  const snapshotId = await resolveSnapshotId(db, input);
  const anomalyRows = await listAllPricingReferenceAnomaliesForExport(
    db,
    input,
    snapshotId,
  );
  if (anomalyRows.length > ANOMALIES_EXPORT_MAX_ROWS) {
    throw httpError(
      413,
      "REQUEST_FAILED",
      "Export refuse: plus de 50 000 anomalies correspondent aux filtres.",
    );
  }
  const sourceRows = await listPricingReferenceExportSourceRows(db, snapshotId);

  const scopeId = snapshotId ?? input.import_id ?? "current";
  const storage = getSupabaseAdmin().storage.from(
    PRICING_REFERENCE_STORAGE_BUCKET,
  );

  await cleanupExpiredAnomalyExports();

  const expiresAt = new Date(
    Date.now() + EXPORT_SIGNED_URL_EXPIRES_IN_SECONDS * 1000,
  ).toISOString();
  const files: PricingReferenceAnomaliesExportFile[] = [];

  for (const fileKind of ["classification", "segments_grids"] as const) {
    const fileSourceRows = sourceRowsForKind(sourceRows, fileKind);
    const fileAnomalyRows = anomalyRowsForKind(anomalyRows, fileKind);
    const filename = exportFilenameForKind(fileKind, scopeId, requestId);
    const storagePath = `exports/${scopeId}/${fileKind}/${requestId}.xlsx`;
    const workbookBytes = buildAnomaliesExportWorkbook(
      fileSourceRows,
      fileAnomalyRows,
    );

    const { error: uploadError } = await storage.upload(
      storagePath,
      new Blob([workbookBytes], { type: PRICING_REFERENCE_XLSX_MIME }),
      {
        contentType: PRICING_REFERENCE_XLSX_MIME,
        cacheControl: "3600",
        upsert: false,
      },
    );
    if (uploadError) {
      throw httpError(
        500,
        "PRICING_REFERENCE_IMPORT_STORAGE_FAILED",
        `Impossible de stocker l export ${filename}.`,
        uploadError.message,
      );
    }

    const { data: signedUrl, error: signedUrlError } = await storage
      .createSignedUrl(
        storagePath,
        EXPORT_SIGNED_URL_EXPIRES_IN_SECONDS,
        { download: filename },
      );
    if (signedUrlError || !signedUrl?.signedUrl) {
      throw httpError(
        500,
        "PRICING_REFERENCE_IMPORT_STORAGE_FAILED",
        `Impossible de generer l URL signee de l export ${filename}.`,
        signedUrlError?.message,
      );
    }

    files.push({
      file_kind: fileKind,
      download_url: signedUrl.signedUrl,
      expires_at: expiresAt,
      filename,
      row_count: fileSourceRows.length,
    });
  }

  return assertAnomaliesExportResponse({
    ok: true,
    request_id: requestId,
    files,
    row_count: sourceRows.length,
  });
};

const CLASSIFICATION_LIST_ALL_MAX_ROWS = 5000;

export const listAllPricingReferenceClassification = async (
  db: DbClient,
  _callerId: string,
  requestId: string,
  input: PricingReferenceClassificationListAllInput,
): Promise<PricingReferenceClassificationListAllResponse> => {
  const snapshotId = await resolveSnapshotId(db, input);
  if (!snapshotId) {
    return {
      ok: true,
      request_id: requestId,
      rows: [],
      total: 0,
      truncated: false,
    };
  }

  const [rows, totalRows] = await Promise.all([
    db.execute<{
      id: string;
      snapshot_id: string;
      import_id: string;
      source_row_number: number;
      cir_key: string;
      mega: string;
      fam: string;
      sfa: string;
      mega_lib: string;
      fam_lib: string;
      sfa_lib: string;
    }>(sql`
      select id, snapshot_id, import_id, source_row_number, cir_key, mega, fam, sfa, mega_lib, fam_lib, sfa_lib
      from public.pricing_classification_cir
      where snapshot_id = ${snapshotId}
      order by mega asc, fam asc, sfa asc
      limit ${CLASSIFICATION_LIST_ALL_MAX_ROWS}
    `),
    db.execute<{ total: number }>(sql`
      select count(*)::int as total
      from public.pricing_classification_cir
      where snapshot_id = ${snapshotId}
    `),
  ]);
  const total = totalRows[0]?.total ?? rows.length;

  return {
    ok: true,
    request_id: requestId,
    rows,
    total,
    truncated: total > rows.length,
  };
};
