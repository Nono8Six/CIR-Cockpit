import * as XLSX from 'xlsx';

import {
  PRICING_REFERENCE_MAX_FILE_SIZE_BYTES,
  PRICING_REFERENCE_STORAGE_BUCKET,
  pricingReferenceFileKindSchema,
  pricingReferenceHealthReportSchema,
  type PricingReferenceAnomalySample,
  type PricingReferenceAnomalySeverity,
  type PricingReferenceAnomalyType,
  type PricingReferenceFileKind,
  type PricingReferenceHealthReport
} from '../../../../../../shared/schemas/pricing/references.schema.ts';
import { httpError } from '../../../middleware/errorHandler.ts';

type SheetJsWorkbook = {
  SheetNames: string[];
  Sheets: Record<string, unknown>;
};

type SheetJsModule = {
  read: (data: Uint8Array, options: Record<string, unknown>) => SheetJsWorkbook;
  utils: {
    sheet_to_json: (sheet: unknown, options: Record<string, unknown>) => unknown[][];
  };
};

type WorkbookTable = {
  sheetName: string;
  headers: string[];
  rows: ParsedWorkbookRow[];
};

type ParsedWorkbookRow = {
  source_row_number: number;
  values: Record<string, string>;
};

export type PricingReferenceFileInput = {
  file_kind: PricingReferenceFileKind;
  original_filename: string;
  bytes: Uint8Array;
  sha256?: string;
  storage_path?: string;
};

export type ParsedClassificationRow = {
  source_row_number: number;
  mega: string;
  fam: string;
  sfa: string;
  mega_lib: string;
  fam_lib: string;
  sfa_lib: string;
  cir_key: string;
  raw_values: Record<string, string>;
  normalized_values: Record<string, string>;
};

export type ParsedSupplierSegmentRow = {
  source_row_number: number;
  segment: string;
  idnumerique: string;
  marque: string;
  cat_fab: string;
  cat_fab_l: string | null;
  strategiq: string | null;
  codif_fair: string | null;
  tarif_fab: string | null;
  segment_key: string;
  raw_values: Record<string, string>;
  normalized_values: Record<string, string>;
};

export type ParsedSegmentClassificationLinkRow = {
  source_row_number: number;
  segment_key: string;
  classification_cir_key: string | null;
  mega_famille: string | null;
  famille: string | null;
  sous_famille: string | null;
  cir_key: string;
  link_status: 'complete_valid' | 'missing' | 'partial' | 'unknown_key' | 'ambiguous';
  raw_values: Record<string, string>;
  normalized_values: Record<string, string>;
};

export type ParsedSegmentPurchaseGridRow = {
  source_row_number: number;
  segment_key: string;
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
  raw_values: Record<string, string>;
  normalized_values: Record<string, string>;
};

export type ParsedReferenceAnomaly = PricingReferenceAnomalySample & {
  object_type?: string | null;
  object_id?: string | null;
};

export type PricingReferenceAnalysisResult = {
  health_report: PricingReferenceHealthReport;
  classification_rows: ParsedClassificationRow[];
  segment_rows: ParsedSupplierSegmentRow[];
  link_rows: ParsedSegmentClassificationLinkRow[];
  purchase_grid_rows: ParsedSegmentPurchaseGridRow[];
  anomalies: ParsedReferenceAnomaly[];
};

export const CLASSIFICATION_EXPECTED_COLUMNS = ['MEGA', 'FAM', 'SFA', 'MEGA_LIB', 'FAM_LIB', 'SFA_LIB'] as const;
export const SEGMENTS_EXPECTED_COLUMNS = [
  'SEGMENT',
  'IDNUMERIQUE',
  'MARQUE',
  'CAT_FAB',
  'CAT_FAB_L',
  'STRATEGIQ',
  'CODIF_FAIR',
  'TARIF_FAB',
  'NUM_FOUR',
  'REMISE_HA',
  'COL_HA',
  'PRIORITE',
  'TYPE_GRILL',
  'DATE_DEBUT',
  'DATE_FIN',
  'BORNE_ACHA',
  'COEF_RETRO',
  'MEGA_FAMILLE',
  'FAMILLE',
  'SOUS_FAMILLE',
  'MEGA_LIBELLE',
  'FAMILLE_LIBELLE',
  'SFAM_LIBELLE',
  'COEF_HA',
  'COEF_MAJVTE'
] as const;

export const SEGMENT_IDENTITY_COLUMNS = ['SEGMENT', 'IDNUMERIQUE', 'MARQUE', 'CAT_FAB'] as const;
export const SEGMENT_CLASSIFICATION_COLUMNS = ['MEGA_FAMILLE', 'FAMILLE', 'SOUS_FAMILLE'] as const;
export const PURCHASE_GRID_REQUIRED_COLUMNS = [
  'NUM_FOUR',
  'REMISE_HA',
  'COL_HA',
  'DATE_DEBUT',
  'DATE_FIN',
  'BORNE_ACHA',
  'COEF_RETRO',
  'COEF_HA',
  'COEF_MAJVTE'
] as const;

const SHEET_JS = XLSX as unknown as SheetJsModule;
const ANOMALY_SAMPLE_LIMIT = 50;

const normalizeCell = (value: unknown): string => {
  if (value === null || value === undefined) return '';
  if (value instanceof Date) return value.toISOString();
  return String(value).trim();
};

const nullableValue = (value: string): string | null => value === '' ? null : value;
const cirKey = (mega: string, fam: string, sfa: string): string => `${mega}_${fam}_${sfa}`;
const segmentKey = (segment: string, idnumerique: string, marque: string, catFab: string): string =>
  `${segment}|${idnumerique}|${marque}|${catFab}`;

const uniqueValues = <T>(values: T[]): T[] => Array.from(new Set(values));

export const computeSha256 = async (bytes: Uint8Array): Promise<string> => {
  const buffer = bytes.buffer instanceof ArrayBuffer
    ? bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength)
    : new Uint8Array(bytes).buffer;
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
  return Array.from(new Uint8Array(hashBuffer))
    .map((value) => value.toString(16).padStart(2, '0'))
    .join('');
};

export const ensurePricingReferenceFileAccepted = (
  fileKind: PricingReferenceFileKind,
  filename: string,
  sizeBytes: number
): void => {
  const kind = pricingReferenceFileKindSchema.safeParse(fileKind);
  if (!kind.success) {
    throw httpError(400, 'PRICING_REFERENCE_IMPORT_INVALID_FILE', 'Type de fichier referentiel invalide.');
  }

  if (!filename.trim().toLowerCase().endsWith('.xlsx')) {
    throw httpError(400, 'PRICING_REFERENCE_IMPORT_INVALID_FILE', 'Le fichier doit etre au format .xlsx.');
  }

  if (!Number.isInteger(sizeBytes) || sizeBytes <= 0) {
    throw httpError(400, 'PRICING_REFERENCE_IMPORT_INVALID_FILE', 'Taille fichier invalide.');
  }

  if (sizeBytes > PRICING_REFERENCE_MAX_FILE_SIZE_BYTES) {
    throw httpError(413, 'PRICING_REFERENCE_IMPORT_TOO_LARGE', 'Le fichier depasse la limite de 50 MB.');
  }
};

const buildAnomaly = (
  type: PricingReferenceAnomalyType,
  severity: PricingReferenceAnomalySeverity,
  fileKind: PricingReferenceFileKind | null,
  sourceRowNumber: number | null,
  columns: string[],
  message: string,
  details: Record<string, unknown> = {}
): ParsedReferenceAnomaly => ({
  type,
  severity,
  file_kind: fileKind,
  source_row_number: sourceRowNumber,
  columns,
  message,
  details
});

const readWorkbookTable = (input: PricingReferenceFileInput): WorkbookTable => {
  ensurePricingReferenceFileAccepted(input.file_kind, input.original_filename, input.bytes.byteLength);

  let workbook: SheetJsWorkbook;
  try {
    workbook = SHEET_JS.read(input.bytes, {
      type: 'array',
      dense: true,
      cellDates: false,
      raw: false
    });
  } catch {
    throw httpError(
      400,
      'PRICING_REFERENCE_IMPORT_PARSE_FAILED',
      `Impossible de lire le fichier ${input.original_filename}.`
    );
  }

  const sheetName = workbook.SheetNames[0];
  if (!sheetName) {
    throw httpError(400, 'PRICING_REFERENCE_IMPORT_EMPTY', `Le fichier ${input.original_filename} ne contient aucun onglet.`);
  }

  const rawRows = SHEET_JS.utils.sheet_to_json(workbook.Sheets[sheetName], {
    header: 1,
    blankrows: true,
    defval: null,
    raw: false
  });

  const headerRow = rawRows[0] ?? [];
  const headers = headerRow.map(normalizeCell).filter((value) => value !== '');

  if (headers.length === 0) {
    throw httpError(400, 'PRICING_REFERENCE_IMPORT_EMPTY', `Le fichier ${input.original_filename} ne contient aucun en-tete.`);
  }

  const rows = rawRows
    .slice(1)
    .map((row, rowIndex) => {
      const values: Record<string, string> = {};
      headers.forEach((header, index) => {
        values[header] = normalizeCell(row[index]);
      });
      return {
        source_row_number: rowIndex + 2,
        values
      };
    })
    .filter((row) => Object.values(row.values).some((value) => value !== ''));

  if (rows.length === 0) {
    throw httpError(400, 'PRICING_REFERENCE_IMPORT_EMPTY', `Le fichier ${input.original_filename} ne contient aucune ligne.`);
  }

  return { sheetName, headers, rows };
};

const missingColumns = (headers: string[], expected: readonly string[]): string[] =>
  expected.filter((column) => !headers.includes(column));

const hasEmpty = (row: ParsedWorkbookRow, columns: readonly string[]): boolean =>
  columns.some((column) => (row.values[column] ?? '') === '');

const toRawValues = (row: ParsedWorkbookRow, columns: readonly string[]): Record<string, string> => {
  const values: Record<string, string> = {};
  columns.forEach((column) => {
    values[column] = row.values[column] ?? '';
  });
  return values;
};

const parseClassification = (
  input: PricingReferenceFileInput
): {
  table: WorkbookTable;
  rows: ParsedClassificationRow[];
  anomalies: ParsedReferenceAnomaly[];
  duplicateCirKeys: number;
  mandatoryEmptyRows: number;
} => {
  const table = readWorkbookTable(input);
  const anomalies: ParsedReferenceAnomaly[] = [];
  const missing = missingColumns(table.headers, CLASSIFICATION_EXPECTED_COLUMNS);

  missing.forEach((column) => {
    anomalies.push(buildAnomaly(
      'missing_column',
      'bloquante',
      'classification',
      null,
      [column],
      `Colonne obligatoire absente dans le fichier classification: ${column}.`
    ));
  });

  const seenKeys = new Set<string>();
  let duplicateCirKeys = 0;
  let mandatoryEmptyRows = 0;
  const parsedRows: ParsedClassificationRow[] = [];

  for (const row of table.rows) {
    const mega = row.values.MEGA ?? '';
    const fam = row.values.FAM ?? '';
    const sfa = row.values.SFA ?? '';
    const key = cirKey(mega, fam, sfa);

    if (hasEmpty(row, CLASSIFICATION_EXPECTED_COLUMNS)) {
      mandatoryEmptyRows += 1;
      anomalies.push(buildAnomaly(
        'classification_required_empty',
        'bloquante',
        'classification',
        row.source_row_number,
        CLASSIFICATION_EXPECTED_COLUMNS.filter((column) => (row.values[column] ?? '') === ''),
        'Champ obligatoire vide dans la classification CIR.',
        { cir_key: key }
      ));
    }

    if (seenKeys.has(key)) {
      duplicateCirKeys += 1;
      anomalies.push(buildAnomaly(
        'classification_duplicate_key',
        'bloquante',
        'classification',
        row.source_row_number,
        ['MEGA', 'FAM', 'SFA'],
        `Cle CIR dupliquee: ${key}.`,
        { cir_key: key }
      ));
    } else {
      seenKeys.add(key);
    }

    parsedRows.push({
      source_row_number: row.source_row_number,
      mega,
      fam,
      sfa,
      mega_lib: row.values.MEGA_LIB ?? '',
      fam_lib: row.values.FAM_LIB ?? '',
      sfa_lib: row.values.SFA_LIB ?? '',
      cir_key: key,
      raw_values: toRawValues(row, CLASSIFICATION_EXPECTED_COLUMNS),
      normalized_values: {
        MEGA: mega,
        FAM: fam,
        SFA: sfa,
        MEGA_LIB: row.values.MEGA_LIB ?? '',
        FAM_LIB: row.values.FAM_LIB ?? '',
        SFA_LIB: row.values.SFA_LIB ?? ''
      }
    });
  }

  return { table, rows: parsedRows, anomalies, duplicateCirKeys, mandatoryEmptyRows };
};

const classifyLinkStatus = (
  mega: string,
  fam: string,
  sfa: string,
  validClassificationKeys: Set<string>
): ParsedSegmentClassificationLinkRow['link_status'] => {
  const values = [mega, fam, sfa];
  if (values.every((value) => value === '')) return 'missing';
  if (values.some((value) => value === '')) return 'partial';
  return validClassificationKeys.has(cirKey(mega, fam, sfa)) ? 'complete_valid' : 'unknown_key';
};

const buildAmbiguousBrandCategoryAnomalies = (
  table: WorkbookTable
): ParsedReferenceAnomaly[] => {
  const grouped = new Map<string, { firstRow: number; keys: Set<string> }>();

  for (const row of table.rows) {
    const marque = row.values.MARQUE ?? '';
    const catFab = row.values.CAT_FAB ?? '';
    const mega = row.values.MEGA_FAMILLE ?? '';
    const fam = row.values.FAMILLE ?? '';
    const sfa = row.values.SOUS_FAMILLE ?? '';
    if (!marque || !catFab || !mega || !fam || !sfa) continue;

    const brandCategoryKey = `${marque}|${catFab}`;
    const entry = grouped.get(brandCategoryKey) ?? { firstRow: row.source_row_number, keys: new Set<string>() };
    entry.keys.add(cirKey(mega, fam, sfa));
    grouped.set(brandCategoryKey, entry);
  }

  const anomalies: ParsedReferenceAnomaly[] = [];
  for (const [brandCategoryKey, entry] of grouped.entries()) {
    if (entry.keys.size <= 1) continue;
    const [marque, catFab] = brandCategoryKey.split('|');
    anomalies.push(buildAnomaly(
      'segment_ambiguous_link',
      'haute',
      'segments_grids',
      entry.firstRow,
      ['MARQUE', 'CAT_FAB', 'MEGA_FAMILLE', 'FAMILLE', 'SOUS_FAMILLE'],
      `Liaison CIR ambigue pour ${marque} + ${catFab}.`,
      { marque, cat_fab: catFab, cir_keys: Array.from(entry.keys).sort() }
    ));
  }

  return anomalies;
};

const parseSegments = (
  input: PricingReferenceFileInput,
  validClassificationKeys: Set<string>
): {
  table: WorkbookTable;
  segmentRows: ParsedSupplierSegmentRow[];
  linkRows: ParsedSegmentClassificationLinkRow[];
  purchaseGridRows: ParsedSegmentPurchaseGridRow[];
  anomalies: ParsedReferenceAnomaly[];
  identityIncompleteRows: number;
  classificationIncompleteRows: number;
  cirKeysNotValidatedRows: number;
  purchaseGridMissingRows: number;
} => {
  const table = readWorkbookTable(input);
  const anomalies: ParsedReferenceAnomaly[] = [];
  const missing = missingColumns(table.headers, SEGMENTS_EXPECTED_COLUMNS);

  missing.forEach((column) => {
    anomalies.push(buildAnomaly(
      'missing_column',
      'bloquante',
      'segments_grids',
      null,
      [column],
      `Colonne obligatoire absente dans le fichier segments/grilles: ${column}.`
    ));
  });

  const segmentRowsByKey = new Map<string, ParsedSupplierSegmentRow>();
  const linkRowsByKey = new Map<string, ParsedSegmentClassificationLinkRow>();
  const purchaseGridRows: ParsedSegmentPurchaseGridRow[] = [];
  let identityIncompleteRows = 0;
  let classificationIncompleteRows = 0;
  let cirKeysNotValidatedRows = 0;
  let purchaseGridMissingRows = 0;

  for (const row of table.rows) {
    const segment = row.values.SEGMENT ?? '';
    const idnumerique = row.values.IDNUMERIQUE ?? '';
    const marque = row.values.MARQUE ?? '';
    const catFab = row.values.CAT_FAB ?? '';
    const key = segmentKey(segment, idnumerique, marque, catFab);

    if (hasEmpty(row, SEGMENT_IDENTITY_COLUMNS)) {
      identityIncompleteRows += 1;
      anomalies.push(buildAnomaly(
        'segment_identity_incomplete',
        'bloquante',
        'segments_grids',
        row.source_row_number,
        SEGMENT_IDENTITY_COLUMNS.filter((column) => (row.values[column] ?? '') === ''),
        'Identite segment fabricant incomplete.',
        { segment_key: key }
      ));
    }

    if (!segmentRowsByKey.has(key) && !hasEmpty(row, SEGMENT_IDENTITY_COLUMNS)) {
      segmentRowsByKey.set(key, {
        source_row_number: row.source_row_number,
        segment,
        idnumerique,
        marque,
        cat_fab: catFab,
        cat_fab_l: nullableValue(row.values.CAT_FAB_L ?? ''),
        strategiq: nullableValue(row.values.STRATEGIQ ?? ''),
        codif_fair: nullableValue(row.values.CODIF_FAIR ?? ''),
        tarif_fab: nullableValue(row.values.TARIF_FAB ?? ''),
        segment_key: key,
        raw_values: toRawValues(row, SEGMENTS_EXPECTED_COLUMNS),
        normalized_values: toRawValues(row, SEGMENTS_EXPECTED_COLUMNS)
      });
    }

    const mega = row.values.MEGA_FAMILLE ?? '';
    const fam = row.values.FAMILLE ?? '';
    const sfa = row.values.SOUS_FAMILLE ?? '';
    const classificationKey = cirKey(mega, fam, sfa);
    const linkStatus = classifyLinkStatus(mega, fam, sfa, validClassificationKeys);
    const classificationIncomplete = linkStatus === 'missing' || linkStatus === 'partial';

    if (classificationIncomplete) {
      classificationIncompleteRows += 1;
      anomalies.push(buildAnomaly(
        'segment_classification_incomplete',
        'moyenne',
        'segments_grids',
        row.source_row_number,
        SEGMENT_CLASSIFICATION_COLUMNS.filter((column) => (row.values[column] ?? '') === ''),
        'Classification CIR incomplete pour le segment fabricant.',
        { segment_key: key, cir_key: classificationKey }
      ));
    }

    if (classificationIncomplete || linkStatus === 'unknown_key') {
      cirKeysNotValidatedRows += 1;
      if (linkStatus === 'unknown_key') {
        anomalies.push(buildAnomaly(
          'segment_classification_unknown',
          'haute',
          'segments_grids',
          row.source_row_number,
          [...SEGMENT_CLASSIFICATION_COLUMNS],
          `Cle CIR non reconnue dans la classification: ${classificationKey}.`,
          { segment_key: key, cir_key: classificationKey }
        ));
      }
    }

    const linkKey = `${key}|${classificationKey}`;
    if (!linkRowsByKey.has(linkKey) && !hasEmpty(row, SEGMENT_IDENTITY_COLUMNS)) {
      linkRowsByKey.set(linkKey, {
        source_row_number: row.source_row_number,
        segment_key: key,
        classification_cir_key: linkStatus === 'complete_valid' ? classificationKey : null,
        mega_famille: nullableValue(mega),
        famille: nullableValue(fam),
        sous_famille: nullableValue(sfa),
        cir_key: classificationKey,
        link_status: linkStatus,
        raw_values: toRawValues(row, SEGMENT_CLASSIFICATION_COLUMNS),
        normalized_values: {
          MEGA_FAMILLE: mega,
          FAMILLE: fam,
          SOUS_FAMILLE: sfa
        }
      });
    }

    const missingGridColumns = PURCHASE_GRID_REQUIRED_COLUMNS.filter((column) => (row.values[column] ?? '') === '');
    if (missingGridColumns.length > 0) {
      purchaseGridMissingRows += 1;
      anomalies.push(buildAnomaly(
        'purchase_grid_missing',
        'moyenne',
        'segments_grids',
        row.source_row_number,
        missingGridColumns,
        'Champ grille achat structurel manquant.',
        { segment_key: key }
      ));
    }

    if (!hasEmpty(row, SEGMENT_IDENTITY_COLUMNS)) {
      purchaseGridRows.push({
        source_row_number: row.source_row_number,
        segment_key: key,
        num_four: nullableValue(row.values.NUM_FOUR ?? ''),
        remise_ha: nullableValue(row.values.REMISE_HA ?? ''),
        col_ha: nullableValue(row.values.COL_HA ?? ''),
        priorite: nullableValue(row.values.PRIORITE ?? ''),
        type_grill: nullableValue(row.values.TYPE_GRILL ?? ''),
        date_debut_raw: nullableValue(row.values.DATE_DEBUT ?? ''),
        date_fin_raw: nullableValue(row.values.DATE_FIN ?? ''),
        date_debut_normalized: null,
        date_fin_normalized: null,
        borne_acha: nullableValue(row.values.BORNE_ACHA ?? ''),
        coef_retro: nullableValue(row.values.COEF_RETRO ?? ''),
        coef_ha: nullableValue(row.values.COEF_HA ?? ''),
        coef_majvte: nullableValue(row.values.COEF_MAJVTE ?? ''),
        raw_values: toRawValues(row, SEGMENTS_EXPECTED_COLUMNS),
        normalized_values: toRawValues(row, SEGMENTS_EXPECTED_COLUMNS)
      });
    }
  }

  anomalies.push(...buildAmbiguousBrandCategoryAnomalies(table));

  return {
    table,
    segmentRows: Array.from(segmentRowsByKey.values()),
    linkRows: Array.from(linkRowsByKey.values()),
    purchaseGridRows,
    anomalies,
    identityIncompleteRows,
    classificationIncompleteRows,
    cirKeysNotValidatedRows,
    purchaseGridMissingRows
  };
};

const summarizeAnomalies = (anomalies: ParsedReferenceAnomaly[]) => ({
  total: anomalies.length,
  bloquante: anomalies.filter((anomaly) => anomaly.severity === 'bloquante').length,
  haute: anomalies.filter((anomaly) => anomaly.severity === 'haute').length,
  moyenne: anomalies.filter((anomaly) => anomaly.severity === 'moyenne').length,
  faible: anomalies.filter((anomaly) => anomaly.severity === 'faible').length
});

const buildFileHealth = (
  input: PricingReferenceFileInput,
  table: WorkbookTable,
  expected: readonly string[]
) => ({
  file_kind: input.file_kind,
  original_filename: input.original_filename,
  storage_path: input.storage_path ?? null,
  sha256: input.sha256 ?? '',
  size_bytes: input.bytes.byteLength,
  sheet_name: table.sheetName,
  rows_count: table.rows.length,
  columns_count: table.headers.length,
  columns: {
    expected: [...expected],
    detected: table.headers,
    missing: missingColumns(table.headers, expected)
  }
});

export const analyzePricingReferenceWorkbooks = async (
  classificationInput: PricingReferenceFileInput,
  segmentsInput: PricingReferenceFileInput
): Promise<PricingReferenceAnalysisResult> => {
  const classificationSha = classificationInput.sha256 ?? await computeSha256(classificationInput.bytes);
  const segmentsSha = segmentsInput.sha256 ?? await computeSha256(segmentsInput.bytes);
  const classificationWithHash = { ...classificationInput, sha256: classificationSha };
  const segmentsWithHash = { ...segmentsInput, sha256: segmentsSha };

  const classification = parseClassification(classificationWithHash);
  const validClassificationKeys = new Set(
    classification.rows
      .filter((row) => row.mega !== '' && row.fam !== '' && row.sfa !== '')
      .map((row) => row.cir_key)
  );
  const segments = parseSegments(segmentsWithHash, validClassificationKeys);
  const anomalies = [...classification.anomalies, ...segments.anomalies];
  const uniqueClassificationKeys = uniqueValues(classification.rows.map((row) => row.cir_key)).length;

  const healthReport = {
    generated_at: new Date().toISOString(),
    storage: {
      bucket: PRICING_REFERENCE_STORAGE_BUCKET,
      max_file_size_bytes: PRICING_REFERENCE_MAX_FILE_SIZE_BYTES,
      allowed_extensions: ['.xlsx' as const]
    },
    files: {
      classification: buildFileHealth(classificationWithHash, classification.table, CLASSIFICATION_EXPECTED_COLUMNS),
      segments_grids: buildFileHealth(segmentsWithHash, segments.table, SEGMENTS_EXPECTED_COLUMNS)
    },
    classification: {
      rows_count: classification.table.rows.length,
      columns_count: classification.table.headers.length,
      unique_cir_keys: uniqueClassificationKeys,
      duplicate_cir_keys: classification.duplicateCirKeys,
      mandatory_empty_rows: classification.mandatoryEmptyRows
    },
    segments_grids: {
      rows_count: segments.table.rows.length,
      columns_count: segments.table.headers.length,
      unique_segment_identities: segments.segmentRows.length,
      identity_incomplete_rows: segments.identityIncompleteRows,
      classification_incomplete_rows: segments.classificationIncompleteRows,
      cir_keys_not_validated_rows: segments.cirKeysNotValidatedRows,
      purchase_grid_missing_rows: segments.purchaseGridMissingRows
    },
    anomalies: summarizeAnomalies(anomalies),
    anomaly_samples: anomalies.slice(0, ANOMALY_SAMPLE_LIMIT)
  };

  const parsedHealthReport = pricingReferenceHealthReportSchema.safeParse(healthReport);
  if (!parsedHealthReport.success) {
    throw httpError(
      500,
      'PRICING_REFERENCE_IMPORT_PARSE_FAILED',
      'Le rapport de sante referentiel est invalide.',
      parsedHealthReport.error.issues.map((issue) => issue.message).join(' | ')
    );
  }

  return {
    health_report: parsedHealthReport.data,
    classification_rows: classification.rows,
    segment_rows: segments.segmentRows,
    link_rows: segments.linkRows,
    purchase_grid_rows: segments.purchaseGridRows,
    anomalies
  };
};
