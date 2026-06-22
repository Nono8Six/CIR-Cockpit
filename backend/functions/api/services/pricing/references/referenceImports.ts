import { and, desc, eq, sql, type SQL } from 'drizzle-orm';

import {
  pricing_classification_cir,
  pricing_reference_anomalies,
  pricing_reference_import_files,
  pricing_reference_imports,
  pricing_reference_snapshots,
  pricing_segment_classification_links,
  pricing_segment_purchase_grids,
  pricing_supplier_segments
} from '../../../../../drizzle/schema.ts';
import {
  PRICING_REFERENCE_STORAGE_BUCKET,
  PRICING_REFERENCE_XLSX_MIME,
  pricingReferenceHealthReportSchema,
  type PricingReferenceImportAnalyzeResponse,
  type PricingReferenceImportStatus,
  type PricingReferenceAnomaliesListInput,
  type PricingReferenceAnomaliesListResponse,
  type PricingReferenceClassificationListResponse,
  type PricingReferenceHealthGetResponse,
  type PricingReferenceImportAnalyzeInput,
  type PricingReferenceImportGetInput,
  type PricingReferenceImportGetResponse,
  type PricingReferenceImportsListInput,
  type PricingReferenceImportsListResponse,
  type PricingReferenceImportsPrepareInput,
  type PricingReferenceImportsPrepareResponse,
  type PricingReferenceRowsListInput,
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
type PersistedAnalysisState = {
  snapshotId: string;
  importStatus: PricingReferenceImportStatus;
};

const SIGNED_UPLOAD_EXPIRES_IN_SECONDS = 60 * 60 * 2;
const INSERT_CHUNK_SIZE = 500;

const toOffset = (page: number, pageSize: number): number => (page - 1) * pageSize;

const normalizeFilename = (filename: string): string =>
  filename
    .trim()
    .replace(/[^a-zA-Z0-9._-]+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '');

const assertHealthReport = (value: unknown) => {
  if (value === null || value === undefined) return null;
  const parsed = pricingReferenceHealthReportSchema.safeParse(value);
  if (!parsed.success) {
    throw httpError(500, 'DB_READ_FAILED', 'Rapport de sante referentiel invalide.');
  }
  return parsed.data;
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

const getImportFiles = async (db: DbClient, importId: string): Promise<ImportFileRow[]> =>
  await db
    .select()
    .from(pricing_reference_import_files)
    .where(eq(pricing_reference_import_files.import_id, importId));

const requireImportFiles = async (
  db: DbClient,
  importId: string
): Promise<{ classification: ImportFileRow; segments_grids: ImportFileRow }> => {
  const files = await getImportFiles(db, importId);
  const classification = files.find((file) => file.file_kind === 'classification');
  const segments = files.find((file) => file.file_kind === 'segments_grids');

  if (!classification || !segments) {
    throw httpError(
      400,
      'PRICING_REFERENCE_IMPORT_INVALID_FILE',
      'Les deux fichiers referentiels sont requis avant analyse.'
    );
  }

  return { classification, segments_grids: segments };
};

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
  const fileInputs = {
    classification: input.files.classification,
    segments_grids: input.files.segments_grids
  };

  ensurePricingReferenceFileAccepted('classification', fileInputs.classification.original_filename, fileInputs.classification.size_bytes);
  ensurePricingReferenceFileAccepted('segments_grids', fileInputs.segments_grids.original_filename, fileInputs.segments_grids.size_bytes);

  const classificationPath = `imports/${nowPrefix}/${importId}/classification-${normalizeFilename(fileInputs.classification.original_filename)}`;
  const segmentsPath = `imports/${nowPrefix}/${importId}/segments-grids-${normalizeFilename(fileInputs.segments_grids.original_filename)}`;
  const [classificationUpload, segmentsUpload] = await Promise.all([
    createSignedUpload(classificationPath),
    createSignedUpload(segmentsPath)
  ]);

  const classificationFileId = crypto.randomUUID();
  const segmentsFileId = crypto.randomUUID();

  await db.transaction(async (tx) => {
    await tx.insert(pricing_reference_imports).values({
      id: importId,
      status: 'brouillon',
      created_by: callerId,
      counters: {}
    });

    await tx.insert(pricing_reference_import_files).values([
      {
        id: classificationFileId,
        import_id: importId,
        file_kind: 'classification',
        original_filename: fileInputs.classification.original_filename.trim(),
        storage_bucket: PRICING_REFERENCE_STORAGE_BUCKET,
        storage_path: classificationPath,
        size_bytes: fileInputs.classification.size_bytes,
        sha256: fileInputs.classification.sha256.toLowerCase(),
        content_type: fileInputs.classification.content_type ?? PRICING_REFERENCE_XLSX_MIME,
        uploaded_by: callerId
      },
      {
        id: segmentsFileId,
        import_id: importId,
        file_kind: 'segments_grids',
        original_filename: fileInputs.segments_grids.original_filename.trim(),
        storage_bucket: PRICING_REFERENCE_STORAGE_BUCKET,
        storage_path: segmentsPath,
        size_bytes: fileInputs.segments_grids.size_bytes,
        sha256: fileInputs.segments_grids.sha256.toLowerCase(),
        content_type: fileInputs.segments_grids.content_type ?? PRICING_REFERENCE_XLSX_MIME,
        uploaded_by: callerId
      }
    ]);
  });

  return {
    ok: true,
    request_id: requestId,
    import_id: importId,
    status: 'brouillon',
    files: {
      classification: {
        id: classificationFileId,
        file_kind: 'classification',
        original_filename: fileInputs.classification.original_filename.trim(),
        storage_bucket: PRICING_REFERENCE_STORAGE_BUCKET,
        storage_path: classificationPath,
        size_bytes: fileInputs.classification.size_bytes,
        sha256: fileInputs.classification.sha256.toLowerCase(),
        content_type: fileInputs.classification.content_type ?? PRICING_REFERENCE_XLSX_MIME,
        ...classificationUpload,
        signed_upload_expires_in_seconds: SIGNED_UPLOAD_EXPIRES_IN_SECONDS
      },
      segments_grids: {
        id: segmentsFileId,
        file_kind: 'segments_grids',
        original_filename: fileInputs.segments_grids.original_filename.trim(),
        storage_bucket: PRICING_REFERENCE_STORAGE_BUCKET,
        storage_path: segmentsPath,
        size_bytes: fileInputs.segments_grids.size_bytes,
        sha256: fileInputs.segments_grids.sha256.toLowerCase(),
        content_type: fileInputs.segments_grids.content_type ?? PRICING_REFERENCE_XLSX_MIME,
        ...segmentsUpload,
        signed_upload_expires_in_seconds: SIGNED_UPLOAD_EXPIRES_IN_SECONDS
      }
    }
  };
};

const insertClassificationRows = async (
  tx: DbClient,
  snapshotId: string,
  importId: string,
  fileId: string,
  rows: ParsedClassificationRow[]
): Promise<Map<string, string>> => {
  const ids = new Map<string, string>();
  for (let index = 0; index < rows.length; index += INSERT_CHUNK_SIZE) {
    const chunk = rows.slice(index, index + INSERT_CHUNK_SIZE);
    const inserted = await tx.insert(pricing_classification_cir).values(chunk.map((row) => ({
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
    }))).returning({
      id: pricing_classification_cir.id,
      cir_key: pricing_classification_cir.cir_key
    });
    inserted.forEach((row) => ids.set(row.cir_key, row.id));
  }
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
  for (let index = 0; index < rows.length; index += INSERT_CHUNK_SIZE) {
    const chunk = rows.slice(index, index + INSERT_CHUNK_SIZE);
    const inserted = await tx.insert(pricing_supplier_segments).values(chunk.map((row) => ({
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
    }))).returning({
      id: pricing_supplier_segments.id,
      segment_key: pricing_supplier_segments.segment_key
    });
    inserted.forEach((row) => ids.set(row.segment_key, row.id));
  }
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
  const values = rows
    .map((row) => {
      const segmentId = segmentIds.get(row.segment_key);
      if (!segmentId) return null;
      return {
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
      };
    })
    .filter((row): row is NonNullable<typeof row> => row !== null);

  for (let index = 0; index < values.length; index += INSERT_CHUNK_SIZE) {
    await tx.insert(pricing_segment_classification_links).values(values.slice(index, index + INSERT_CHUNK_SIZE));
  }
};

const insertPurchaseGridRows = async (
  tx: DbClient,
  snapshotId: string,
  importId: string,
  fileId: string,
  rows: ParsedSegmentPurchaseGridRow[],
  segmentIds: Map<string, string>
): Promise<void> => {
  const values = rows
    .map((row) => {
      const segmentId = segmentIds.get(row.segment_key);
      if (!segmentId) return null;
      return {
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
      };
    })
    .filter((row): row is NonNullable<typeof row> => row !== null);

  for (let index = 0; index < values.length; index += INSERT_CHUNK_SIZE) {
    await tx.insert(pricing_segment_purchase_grids).values(values.slice(index, index + INSERT_CHUNK_SIZE));
  }
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
    status: 'nouvelle' as const,
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

  await db.transaction(async (tx) => {
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

    const classificationIds = await insertClassificationRows(
      tx,
      snapshotId,
      importId,
      files.classification.id,
      analysis.classification_rows
    );
    const segmentIds = await insertSegmentRows(
      tx,
      snapshotId,
      importId,
      files.segments_grids.id,
      analysis.segment_rows
    );
    await insertLinkRows(tx, snapshotId, importId, files.segments_grids.id, analysis.link_rows, segmentIds, classificationIds);
    await insertPurchaseGridRows(tx, snapshotId, importId, files.segments_grids.id, analysis.purchase_grid_rows, segmentIds);
    await insertAnomalyRows(
      tx,
      snapshotId,
      importId,
      { classification: files.classification.id, segments_grids: files.segments_grids.id },
      analysis.anomalies
    );

    await tx.update(pricing_reference_imports)
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
  });

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
    const files = await requireImportFiles(db, input.import_id);
    const [classificationBytes, segmentsBytes] = await Promise.all([
      downloadStorageBytes(files.classification),
      downloadStorageBytes(files.segments_grids)
    ]);

    const [classificationHash, segmentsHash] = await Promise.all([
      assertDownloadedFileMatchesMetadata(files.classification, classificationBytes),
      assertDownloadedFileMatchesMetadata(files.segments_grids, segmentsBytes)
    ]);

    const analysis = await analyzePricingReferenceWorkbooks(
      {
        file_kind: 'classification',
        original_filename: files.classification.original_filename,
        bytes: classificationBytes,
        sha256: classificationHash,
        storage_path: files.classification.storage_path
      },
      {
        file_kind: 'segments_grids',
        original_filename: files.segments_grids.original_filename,
        bytes: segmentsBytes,
        sha256: segmentsHash,
        storage_path: files.segments_grids.storage_path
      }
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
  input: PricingReferenceRowsListInput
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

  const [snapshot] = await db
    .select()
    .from(pricing_reference_snapshots)
    .orderBy(desc(pricing_reference_snapshots.created_at))
    .limit(1);
  return snapshot?.id ?? null;
};

const searchPattern = (search: string | undefined): string | null => {
  const value = search?.trim().toLowerCase();
  return value ? `%${value}%` : null;
};

export const listPricingReferenceClassification = async (
  db: DbClient,
  _callerId: string,
  requestId: string,
  input: PricingReferenceRowsListInput
): Promise<PricingReferenceClassificationListResponse> => {
  const snapshotId = await resolveSnapshotId(db, input);
  if (!snapshotId) {
    return { ok: true, request_id: requestId, rows: [], page: input.page, page_size: input.page_size, total: 0 };
  }

  const pattern = searchPattern(input.search);
  const searchCondition = pattern
    ? sql<boolean>`and (
        lower(cir_key) like ${pattern}
        or lower(mega_lib) like ${pattern}
        or lower(fam_lib) like ${pattern}
        or lower(sfa_lib) like ${pattern}
      )`
    : sql``;

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
    where snapshot_id = ${snapshotId}
    ${searchCondition}
    order by mega, fam, sfa
    limit ${input.page_size}
    offset ${toOffset(input.page, input.page_size)}
  `);
  const totalRows = await db.execute<{ total: number }>(sql`
    select count(*)::int as total
    from public.pricing_classification_cir
    where snapshot_id = ${snapshotId}
    ${searchCondition}
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
  input: PricingReferenceRowsListInput
): Promise<PricingReferenceSegmentsListResponse> => {
  const snapshotId = await resolveSnapshotId(db, input);
  if (!snapshotId) {
    return { ok: true, request_id: requestId, rows: [], page: input.page, page_size: input.page_size, total: 0 };
  }

  const pattern = searchPattern(input.search);
  const searchCondition = pattern
    ? sql<boolean>`and (
        lower(s.segment_key) like ${pattern}
        or lower(s.marque) like ${pattern}
        or lower(s.cat_fab) like ${pattern}
        or lower(coalesce(s.cat_fab_l, '')) like ${pattern}
      )`
    : sql``;

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
    link_status: string | null;
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
    where s.snapshot_id = ${snapshotId}
    ${searchCondition}
    group by s.id, l.cir_key, l.link_status
    order by s.marque, s.cat_fab, s.segment
    limit ${input.page_size}
    offset ${toOffset(input.page, input.page_size)}
  `);
  const totalRows = await db.execute<{ total: number }>(sql`
    select count(*)::int as total
    from public.pricing_supplier_segments s
    where s.snapshot_id = ${snapshotId}
    ${searchCondition}
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
  const conditions: SQL[] = [];
  if (input.import_id) conditions.push(eq(pricing_reference_anomalies.import_id, input.import_id));
  if (snapshotId) conditions.push(eq(pricing_reference_anomalies.snapshot_id, snapshotId));
  if (input.severity) conditions.push(eq(pricing_reference_anomalies.severity, input.severity));
  if (input.status) conditions.push(eq(pricing_reference_anomalies.status, input.status));
  if (input.type) conditions.push(eq(pricing_reference_anomalies.type, input.type));
  const pattern = searchPattern(input.search);
  if (pattern) {
    conditions.push(sql<boolean>`lower(${pricing_reference_anomalies.message}) like ${pattern}`);
  }
  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const [rows, totalRows] = await Promise.all([
    db
      .select({
        id: pricing_reference_anomalies.id,
        import_id: pricing_reference_anomalies.import_id,
        snapshot_id: pricing_reference_anomalies.snapshot_id,
        source_file_id: pricing_reference_anomalies.source_file_id,
        source_row_number: pricing_reference_anomalies.source_row_number,
        type: pricing_reference_anomalies.type,
        severity: pricing_reference_anomalies.severity,
        status: pricing_reference_anomalies.status,
        object_type: pricing_reference_anomalies.object_type,
        object_id: pricing_reference_anomalies.object_id,
        columns: pricing_reference_anomalies.columns,
        message: pricing_reference_anomalies.message,
        details: pricing_reference_anomalies.details,
        created_at: pricing_reference_anomalies.created_at
      })
      .from(pricing_reference_anomalies)
      .where(whereClause)
      .orderBy(desc(pricing_reference_anomalies.created_at))
      .limit(input.page_size)
      .offset(toOffset(input.page, input.page_size)),
    db
      .select({ total: sql<number>`count(*)::int` })
      .from(pricing_reference_anomalies)
      .where(whereClause)
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
