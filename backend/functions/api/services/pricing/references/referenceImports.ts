import { and, desc, eq, sql, type SQL } from 'drizzle-orm';
import * as XLSX from 'xlsx';

import {
  pricing_reference_anomalies,
  pricing_reference_column_mapping_profiles,
  pricing_reference_import_files,
  pricing_reference_imports,
  pricing_reference_snapshots
} from '../../../../../drizzle/schema.ts';
import {
  PRICING_REFERENCE_ANOMALY_DEFAULT_MARQUE,
  PRICING_REFERENCE_CLASSIFICATION_COLUMNS,
  PRICING_REFERENCE_SEGMENTS_GRIDS_COLUMNS,
  PRICING_REFERENCE_STORAGE_BUCKET,
  PRICING_REFERENCE_XLSX_MIME,
  pricingReferenceAnomalySeverityLabels,
  pricingReferenceAnomalyTypeActionLabels,
  pricingReferenceAnomalyTypeLabels,
  pricingReferenceColumnAliasesSchema,
  pricingReferenceColumnMappingProfileSchema,
  pricingReferenceColumnMappingSchema,
  pricingReferenceAnomaliesExportResponseSchema,
  pricingReferenceHealthReportSchema,
  pricingReferenceImportConfirmMappingResponseSchema,
  pricingReferenceImportInspectResponseSchema,
  pricingReferenceImportAssistMappingResponseSchema,
  type PricingReferenceColumnAliases,
  type PricingReferenceColumnMapping,
  type PricingReferenceColumnMappingProfile,
  type PricingReferenceFileKind,
  type PricingReferenceImportAnalyzeResponse,
  type PricingReferenceImportStatus,
  type PricingReferenceImportAssistMappingInput,
  type PricingReferenceImportAssistMappingResponse,
  type PricingReferenceAnomaliesExportInput,
  type PricingReferenceAnomaliesExportResponse,
  type PricingReferenceAnomaliesListInput,
  type PricingReferenceAnomaliesSortBy,
  type PricingReferenceAnomaliesListResponse,
  type PricingReferenceAnomaliesSummaryGetInput,
  type PricingReferenceAnomaliesSummaryResponse,
  type PricingReferenceAnomalySeverity,
  type PricingReferenceAnomalyType,
  type PricingReferenceClassificationListAllInput,
  type PricingReferenceClassificationListAllResponse,
  type PricingReferenceClassificationListInput,
  type PricingReferenceClassificationSortBy,
  type PricingReferenceClassificationListResponse,
  type PricingReferenceHealthGetResponse,
  type PricingReferenceImportAnalyzeInput,
  type PricingReferenceImportConfirmMappingInput,
  type PricingReferenceImportConfirmMappingResponse,
  type PricingReferenceImportGetInput,
  type PricingReferenceImportGetResponse,
  type PricingReferenceImportInspectInput,
  type PricingReferenceImportInspectResponse,
  type PricingReferenceImportsListInput,
  type PricingReferenceImportsListResponse,
  type PricingReferenceImportsPrepareInput,
  type PricingReferenceImportsPrepareResponse,
  type PricingReferenceLinkStatus,
  type PricingReferenceRowsListInput,
  type PricingReferenceSegmentsListInput,
  type PricingReferenceSegmentsSortBy,
  type PricingReferenceSortDirection,
  type PricingReferenceSegmentsListResponse
} from '../../../../../../shared/schemas/pricing/references.schema.ts';
import { getSupabaseAdmin } from '../../../middleware/auth/auth.ts';
import { httpError } from '../../../middleware/errorHandler.ts';
import type { DbClient } from '../../../types.ts';
import { checkRateLimit } from '../../rate-limiting/rateLimit.ts';
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
  type PricingReferenceAnalysisResult
} from './referenceExcelParser.ts';

type ImportFileRow = typeof pricing_reference_import_files.$inferSelect;
type ImportRow = typeof pricing_reference_imports.$inferSelect;
type SnapshotRow = typeof pricing_reference_snapshots.$inferSelect;
type ColumnMappingProfileRow = typeof pricing_reference_column_mapping_profiles.$inferSelect;
type PricingReferenceAnomalyQueryRow = {
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

const SIGNED_UPLOAD_EXPIRES_IN_SECONDS = 60 * 60 * 2;
const EXPORT_SIGNED_URL_EXPIRES_IN_SECONDS = 60 * 60;
const EXPORT_RETENTION_DAYS = 7;
const ANOMALIES_EXPORT_MAX_ROWS = 50_000;
const INSERT_CHUNK_SIZE = 250;
const BULK_INSERT_CHUNK_SIZE = 1000;

const toOffset = (page: number, pageSize: number): number => (page - 1) * pageSize;
const sortDirectionSql = (direction: PricingReferenceSortDirection): SQL =>
  direction === 'desc' ? sql`desc` : sql`asc`;

const uniqueValues = <T>(values: T[]): T[] => Array.from(new Set(values));

const severityWeight: Record<PricingReferenceAnomalySeverity, number> = {
  bloquante: 4,
  haute: 3,
  moyenne: 2,
  faible: 1
};

const severityFromWeight = (weight: number): PricingReferenceAnomalySeverity => {
  if (weight >= severityWeight.bloquante) return 'bloquante';
  if (weight === severityWeight.haute) return 'haute';
  if (weight === severityWeight.moyenne) return 'moyenne';
  return 'faible';
};

const anomalyMarqueSql = (): SQL => sql`coalesce(
  nullif(trim(${pricing_reference_anomalies.details}->'raw_values'->>'MARQUE'), ''),
  nullif(trim(split_part(coalesce(${pricing_reference_anomalies.details}->>'segment_key', ${pricing_reference_anomalies.object_id}, ''), '|', 3)), ''),
  ${PRICING_REFERENCE_ANOMALY_DEFAULT_MARQUE}
)`;

const anomalySeverityWeightSql = (): SQL => sql`case ${pricing_reference_anomalies.severity}
  when 'bloquante' then 4
  when 'haute' then 3
  when 'moyenne' then 2
  else 1
end`;

const classificationSortSql = (sortBy: PricingReferenceClassificationSortBy): SQL => {
  switch (sortBy) {
    case 'cir_key':
      return sql`cir_key`;
    case 'fam':
      return sql`fam`;
    case 'sfa':
      return sql`sfa`;
    case 'source_row_number':
      return sql`source_row_number`;
    case 'mega':
    default:
      return sql`mega`;
  }
};

const segmentSortSql = (sortBy: PricingReferenceSegmentsSortBy): SQL => {
  switch (sortBy) {
    case 'cat_fab':
      return sql`s.cat_fab`;
    case 'segment':
      return sql`s.segment`;
    case 'idnumerique':
      return sql`s.idnumerique`;
    case 'link_status':
      return sql`l.link_status`;
    case 'purchase_grid_rows_count':
      return sql`purchase_grid_rows_count`;
    case 'source_row_number':
      return sql`s.source_row_number`;
    case 'marque':
    default:
      return sql`s.marque`;
  }
};

const anomalySortSql = (sortBy: PricingReferenceAnomaliesSortBy): SQL => {
  switch (sortBy) {
    case 'severity':
      return sql`pricing_reference_anomalies.severity`;
    case 'type':
      return sql`pricing_reference_anomalies.type`;
    case 'source_row_number':
      return sql`pricing_reference_anomalies.source_row_number`;
    case 'created_at':
    default:
      return sql`pricing_reference_anomalies.created_at`;
  }
};

const optionalExactFilter = (column: SQL, value: string | undefined): SQL | null => {
  const normalized = value?.trim();
  return normalized ? sql<boolean>`lower(${column}) = ${normalized.toLowerCase()}` : null;
};

const andSql = (conditions: SQL[]): SQL =>
  conditions.length > 0 ? sql.join(conditions, sql` and `) : sql`true`;

const uniqueNonEmptyStrings = (values: string[] | undefined): string[] =>
  uniqueValues((values ?? []).map((value) => value.trim()).filter(Boolean));

const inValuesSql = (column: SQL, values: string[] | undefined): SQL | null => {
  const normalized = uniqueNonEmptyStrings(values);
  return normalized.length > 0
    ? sql<boolean>`${column} in (${sql.join(normalized.map((value) => sql`${value}`), sql`, `)})`
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
    'import_id' | 'snapshot_id' | 'search' | 'severities' | 'types' | 'marques'
  >,
  snapshotId: string | null,
  omittedFacet?: 'severities' | 'types' | 'marques'
): SQL[] => {
  const conditions: SQL[] = [];
  if (input.import_id) conditions.push(eq(pricing_reference_anomalies.import_id, input.import_id));
  if (snapshotId) conditions.push(eq(pricing_reference_anomalies.snapshot_id, snapshotId));
  if (omittedFacet !== 'severities') {
    const severityFilter = inValuesSql(sql`${pricing_reference_anomalies.severity}`, input.severities);
    if (severityFilter) conditions.push(severityFilter);
  }
  if (omittedFacet !== 'types') {
    const typeFilter = inValuesSql(sql`${pricing_reference_anomalies.type}`, input.types);
    if (typeFilter) conditions.push(typeFilter);
  }
  if (omittedFacet !== 'marques') {
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
    .replace(/[^a-zA-Z0-9._-]+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '');

const flushJsonbRecordsetInsert = async (
  tx: DbClient,
  chunk: JsonbRecordsetRow[],
  buildQuery: JsonbRecordsetQueryFactory
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
    throw httpError(500, 'DB_READ_FAILED', 'Rapport de sante referentiel invalide.');
  }
  return parsed.data;
};

const assertColumnMapping = (value: unknown): PricingReferenceColumnMapping => {
  const parsed = pricingReferenceColumnMappingSchema.safeParse(value ?? {});
  if (!parsed.success) {
    throw httpError(
      500,
      'DB_READ_FAILED',
      'Mapping de colonnes referentiel invalide.',
      parsed.error.issues.map((issue) => issue.message).join(' | ')
    );
  }
  return parsed.data;
};

const assertColumnAliases = (value: unknown): PricingReferenceColumnAliases => {
  const parsed = pricingReferenceColumnAliasesSchema.safeParse(value ?? {});
  if (!parsed.success) {
    throw httpError(
      500,
      'DB_READ_FAILED',
      'Alias de colonnes referentiel invalides.',
      parsed.error.issues.map((issue) => issue.message).join(' | ')
    );
  }
  return parsed.data;
};

const toColumnMappingProfile = (row: ColumnMappingProfileRow): PricingReferenceColumnMappingProfile => {
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
    updated_at: row.updated_at
  });
  if (!parsed.success) {
    throw httpError(
      500,
      'DB_READ_FAILED',
      'Profil de mapping referentiel invalide.',
      parsed.error.issues.map((issue) => issue.message).join(' | ')
    );
  }
  return parsed.data;
};

const getDefaultColumnMappingProfile = async (
  db: DbClient,
  fileKind: PricingReferenceFileKind
): Promise<PricingReferenceColumnMappingProfile | null> => {
  const [row] = await db
    .select()
    .from(pricing_reference_column_mapping_profiles)
    .where(and(
      eq(pricing_reference_column_mapping_profiles.file_kind, fileKind),
      eq(pricing_reference_column_mapping_profiles.is_default, true)
    ))
    .limit(1);

  return row ? toColumnMappingProfile(row) : null;
};

const requireImport = async (db: DbClient, importId: string): Promise<ImportRow> => {
  const [row] = await db
    .select()
    .from(pricing_reference_imports)
    .where(eq(pricing_reference_imports.id, importId))
    .limit(1);

  if (!row) {
    throw httpError(404, 'PRICING_REFERENCE_IMPORT_NOT_FOUND', 'Import referentiel introuvable.');
  }

  return row;
};

const requireImportFile = async (
  db: DbClient,
  importId: string,
  fileId: string,
  fileKind: PricingReferenceFileKind
): Promise<ImportFileRow> => {
  const [row] = await db
    .select()
    .from(pricing_reference_import_files)
    .where(and(
      eq(pricing_reference_import_files.id, fileId),
      eq(pricing_reference_import_files.import_id, importId),
      eq(pricing_reference_import_files.file_kind, fileKind)
    ))
    .limit(1);

  if (!row) {
    throw httpError(404, 'PRICING_REFERENCE_IMPORT_FILE_NOT_FOUND', 'Fichier d import referentiel introuvable.');
  }

  return row;
};

const getImportFiles = async (db: DbClient, importId: string): Promise<ImportFileRow[]> =>
  await db
    .select()
    .from(pricing_reference_import_files)
    .where(eq(pricing_reference_import_files.import_id, importId));

const getCurrentImportFiles = async (
  db: DbClient,
  importId: string
): Promise<Partial<Record<PricingReferenceFileKind, ImportFileRow>>> => {
  const files = await getImportFiles(db, importId);
  const classification = files.find((file) => file.file_kind === 'classification');
  const segments = files.find((file) => file.file_kind === 'segments_grids');

  return {
    ...(classification ? { classification } : {}),
    ...(segments ? { segments_grids: segments } : {})
  };
};

const getLatestReusableImportFile = async (
  db: DbClient,
  importId: string,
  fileKind: PricingReferenceFileKind
): Promise<ImportFileRow | null> => {
  const rows = await db.execute<ImportFileRow>(sql`
    select f.*
    from public.pricing_reference_import_files f
    join public.pricing_reference_imports i on i.id = f.import_id
    join public.pricing_reference_snapshots s on s.import_id = i.id
    where f.file_kind = ${fileKind}
      and f.import_id <> ${importId}
    order by s.created_at desc
    limit 1
  `);

  return rows[0] ?? null;
};

const resolveAnalysisFiles = async (
  db: DbClient,
  importId: string
): Promise<{ classification: ImportFileRow; segments_grids: ImportFileRow }> => {
  const currentFiles = await getCurrentImportFiles(db, importId);
  if (!currentFiles.classification && !currentFiles.segments_grids) {
    throw httpError(400, 'PRICING_REFERENCE_IMPORT_INVALID_FILE', 'Aucun fichier referentiel CIR n a ete fourni.');
  }

  const [classificationFallback, segmentsFallback] = await Promise.all([
    currentFiles.classification ? Promise.resolve(null) : getLatestReusableImportFile(db, importId, 'classification'),
    currentFiles.segments_grids ? Promise.resolve(null) : getLatestReusableImportFile(db, importId, 'segments_grids')
  ]);

  const classification = currentFiles.classification ?? classificationFallback;
  const segments = currentFiles.segments_grids ?? segmentsFallback;

  if (!classification) {
    throw httpError(
      400,
      'PRICING_REFERENCE_IMPORT_INVALID_FILE',
      'Le fichier classification CIR est requis car aucun import precedent ne permet de le reutiliser.'
    );
  }
  if (!segments) {
    throw httpError(
      400,
      'PRICING_REFERENCE_IMPORT_INVALID_FILE',
      'Le fichier segments/grilles fabricant est requis car aucun import precedent ne permet de le reutiliser.'
    );
  }

  return { classification, segments_grids: segments };
};

export const assertPricingReferenceCurrentMappingsConfirmed = (
  currentFiles: Partial<Record<PricingReferenceFileKind, ImportFileRow>>
): void => {
  for (const file of Object.values(currentFiles)) {
    if (!file) continue;
    if (file.mapping_status === 'confirme') continue;
    throw httpError(
      400,
      'PRICING_REFERENCE_MAPPING_REQUIRED',
      `Confirmez le mapping des colonnes pour ${file.original_filename} avant analyse.`
    );
  }
};

const toParserFileInput = (
  file: ImportFileRow,
  bytes: Uint8Array,
  sha256: string
) => ({
  file_kind: file.file_kind,
  original_filename: file.original_filename,
  bytes,
  sha256,
  storage_path: file.storage_path,
  sheet_name: file.sheet_name,
  column_mapping: file.mapping_status === 'confirme' ? assertColumnMapping(file.column_mapping) : null
});

const createSignedUpload = async (path: string) => {
  const { data, error } = await getSupabaseAdmin()
    .storage
    .from(PRICING_REFERENCE_STORAGE_BUCKET)
    .createSignedUploadUrl(path);

  if (error || !data?.signedUrl) {
    throw httpError(
      500,
      'PRICING_REFERENCE_IMPORT_STORAGE_FAILED',
      'Impossible de preparer l upload du fichier referentiel.',
      error?.message
    );
  }

  return {
    signed_upload_url: data.signedUrl,
    signed_upload_token: data.token ?? null
  };
};

const downloadStorageBytes = async (file: ImportFileRow): Promise<Uint8Array> => {
  const { data, error } = await getSupabaseAdmin()
    .storage
    .from(file.storage_bucket)
    .download(file.storage_path);

  if (error || !data) {
    throw httpError(
      500,
      'PRICING_REFERENCE_IMPORT_STORAGE_FAILED',
      `Impossible de telecharger le fichier ${file.original_filename}.`,
      error?.message
    );
  }

  return new Uint8Array(await data.arrayBuffer());
};

const assertDownloadedFileMatchesMetadata = async (file: ImportFileRow, bytes: Uint8Array): Promise<string> => {
  ensurePricingReferenceFileAccepted(file.file_kind, file.original_filename, bytes.byteLength);

  if (bytes.byteLength !== file.size_bytes) {
    throw httpError(
      409,
      'PRICING_REFERENCE_IMPORT_INVALID_FILE',
      `La taille du fichier ${file.original_filename} ne correspond pas aux metadata.`
    );
  }

  const hash = await computeSha256(bytes);
  if (hash.toLowerCase() !== file.sha256.toLowerCase()) {
    throw httpError(
      409,
      'PRICING_REFERENCE_IMPORT_HASH_MISMATCH',
      `Le hash du fichier ${file.original_filename} ne correspond pas aux metadata.`
    );
  }

  return hash;
};

const readErrorString = (error: unknown, key: string): string | null => {
  if (!error || typeof error !== 'object') return null;
  const value = Reflect.get(error, key);
  return typeof value === 'string' ? value : null;
};

const recordPricingReferenceAnalysisFailure = async (
  db: DbClient,
  importId: string,
  callerId: string,
  error: unknown
): Promise<void> => {
  const message = error instanceof Error ? error.message : 'Analyse referentiel impossible.';
  const details = readErrorString(error, 'details');
  try {
    await db.update(pricing_reference_imports)
      .set({
        status: 'analyse_erreur',
        analyzed_by: callerId,
        analysis_completed_at: new Date().toISOString(),
        error_code: readErrorString(error, 'code') ?? 'REQUEST_FAILED',
        error_message: message,
        error_details: details
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
  details: string
): Promise<void> => {
  await db.update(pricing_reference_imports)
    .set({
      status: 'analyse_en_cours',
      analyzed_by: callerId,
      analysis_started_at: new Date().toISOString(),
      error_code: null,
      error_message: null,
      error_details: details
    })
    .where(eq(pricing_reference_imports.id, importId));
};

export const preparePricingReferenceImport = async (
  db: DbClient,
  callerId: string,
  requestId: string,
  input: PricingReferenceImportsPrepareInput
): Promise<PricingReferenceImportsPrepareResponse> => {
  const allowed = await checkRateLimit('pricing-reference-imports:prepare', callerId, {
    max: 20,
    windowSeconds: 300
  });
  if (!allowed) {
    throw httpError(429, 'RATE_LIMITED', 'Trop de requetes. Reessayez plus tard.');
  }

  const importId = crypto.randomUUID();
  const nowPrefix = new Date().toISOString().slice(0, 10);
  const preparedFiles: Partial<Record<PricingReferenceFileKind, PricingReferenceImportsPrepareResponse['files'][PricingReferenceFileKind]>> = {};
  const fileRows: Array<typeof pricing_reference_import_files.$inferInsert> = [];

  for (const fileKind of ['classification', 'segments_grids'] as const) {
    const fileInput = input.files[fileKind];
    if (!fileInput) continue;

    ensurePricingReferenceFileAccepted(fileKind, fileInput.original_filename, fileInput.size_bytes);
    const fileId = crypto.randomUUID();
    const pathPrefix = fileKind === 'classification' ? 'classification' : 'segments-grids';
    const storagePath = `imports/${nowPrefix}/${importId}/${pathPrefix}-${normalizeFilename(fileInput.original_filename)}`;
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
      uploaded_by: callerId
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
      signed_upload_expires_in_seconds: SIGNED_UPLOAD_EXPIRES_IN_SECONDS
    };
  }

  await db.transaction(async (tx) => {
    await tx.insert(pricing_reference_imports).values({
      id: importId,
      status: 'brouillon',
      created_by: callerId,
      counters: {}
    });

    await tx.insert(pricing_reference_import_files).values(fileRows);
  });

  return {
    ok: true,
    request_id: requestId,
    import_id: importId,
    status: 'brouillon',
    files: preparedFiles
  };
};

const buildSavedAliases = (
  currentAliases: PricingReferenceColumnAliases,
  mapping: PricingReferenceColumnMapping
): PricingReferenceColumnAliases => {
  const aliases: PricingReferenceColumnAliases = { ...currentAliases };
  Object.entries(mapping).forEach(([canonicalColumn, sourceColumn]) => {
    const values = aliases[canonicalColumn] ?? [];
    aliases[canonicalColumn] = uniqueValues([
      ...values,
      sourceColumn
    ]);
  });
  return aliases;
};

const validateConfirmedMapping = (
  file: ImportFileRow,
  sheetName: string,
  mapping: PricingReferenceColumnMapping
): void => {
  if (file.sheet_name !== sheetName || file.detected_columns.length === 0) {
    throw httpError(
      400,
      'PRICING_REFERENCE_MAPPING_REQUIRED',
      'Previsualisez l onglet Excel avant de confirmer le mapping.'
    );
  }

  const expectedColumns = getPricingReferenceExpectedColumns(file.file_kind);
  const missingCanonicalColumns = expectedColumns.filter((column) => !mapping[column]);
  if (missingCanonicalColumns.length > 0) {
    throw httpError(
      400,
      'PRICING_REFERENCE_MAPPING_REQUIRED',
      `Colonnes obligatoires non mappees: ${missingCanonicalColumns.join(', ')}.`
    );
  }

  const invalidSourceColumns = expectedColumns
    .map((column) => mapping[column])
    .filter((sourceColumn): sourceColumn is string => Boolean(sourceColumn))
    .filter((sourceColumn) => !file.detected_columns.includes(sourceColumn));

  if (invalidSourceColumns.length > 0) {
    throw httpError(
      400,
      'PRICING_REFERENCE_MAPPING_INVALID',
      `Colonnes source introuvables dans l onglet: ${uniqueValues(invalidSourceColumns).join(', ')}.`
    );
  }
};

const assertInspectResponse = (value: unknown): PricingReferenceImportInspectResponse => {
  const parsed = pricingReferenceImportInspectResponseSchema.safeParse(value);
  if (!parsed.success) {
    throw httpError(
      500,
      'REQUEST_FAILED',
      'Reponse inspection mapping invalide.',
      parsed.error.issues.map((issue) => issue.message).join(' | ')
    );
  }
  return parsed.data;
};

const assertConfirmMappingResponse = (value: unknown): PricingReferenceImportConfirmMappingResponse => {
  const parsed = pricingReferenceImportConfirmMappingResponseSchema.safeParse(value);
  if (!parsed.success) {
    throw httpError(
      500,
      'REQUEST_FAILED',
      'Reponse confirmation mapping invalide.',
      parsed.error.issues.map((issue) => issue.message).join(' | ')
    );
  }
  return parsed.data;
};

const assertAssistMappingResponse = (value: unknown): PricingReferenceImportAssistMappingResponse => {
  const parsed = pricingReferenceImportAssistMappingResponseSchema.safeParse(value);
  if (!parsed.success) {
    throw httpError(
      500,
      'REQUEST_FAILED',
      'Reponse assistance mapping invalide.',
      parsed.error.issues.map((issue) => issue.message).join(' | ')
    );
  }
  return parsed.data;
};

const assertAnomaliesExportResponse = (value: unknown): PricingReferenceAnomaliesExportResponse => {
  const parsed = pricingReferenceAnomaliesExportResponseSchema.safeParse(value);
  if (!parsed.success) {
    throw httpError(
      500,
      'REQUEST_FAILED',
      'Reponse export anomalies invalide.',
      parsed.error.issues.map((issue) => issue.message).join(' | ')
    );
  }
  return parsed.data;
};

const readRecord = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;

const readStringValue = (record: Record<string, unknown>, key: string): string | null => {
  const value = record[key];
  return typeof value === 'string' && value.trim() ? value.trim() : null;
};

const toColumnList = (columns: string[]): string[] =>
  uniqueValues(columns.map((column) => column.trim()).filter(Boolean)).sort((left, right) =>
    left.localeCompare(right)
  );

export const inspectPricingReferenceImport = async (
  db: DbClient,
  callerId: string,
  requestId: string,
  input: PricingReferenceImportInspectInput
): Promise<PricingReferenceImportInspectResponse> => {
  const allowed = await checkRateLimit('pricing-reference-imports:inspect', callerId, {
    max: 30,
    windowSeconds: 300
  });
  if (!allowed) {
    throw httpError(429, 'RATE_LIMITED', 'Trop de requetes. Reessayez plus tard.');
  }

  await requireImport(db, input.import_id);
  const file = await requireImportFile(db, input.import_id, input.file_id, input.file_kind);
  const defaultProfile = await getDefaultColumnMappingProfile(db, input.file_kind);
  const bytes = await downloadStorageBytes(file);
  const sha256 = await assertDownloadedFileMatchesMetadata(file, bytes);
  const inspection = inspectPricingReferenceWorkbook(
    {
      file_kind: input.file_kind,
      original_filename: file.original_filename,
      bytes,
      sha256,
      storage_path: file.storage_path,
      sheet_name: input.sheet_name ?? file.sheet_name ?? null
    },
    defaultProfile?.aliases ?? null,
    defaultProfile?.column_mapping ?? null
  );

  await db.update(pricing_reference_import_files)
    .set({
      sheet_name: inspection.sheet_name,
      detected_columns: inspection.detected_columns,
      row_count: inspection.row_count,
      column_mapping: inspection.proposed_mapping,
      mapping_status: inspection.mapping_status
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
    default_profile: defaultProfile
  });
};

export const assistPricingReferenceImportMapping = async (
  db: DbClient,
  callerId: string,
  requestId: string,
  input: PricingReferenceImportAssistMappingInput
): Promise<PricingReferenceImportAssistMappingResponse> => {
  const inspection = await inspectPricingReferenceImport(db, callerId, requestId, input);
  const mappedCandidates = inspection.candidates.filter((candidate) => candidate.source_column);
  const confidentCandidates = inspection.candidates.filter((candidate) => candidate.confidence >= 0.9);
  const worksheetScore = inspection.expected_columns.length === 0
    ? 0
    : mappedCandidates.length / inspection.expected_columns.length;
  const headerQuality = inspection.expected_columns.length === 0
    ? 0
    : confidentCandidates.length / inspection.expected_columns.length;
  const aiNeeded = inspection.mapping_status === 'a_confirmer' || inspection.mapping_status === 'invalide';
  const missing = inspection.candidates
    .filter((candidate) => !candidate.source_column)
    .map((candidate) => candidate.canonical_column);
  const evidence = [
    `${mappedCandidates.length}/${inspection.expected_columns.length} colonne(s) mappees par le moteur deterministe.`,
    `${confidentCandidates.length}/${inspection.expected_columns.length} correspondance(s) a confiance forte.`,
    missing.length > 0
      ? `Colonnes a arbitrer: ${missing.join(', ')}.`
      : 'Aucune colonne obligatoire manquante apres inspection.'
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
      trigger: aiNeeded ? 'ambiguous_or_invalid_only' : 'not_needed',
      response_schema: 'strict_mapping_candidate',
      can_confirm_mapping: false
    }
  });
};

export const confirmPricingReferenceImportMapping = async (
  db: DbClient,
  callerId: string,
  requestId: string,
  input: PricingReferenceImportConfirmMappingInput
): Promise<PricingReferenceImportConfirmMappingResponse> => {
  const allowed = await checkRateLimit('pricing-reference-imports:confirm-mapping', callerId, {
    max: 30,
    windowSeconds: 300
  });
  if (!allowed) {
    throw httpError(429, 'RATE_LIMITED', 'Trop de requetes. Reessayez plus tard.');
  }

  await requireImport(db, input.import_id);
  const file = await requireImportFile(db, input.import_id, input.file_id, input.file_kind);
  validateConfirmedMapping(file, input.sheet_name, input.column_mapping);

  let savedProfile: PricingReferenceColumnMappingProfile | null = null;
  await db.transaction(async (tx) => {
    if (input.save_as_default) {
      const [currentProfile] = await tx
        .select()
        .from(pricing_reference_column_mapping_profiles)
        .where(and(
          eq(pricing_reference_column_mapping_profiles.file_kind, input.file_kind),
          eq(pricing_reference_column_mapping_profiles.is_default, true)
        ))
        .limit(1);

      const aliases = buildSavedAliases(
        currentProfile ? assertColumnAliases(currentProfile.aliases) : {},
        input.column_mapping
      );

      const profileName = input.file_kind === 'classification'
        ? 'Mapping par defaut classification produit CIR'
        : 'Mapping par defaut segments et grilles fabricant';

      const [profileRow] = currentProfile
        ? await tx.update(pricing_reference_column_mapping_profiles)
          .set({
            name: profileName,
            column_mapping: input.column_mapping,
            aliases,
            updated_by: callerId
          })
          .where(eq(pricing_reference_column_mapping_profiles.id, currentProfile.id))
          .returning()
        : await tx.insert(pricing_reference_column_mapping_profiles)
          .values({
            file_kind: input.file_kind,
            name: profileName,
            column_mapping: input.column_mapping,
            aliases,
            is_default: true,
            created_by: callerId,
            updated_by: callerId
          })
          .returning();

      if (profileRow) savedProfile = toColumnMappingProfile(profileRow);
    }

    await tx.update(pricing_reference_import_files)
      .set({
        sheet_name: input.sheet_name,
        column_mapping: input.column_mapping,
        mapping_profile_id: savedProfile?.id ?? file.mapping_profile_id,
        mapping_status: 'confirme',
        mapping_confirmed_by: callerId,
        mapping_confirmed_at: new Date().toISOString()
      })
      .where(eq(pricing_reference_import_files.id, file.id));
  });

  return assertConfirmMappingResponse({
    ok: true,
    request_id: requestId,
    import_id: input.import_id,
    file_id: file.id,
    file_kind: input.file_kind,
    mapping_status: 'confirme',
    column_mapping: input.column_mapping,
    saved_profile: savedProfile
  });
};

const insertClassificationRows = async (
  tx: DbClient,
  snapshotId: string,
  importId: string,
  fileId: string,
  rows: ParsedClassificationRow[]
): Promise<Map<string, string>> => {
  const ids = new Map<string, string>();
  const chunk: JsonbRecordsetRow[] = [];
  const flush = () => flushJsonbRecordsetInsert(tx, chunk, (payload) => sql`
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
      normalized_values: row.normalized_values
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
  rows: ParsedSupplierSegmentRow[]
): Promise<Map<string, string>> => {
  const ids = new Map<string, string>();
  const chunk: JsonbRecordsetRow[] = [];
  const flush = () => flushJsonbRecordsetInsert(tx, chunk, (payload) => sql`
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
      normalized_values: row.normalized_values
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
  classificationIds: Map<string, string>
): Promise<void> => {
  const chunk: JsonbRecordsetRow[] = [];
  const flush = () => flushJsonbRecordsetInsert(tx, chunk, (payload) => sql`
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
      classification_id: row.classification_cir_key ? classificationIds.get(row.classification_cir_key) ?? null : null,
      source_file_id: fileId,
      source_row_number: row.source_row_number,
      mega_famille: row.mega_famille,
      famille: row.famille,
      sous_famille: row.sous_famille,
      cir_key: row.cir_key,
      link_status: row.link_status,
      raw_values: row.raw_values,
      normalized_values: row.normalized_values
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
  segmentIds: Map<string, string>
): Promise<void> => {
  const chunk: JsonbRecordsetRow[] = [];
  const flush = () => flushJsonbRecordsetInsert(tx, chunk, (payload) => sql`
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
      normalized_values: row.normalized_values
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
  anomalies: ParsedReferenceAnomaly[]
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
    details: anomaly.details ?? {}
  }));

  for (let index = 0; index < values.length; index += INSERT_CHUNK_SIZE) {
    await tx.insert(pricing_reference_anomalies).values(values.slice(index, index + INSERT_CHUNK_SIZE));
  }
};

export const resolvePricingReferenceAnalysisStatus = (
  analysis: Pick<PricingReferenceAnalysisResult, 'health_report'>
): PricingReferenceImportStatus =>
  analysis.health_report.anomalies.bloquante > 0 ? 'analyse_erreur' : 'analyse_ok';

const persistAnalysis = async (
  db: DbClient,
  importId: string,
  callerId: string,
  files: { classification: ImportFileRow; segments_grids: ImportFileRow },
  analysis: PricingReferenceAnalysisResult
): Promise<PersistedAnalysisState> => {
  const snapshotId = crypto.randomUUID();
  const importStatus = resolvePricingReferenceAnalysisStatus(analysis);

  await markPricingReferenceAnalysisProgress(db, importId, callerId, 'Analyse referentiel: nettoyage des donnees partielles precedentes.');
  await db.transaction(async (tx) => {
    await tx.execute(sql`delete from public.pricing_reference_anomalies where import_id = ${importId}`);
    await tx.execute(sql`delete from public.pricing_segment_purchase_grids where import_id = ${importId}`);
    await tx.execute(sql`delete from public.pricing_segment_classification_links where import_id = ${importId}`);
    await tx.execute(sql`delete from public.pricing_classification_cir where import_id = ${importId}`);
    await tx.execute(sql`delete from public.pricing_supplier_segments where import_id = ${importId}`);
    await tx.execute(sql`delete from public.pricing_reference_snapshots where import_id = ${importId}`);

    await tx.update(pricing_reference_imports)
      .set({
        status: 'analyse_en_cours',
        analyzed_by: callerId,
        analysis_started_at: new Date().toISOString(),
        error_code: null,
        error_message: null,
        error_details: null
      })
      .where(eq(pricing_reference_imports.id, importId));

    await tx.update(pricing_reference_import_files)
      .set({
        sheet_name: analysis.health_report.files.classification.sheet_name,
        detected_columns: analysis.health_report.files.classification.columns.detected,
        row_count: analysis.health_report.files.classification.rows_count
      })
      .where(eq(pricing_reference_import_files.id, files.classification.id));

    await tx.update(pricing_reference_import_files)
      .set({
        sheet_name: analysis.health_report.files.segments_grids.sheet_name,
        detected_columns: analysis.health_report.files.segments_grids.columns.detected,
        row_count: analysis.health_report.files.segments_grids.rows_count
      })
      .where(eq(pricing_reference_import_files.id, files.segments_grids.id));

    await tx.insert(pricing_reference_snapshots).values({
      id: snapshotId,
      import_id: importId,
      status: 'cree',
      is_active: false,
      created_by: callerId,
      counters: {
        classification: analysis.health_report.classification,
        segments_grids: analysis.health_report.segments_grids,
        anomalies: analysis.health_report.anomalies
      }
    });
  });

  await markPricingReferenceAnalysisProgress(db, importId, callerId, `Analyse referentiel: insertion classifications (${analysis.classification_rows.length}).`);
  const classificationIds = await insertClassificationRows(
    db,
    snapshotId,
    importId,
    files.classification.id,
    analysis.classification_rows
  );
  await markPricingReferenceAnalysisProgress(db, importId, callerId, `Analyse referentiel: insertion segments (${analysis.segment_rows.length}).`);
  const segmentIds = await insertSegmentRows(
    db,
    snapshotId,
    importId,
    files.segments_grids.id,
    analysis.segment_rows
  );
  await markPricingReferenceAnalysisProgress(db, importId, callerId, `Analyse referentiel: insertion liaisons classification (${analysis.link_rows.length}).`);
  await insertLinkRows(db, snapshotId, importId, files.segments_grids.id, analysis.link_rows, segmentIds, classificationIds);
  await markPricingReferenceAnalysisProgress(db, importId, callerId, `Analyse referentiel: insertion grilles achat (${analysis.purchase_grid_rows.length}).`);
  await insertPurchaseGridRows(db, snapshotId, importId, files.segments_grids.id, analysis.purchase_grid_rows, segmentIds);
  await markPricingReferenceAnalysisProgress(db, importId, callerId, `Analyse referentiel: insertion anomalies (${analysis.anomalies.length}).`);
  await insertAnomalyRows(
    db,
    snapshotId,
    importId,
    { classification: files.classification.id, segments_grids: files.segments_grids.id },
    analysis.anomalies
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
        anomalies: analysis.health_report.anomalies
      },
      error_code: importStatus === 'analyse_erreur' ? 'PRICING_REFERENCE_IMPORT_BLOCKING_ANOMALIES' : null,
      error_message: importStatus === 'analyse_erreur'
        ? 'Des anomalies bloquantes empechent l activation du snapshot referentiel.'
        : null,
      error_details: importStatus === 'analyse_erreur'
        ? `${analysis.health_report.anomalies.bloquante} anomalie(s) bloquante(s) detectee(s).`
        : null
    })
    .where(eq(pricing_reference_imports.id, importId));

  return { snapshotId, importStatus };
};

export const analyzePricingReferenceImport = async (
  db: DbClient,
  callerId: string,
  requestId: string,
  input: PricingReferenceImportAnalyzeInput
): Promise<PricingReferenceImportAnalyzeResponse> => {
  const allowed = await checkRateLimit('pricing-reference-imports:analyze', callerId, {
    max: 10,
    windowSeconds: 300
  });
  if (!allowed) {
    throw httpError(429, 'RATE_LIMITED', 'Trop de requetes. Reessayez plus tard.');
  }

  await requireImport(db, input.import_id);

  try {
    await markPricingReferenceAnalysisProgress(db, input.import_id, callerId, 'Analyse referentiel: resolution des fichiers source.');
    const currentFiles = await getCurrentImportFiles(db, input.import_id);
    assertPricingReferenceCurrentMappingsConfirmed(currentFiles);
    const files = await resolveAnalysisFiles(db, input.import_id);
    await markPricingReferenceAnalysisProgress(db, input.import_id, callerId, 'Analyse referentiel: telechargement des fichiers XLSX.');
    const [classificationBytes, segmentsBytes] = await Promise.all([
      downloadStorageBytes(files.classification),
      downloadStorageBytes(files.segments_grids)
    ]);

    await markPricingReferenceAnalysisProgress(db, input.import_id, callerId, 'Analyse referentiel: verification des empreintes fichiers.');
    const [classificationHash, segmentsHash] = await Promise.all([
      assertDownloadedFileMatchesMetadata(files.classification, classificationBytes),
      assertDownloadedFileMatchesMetadata(files.segments_grids, segmentsBytes)
    ]);

    await markPricingReferenceAnalysisProgress(db, input.import_id, callerId, 'Analyse referentiel: parsing des classeurs XLSX.');
    const analysis = await analyzePricingReferenceWorkbooks(
      toParserFileInput(files.classification, classificationBytes, classificationHash),
      toParserFileInput(files.segments_grids, segmentsBytes, segmentsHash)
    );

    await markPricingReferenceAnalysisProgress(
      db,
      input.import_id,
      callerId,
      `Analyse referentiel: persistance snapshot (${analysis.classification_rows.length} classifications, ${analysis.segment_rows.length} segments, ${analysis.purchase_grid_rows.length} grilles).`
    );
    const { snapshotId, importStatus } = await persistAnalysis(db, input.import_id, callerId, files, analysis);

    return {
      ok: true,
      request_id: requestId,
      import_id: input.import_id,
      snapshot_id: snapshotId,
      status: importStatus,
      health_report: analysis.health_report
    };
  } catch (error) {
    await recordPricingReferenceAnalysisFailure(db, input.import_id, callerId, error);
    throw error;
  }
};

const toImportSummary = (row: ImportRow) => {
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
    anomalies_total: health?.anomalies.total ?? null
  };
};

export const listPricingReferenceImports = async (
  db: DbClient,
  _callerId: string,
  requestId: string,
  input: PricingReferenceImportsListInput
): Promise<PricingReferenceImportsListResponse> => {
  const conditions: SQL[] = [];
  if (input.status) conditions.push(eq(pricing_reference_imports.status, input.status));
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
      .where(whereClause)
  ]);

  return {
    ok: true,
    request_id: requestId,
    imports: rows.map(toImportSummary),
    page: input.page,
    page_size: input.page_size,
    total: totalRows[0]?.total ?? 0
  };
};

export const getPricingReferenceImport = async (
  db: DbClient,
  _callerId: string,
  requestId: string,
  input: PricingReferenceImportGetInput
): Promise<PricingReferenceImportGetResponse> => {
  const row = await requireImport(db, input.import_id);
  const files = await getImportFiles(db, input.import_id);

  return {
    ok: true,
    request_id: requestId,
    import: {
      ...toImportSummary(row),
      health_report: assertHealthReport(row.health_report),
      files: files.map((file) => ({
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
        created_at: file.created_at
      }))
    }
  };
};

export const getPricingReferenceHealth = async (
  db: DbClient,
  _callerId: string,
  requestId: string,
  input: { import_id?: string }
): Promise<PricingReferenceHealthGetResponse> => {
  const rows = input.import_id
    ? await db
      .select()
      .from(pricing_reference_imports)
      .where(eq(pricing_reference_imports.id, input.import_id))
      .limit(1)
    : await db
      .select()
      .from(pricing_reference_imports)
      .where(eq(pricing_reference_imports.status, 'analyse_ok'))
      .orderBy(desc(pricing_reference_imports.analysis_completed_at))
      .limit(1);

  return {
    ok: true,
    request_id: requestId,
    health_report: rows[0] ? assertHealthReport(rows[0].health_report) : null
  };
};

const resolveSnapshotId = async (
  db: DbClient,
  input: Pick<PricingReferenceRowsListInput, 'import_id' | 'snapshot_id'>
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
  input: PricingReferenceClassificationListInput
): Promise<PricingReferenceClassificationListResponse> => {
  const snapshotId = await resolveSnapshotId(db, input);
  if (!snapshotId) {
    return { ok: true, request_id: requestId, rows: [], page: input.page, page_size: input.page_size, total: 0 };
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
    total: totalRows[0]?.total ?? 0
  };
};

export const listPricingReferenceSegments = async (
  db: DbClient,
  _callerId: string,
  requestId: string,
  input: PricingReferenceSegmentsListInput
): Promise<PricingReferenceSegmentsListResponse> => {
  const snapshotId = await resolveSnapshotId(db, input);
  if (!snapshotId) {
    return { ok: true, request_id: requestId, rows: [], page: input.page, page_size: input.page_size, total: 0 };
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
  const marqueFilter = optionalExactFilter(sql`s.marque`, input.filters?.marque);
  const catFabFilter = optionalExactFilter(sql`s.cat_fab`, input.filters?.cat_fab);
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
      count(g.id)::int as purchase_grid_rows_count
    from public.pricing_supplier_segments s
    left join public.pricing_segment_classification_links l on l.segment_id = s.id
    left join public.pricing_segment_purchase_grids g on g.segment_id = s.id
    where ${whereClause}
    group by s.id, l.cir_key, l.link_status
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
    total: totalRows[0]?.total ?? 0
  };
};

export const listPricingReferenceAnomalies = async (
  db: DbClient,
  _callerId: string,
  requestId: string,
  input: PricingReferenceAnomaliesListInput
): Promise<PricingReferenceAnomaliesListResponse> => {
  const snapshotId = await resolveSnapshotId(db, input);
  if (!snapshotId && !input.import_id) {
    return { ok: true, request_id: requestId, rows: [], page: input.page, page_size: input.page_size, total: 0 };
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
    `)
  ]);

  return {
    ok: true,
    request_id: requestId,
    rows,
    page: input.page,
    page_size: input.page_size,
    total: totalRows[0]?.total ?? 0
  };
};

export const getPricingReferenceAnomaliesSummary = async (
  db: DbClient,
  _callerId: string,
  requestId: string,
  input: PricingReferenceAnomaliesSummaryGetInput
): Promise<PricingReferenceAnomaliesSummaryResponse> => {
  const snapshotId = await resolveSnapshotId(db, input);
  if (!snapshotId && !input.import_id) {
    return {
      ok: true,
      request_id: requestId,
      total: 0,
      groups_by_type: [],
      facets: { severities: [], types: [], marques: [] }
    };
  }
  const whereClause = andSql(buildAnomalyFilterConditions(input, snapshotId));
  const severitySql = anomalySeverityWeightSql();
  const [totalRows, groups, severityFacets, typeFacets, marqueFacets] = await Promise.all([
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
      where ${andSql(buildAnomalyFilterConditions(input, snapshotId, 'severities'))}
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
      where ${andSql(buildAnomalyFilterConditions(input, snapshotId, 'types'))}
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
      where ${andSql(buildAnomalyFilterConditions(input, snapshotId, 'marques'))}
      group by 1
      order by count(*) desc, 1 asc
      limit 200
    `)
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
      max_severity: severityFromWeight(group.max_severity_weight)
    })),
    facets: {
      severities: severityFacets.map((facet) => ({
        value: facet.value,
        label: pricingReferenceAnomalySeverityLabels[facet.value],
        count: facet.count,
        max_severity: severityFromWeight(facet.max_severity_weight)
      })),
      types: typeFacets.map((facet) => ({
        value: facet.value,
        label: pricingReferenceAnomalyTypeLabels[facet.value],
        count: facet.count,
        max_severity: severityFromWeight(facet.max_severity_weight)
      })),
      marques: marqueFacets.map((facet) => ({
        value: facet.value,
        label: facet.value,
        count: facet.count,
        max_severity: severityFromWeight(facet.max_severity_weight)
      }))
    }
  };
};

const listAllPricingReferenceAnomaliesForExport = async (
  db: DbClient,
  input: PricingReferenceAnomaliesExportInput,
  snapshotId: string | null
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

const exportSourceColumnsForKind = (fileKind: PricingReferenceFileKind): readonly string[] =>
  fileKind === 'classification'
    ? PRICING_REFERENCE_CLASSIFICATION_COLUMNS
    : PRICING_REFERENCE_SEGMENTS_GRIDS_COLUMNS;

const exportSheetNameForKind = (fileKind: PricingReferenceFileKind | 'unknown'): string => {
  if (fileKind === 'classification') return 'Classification';
  if (fileKind === 'segments_grids') return 'Segments grilles';
  return 'Anomalies sans fichier';
};

const exportFilename = (scopeId: string, requestId: string): string =>
  `anomalies-referentiel-${scopeId}-${requestId}.xlsx`;

const anomalyFallbackNote = (row: PricingReferenceAnomalyQueryRow): string => {
  const details = row.details;
  const context = [
    readStringValue(details, 'marque') ? `marque=${readStringValue(details, 'marque')}` : null,
    readStringValue(details, 'cat_fab') ? `cat_fab=${readStringValue(details, 'cat_fab')}` : null,
    readStringValue(details, 'cir_key') ? `cir_key=${readStringValue(details, 'cir_key')}` : null,
    readStringValue(details, 'classification_key') ? `classification_key=${readStringValue(details, 'classification_key')}` : null,
    readStringValue(details, 'segment_key') ? `segment_key=${readStringValue(details, 'segment_key')}` : null,
    row.object_id ? `object_id=${row.object_id}` : null
  ].filter((value): value is string => Boolean(value));
  return context.length > 0
    ? `Valeurs source brutes absentes dans details.raw_values. Contexte disponible: ${context.join(' ; ')}.`
    : 'Valeurs source brutes absentes dans details.raw_values. Aucun contexte source supplementaire disponible.';
};

const rowToExportRecord = (
  row: PricingReferenceAnomalyQueryRow,
  sourceColumns: readonly string[]
): Record<string, string | number> => {
  const rawValues = readRecord(row.details.raw_values);
  const record: Record<string, string | number> = {};
  for (const column of sourceColumns) {
    const value = rawValues?.[column];
    record[column] = typeof value === 'string' || typeof value === 'number' ? value : '';
  }
  const columns = toColumnList(row.columns);
  record.LIGNE_SOURCE = row.source_row_number ?? '';
  record.ANOMALIE_TYPE = pricingReferenceAnomalyTypeLabels[row.type];
  record.SEVERITE = pricingReferenceAnomalySeverityLabels[row.severity];
  record.COLONNES_CONCERNEES = columns.join(', ');
  record.MESSAGE = row.message;
  record.ACTION_CORRECTION = pricingReferenceAnomalyTypeActionLabels[row.type];
  record.NOTE_EXPORT = rawValues
    ? 'Valeurs source reconstruites depuis details.raw_values.'
    : anomalyFallbackNote(row);
  return record;
};

const buildAnomaliesExportWorkbook = (rows: PricingReferenceAnomalyQueryRow[]): ArrayBuffer => {
  const workbook = XLSX.utils.book_new();
  const rowsByKind = new Map<PricingReferenceFileKind | 'unknown', PricingReferenceAnomalyQueryRow[]>();
  for (const row of rows) {
    const fileKind = row.source_file?.file_kind ?? 'unknown';
    rowsByKind.set(fileKind, [...(rowsByKind.get(fileKind) ?? []), row]);
  }

  for (const [fileKind, sheetRows] of rowsByKind) {
    const sourceColumns = fileKind === 'unknown'
      ? PRICING_REFERENCE_SEGMENTS_GRIDS_COLUMNS
      : exportSourceColumnsForKind(fileKind);
    const headers = [
      ...sourceColumns,
      'LIGNE_SOURCE',
      'ANOMALIE_TYPE',
      'SEVERITE',
      'COLONNES_CONCERNEES',
      'MESSAGE',
      'ACTION_CORRECTION',
      'NOTE_EXPORT'
    ];
    const worksheet = XLSX.utils.json_to_sheet(
      sheetRows.map((row) => rowToExportRecord(row, sourceColumns)),
      { header: headers }
    );
    const range = XLSX.utils.decode_range(worksheet['!ref'] ?? 'A1:A1');
    worksheet['!autofilter'] = { ref: XLSX.utils.encode_range(range) };
    worksheet['!cols'] = headers.map((header) => ({ wch: Math.min(Math.max(header.length + 2, 14), 48) }));
    XLSX.utils.book_append_sheet(workbook, worksheet, exportSheetNameForKind(fileKind));
  }

  if (rowsByKind.size === 0) {
    const worksheet = XLSX.utils.json_to_sheet([{ MESSAGE: 'Aucune anomalie exportee.' }], { header: ['MESSAGE'] });
    worksheet['!autofilter'] = { ref: 'A1:A2' };
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Anomalies');
  }

  return XLSX.write(workbook, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer;
};

const cleanupExpiredAnomalyExports = async (): Promise<void> => {
  const storage = getSupabaseAdmin().storage.from(PRICING_REFERENCE_STORAGE_BUCKET);
  const cutoff = Date.now() - EXPORT_RETENTION_DAYS * 24 * 60 * 60 * 1000;
  const { data, error } = await storage.list('exports', {
    limit: 100,
    sortBy: { column: 'created_at', order: 'asc' }
  });
  if (error || !data) return;
  const expiredPaths = data
    .filter((item) => {
      const timestamp = item.created_at ?? item.updated_at ?? item.last_accessed_at;
      return timestamp ? new Date(timestamp).getTime() < cutoff : false;
    })
    .map((item) => `exports/${item.name}`)
    .filter((path) => path.startsWith('exports/'))
    .slice(0, 100);
  if (expiredPaths.length > 0) {
    await storage.remove(expiredPaths);
  }
};

export const exportPricingReferenceAnomalies = async (
  db: DbClient,
  _callerId: string,
  requestId: string,
  input: PricingReferenceAnomaliesExportInput
): Promise<PricingReferenceAnomaliesExportResponse> => {
  const snapshotId = await resolveSnapshotId(db, input);
  const rows = await listAllPricingReferenceAnomaliesForExport(db, input, snapshotId);
  if (rows.length > ANOMALIES_EXPORT_MAX_ROWS) {
    throw httpError(
      413,
      'REQUEST_FAILED',
      'Export refuse: plus de 50 000 anomalies correspondent aux filtres.'
    );
  }

  const scopeId = snapshotId ?? input.import_id ?? 'current';
  const filename = exportFilename(scopeId, requestId);
  const storagePath = `exports/${scopeId}/${requestId}.xlsx`;
  const workbookBytes = buildAnomaliesExportWorkbook(rows);
  const storage = getSupabaseAdmin().storage.from(PRICING_REFERENCE_STORAGE_BUCKET);

  await cleanupExpiredAnomalyExports();

  const { error: uploadError } = await storage.upload(
    storagePath,
    new Blob([workbookBytes], { type: PRICING_REFERENCE_XLSX_MIME }),
    {
      contentType: PRICING_REFERENCE_XLSX_MIME,
      cacheControl: '3600',
      upsert: false
    }
  );
  if (uploadError) {
    throw httpError(
      500,
      'PRICING_REFERENCE_IMPORT_STORAGE_FAILED',
      'Impossible de stocker l export des anomalies.',
      uploadError.message
    );
  }

  const { data: signedUrl, error: signedUrlError } = await storage.createSignedUrl(
    storagePath,
    EXPORT_SIGNED_URL_EXPIRES_IN_SECONDS,
    { download: filename }
  );
  if (signedUrlError || !signedUrl?.signedUrl) {
    throw httpError(
      500,
      'PRICING_REFERENCE_IMPORT_STORAGE_FAILED',
      'Impossible de generer l URL signee de l export.',
      signedUrlError?.message
    );
  }

  return assertAnomaliesExportResponse({
    ok: true,
    request_id: requestId,
    download_url: signedUrl.signedUrl,
    expires_at: new Date(Date.now() + EXPORT_SIGNED_URL_EXPIRES_IN_SECONDS * 1000).toISOString(),
    filename,
    row_count: rows.length
  });
};

const CLASSIFICATION_LIST_ALL_MAX_ROWS = 5000;

export const listAllPricingReferenceClassification = async (
  db: DbClient,
  _callerId: string,
  requestId: string,
  input: PricingReferenceClassificationListAllInput
): Promise<PricingReferenceClassificationListAllResponse> => {
  const snapshotId = await resolveSnapshotId(db, input);
  if (!snapshotId) {
    return { ok: true, request_id: requestId, rows: [], total: 0, truncated: false };
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
    `)
  ]);
  const total = totalRows[0]?.total ?? rows.length;

  return {
    ok: true,
    request_id: requestId,
    rows,
    total,
    truncated: total > rows.length
  };
};
