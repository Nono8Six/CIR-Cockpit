import { strFromU8, unzipSync } from "fflate";

import {
  PRICING_REFERENCE_CLASSIFICATION_COLUMNS,
  PRICING_REFERENCE_MAX_FILE_SIZE_BYTES,
  PRICING_REFERENCE_SEGMENTS_GRIDS_COLUMNS,
  PRICING_REFERENCE_STORAGE_BUCKET,
  type PricingReferenceAnomalySample,
  type PricingReferenceAnomalySeverity,
  type PricingReferenceAnomalyType,
  type PricingReferenceColumnAliases,
  type PricingReferenceColumnMapping,
  type PricingReferenceColumnMappingCandidate,
  type PricingReferenceFileKind,
  pricingReferenceFileKindSchema,
  type PricingReferenceHealthReport,
  pricingReferenceHealthReportSchema,
} from "../../../../../../shared/schemas/pricing/references.schema.ts";
import { httpError } from "../../../middleware/errorHandler.ts";

type WorkbookTable = {
  sheetName: string;
  headers: string[];
  mappedColumns: string[];
  rowsCount: number;
};

type WorkbookReader = {
  sheetName: string;
  headers: string[];
  mappedColumns: string[];
  rows: Iterable<ParsedWorkbookRow>;
};

type WorksheetDescriptor = {
  sheetName: string;
  worksheetPath: string;
};

type ParsedWorkbookRow = {
  source_row_number: number;
  raw_values: Record<string, string>;
  values: Record<string, string>;
};

export type PricingReferenceFileInput = {
  file_kind: PricingReferenceFileKind;
  original_filename: string;
  bytes: Uint8Array;
  sha256?: string;
  storage_path?: string;
  sheet_name?: string | null;
  column_mapping?: PricingReferenceColumnMapping | null;
};

export type PricingReferenceWorkbookInspection = {
  sheet_name: string;
  worksheets: string[];
  expected_columns: string[];
  detected_columns: string[];
  row_count: number;
  sample_rows: Record<string, string>[];
  candidates: PricingReferenceColumnMappingCandidate[];
  proposed_mapping: PricingReferenceColumnMapping;
  mapping_status: "auto" | "a_confirmer" | "invalide";
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
  link_status:
    | "complete_valid"
    | "missing"
    | "partial"
    | "unknown_key"
    | "ambiguous";
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

export type PricingReferenceCanonicalSourceRow = {
  source_row_number: number;
  raw_values: Record<string, string>;
};

export const CLASSIFICATION_EXPECTED_COLUMNS =
  PRICING_REFERENCE_CLASSIFICATION_COLUMNS;
export const SEGMENTS_EXPECTED_COLUMNS =
  PRICING_REFERENCE_SEGMENTS_GRIDS_COLUMNS;

export const SEGMENT_IDENTITY_COLUMNS = [
  "SEGMENT",
  "IDNUMERIQUE",
  "MARQUE",
  "CAT_FAB",
] as const;
export const SEGMENT_CLASSIFICATION_COLUMNS = [
  "MEGA_FAMILLE",
  "FAMILLE",
  "SOUS_FAMILLE",
] as const;
export const SEGMENT_CLASSIFICATION_LABEL_COLUMNS = [
  "MEGA_LIBELLE",
  "FAMILLE_LIBELLE",
  "SFAM_LIBELLE",
] as const;
export const SEGMENT_STORAGE_COLUMNS = [
  ...SEGMENT_IDENTITY_COLUMNS,
  "CAT_FAB_L",
  "STRATEGIQ",
  "CODIF_FAIR",
  "TARIF_FAB",
] as const;
export const PURCHASE_GRID_REQUIRED_COLUMNS = [
  "NUM_FOUR",
  "REMISE_HA",
  "COL_HA",
  "DATE_DEBUT",
  "DATE_FIN",
  "BORNE_ACHA",
  "COEF_RETRO",
  "COEF_HA",
  "COEF_MAJVTE",
] as const;
const ANOMALY_SAMPLE_LIMIT = 50;

const stringifyCell = (value: unknown): string => {
  if (value === null || value === undefined) return "";
  if (value instanceof Date) return value.toISOString();
  return String(value);
};

const normalizeText = (value: unknown): string =>
  stringifyCell(value).trim().replace(/\s+/g, " ");
const normalizeCode = (value: unknown): string =>
  normalizeText(value).toUpperCase();

const CODE_COLUMNS = new Set([
  "MEGA",
  "FAM",
  "SFA",
  "SEGMENT",
  "IDNUMERIQUE",
  "MARQUE",
  "CAT_FAB",
  "STRATEGIQ",
  "CODIF_FAIR",
  "TARIF_FAB",
  "NUM_FOUR",
  "COL_HA",
  "PRIORITE",
  "TYPE_GRILL",
  "MEGA_FAMILLE",
  "FAMILLE",
  "SOUS_FAMILLE",
]);

const DATE_COLUMNS = ["DATE_DEBUT", "DATE_FIN"] as const;

const normalizeHeader = (value: unknown): string => normalizeCode(value);
const normalizeCell = (header: string, value: unknown): string =>
  CODE_COLUMNS.has(header) ? normalizeCode(value) : normalizeText(value);

const nullableValue = (value: string): string | null =>
  value === "" ? null : value;
const nullableRawValue = (value: string): string | null =>
  value === "" ? null : value;
const cirKey = (mega: string, fam: string, sfa: string): string =>
  `${mega}_${fam}_${sfa}`;
const segmentKey = (
  segment: string,
  idnumerique: string,
  marque: string,
  catFab: string,
): string => `${segment}|${idnumerique}|${marque}|${catFab}`;

const uniqueValues = <T>(values: T[]): T[] => Array.from(new Set(values));

export const getPricingReferenceExpectedColumns = (
  fileKind: PricingReferenceFileKind,
): readonly string[] =>
  fileKind === "classification"
    ? CLASSIFICATION_EXPECTED_COLUMNS
    : SEGMENTS_EXPECTED_COLUMNS;

const DEFAULT_COLUMN_ALIASES: Record<
  PricingReferenceFileKind,
  PricingReferenceColumnAliases
> = {
  classification: {
    MEGA_LIB: [
      "MEGA LIB",
      "MEGA_LIBELLE",
      "LIBELLE MEGA",
      "LIBELLE_MEGA",
      "MEGA FAMILLE LIBELLE",
    ],
    FAM_LIB: [
      "FAM LIB",
      "FAMILLE_LIBELLE",
      "LIBELLE FAMILLE",
      "LIBELLE_FAMILLE",
    ],
    SFA_LIB: [
      "SFA LIB",
      "SFAM_LIBELLE",
      "SOUS_FAMILLE_LIBELLE",
      "LIBELLE SOUS FAMILLE",
      "LIBELLE_SFA",
    ],
  },
  segments_grids: {
    IDNUMERIQUE: [
      "ID NUMERIQUE",
      "ID_NUMERIQUE",
      "ID NUM",
      "IDENTIFIANT NUMERIQUE",
    ],
    CAT_FAB: ["CATEGORIE FABRICANT", "CATEGORIE_FABRICANT", "CAT FAB"],
    CAT_FAB_L: ["LIBELLE CATEGORIE FABRICANT", "CAT FAB LIB", "CAT_FAB_LIB"],
    STRATEGIQ: ["STRATEGIQUE", "STRATEGIE"],
    CODIF_FAIR: ["CODIFICATION FAIR", "CODE FAIR"],
    TARIF_FAB: ["TARIF FABRICANT", "TARIF_FABRICANT"],
    NUM_FOUR: ["NUM FOURNISSEUR", "NUMERO FOURNISSEUR", "NUM_FOURNISSEUR"],
    REMISE_HA: ["REMISE ACHAT", "REMISE_ACHAT"],
    COL_HA: ["COLONNE ACHAT", "COL_ACHAT"],
    TYPE_GRILL: ["TYPE GRILLE", "TYPE_GRILLE"],
    BORNE_ACHA: ["BORNE ACHAT", "BORNE_ACHAT"],
    MEGA_FAMILLE: ["MEGA", "MEGA FAMILLE"],
    SOUS_FAMILLE: ["SFA", "SOUS FAMILLE"],
    MEGA_LIBELLE: ["MEGA LIB", "MEGA_FAMILLE_LIBELLE", "LIBELLE MEGA"],
    FAMILLE_LIBELLE: ["FAM_LIB", "FAMILLE LIBELLE", "LIBELLE FAMILLE"],
    SFAM_LIBELLE: [
      "SFA_LIB",
      "SOUS_FAMILLE_LIBELLE",
      "SFAM LIBELLE",
      "LIBELLE SOUS FAMILLE",
    ],
    COEF_HA: ["COEFFICIENT HA", "COEF ACHAT"],
    COEF_MAJVTE: ["COEF MAJ VTE", "COEFFICIENT MAJORATION VENTE"],
  },
};

export const computeSha256 = async (bytes: Uint8Array): Promise<string> => {
  const buffer = bytes.buffer instanceof ArrayBuffer
    ? bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength)
    : new Uint8Array(bytes).buffer;
  const hashBuffer = await crypto.subtle.digest("SHA-256", buffer);
  return Array.from(new Uint8Array(hashBuffer))
    .map((value) => value.toString(16).padStart(2, "0"))
    .join("");
};

export const ensurePricingReferenceFileAccepted = (
  fileKind: PricingReferenceFileKind,
  filename: string,
  sizeBytes: number,
): void => {
  const kind = pricingReferenceFileKindSchema.safeParse(fileKind);
  if (!kind.success) {
    throw httpError(
      400,
      "PRICING_REFERENCE_IMPORT_INVALID_FILE",
      "Type de fichier referentiel invalide.",
    );
  }

  if (!filename.trim().toLowerCase().endsWith(".xlsx")) {
    throw httpError(
      400,
      "PRICING_REFERENCE_IMPORT_INVALID_FILE",
      "Le fichier doit etre au format .xlsx.",
    );
  }

  if (!Number.isInteger(sizeBytes) || sizeBytes <= 0) {
    throw httpError(
      400,
      "PRICING_REFERENCE_IMPORT_INVALID_FILE",
      "Taille fichier invalide.",
    );
  }

  if (sizeBytes > PRICING_REFERENCE_MAX_FILE_SIZE_BYTES) {
    throw httpError(
      413,
      "PRICING_REFERENCE_IMPORT_TOO_LARGE",
      "Le fichier depasse la limite de 50 MB.",
    );
  }
};

const isValidCalendarDate = (
  year: number,
  month: number,
  day: number,
): boolean => {
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day;
};

const normalizeCirDate = (
  value: string,
): { normalized: string | null; valid: boolean } => {
  const compact = normalizeText(value).replace(/\s+/g, "");
  if (compact === "" || compact === "0") {
    return { normalized: null, valid: true };
  }

  const isoMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(compact);
  if (isoMatch) {
    const [, year, month, day] = isoMatch;
    const parsedYear = Number(year);
    const parsedMonth = Number(month);
    const parsedDay = Number(day);
    const valid = isValidCalendarDate(parsedYear, parsedMonth, parsedDay);
    return {
      normalized: valid ? compact : null,
      valid,
    };
  }

  const as400Match = /^1(\d{2})(\d{2})(\d{2})$/.exec(compact);
  if (as400Match) {
    const [, year, month, day] = as400Match;
    const parsedYear = 2000 + Number(year);
    const parsedMonth = Number(month);
    const parsedDay = Number(day);
    const valid = isValidCalendarDate(parsedYear, parsedMonth, parsedDay);
    return {
      normalized: valid
        ? `${parsedYear.toString().padStart(4, "0")}-${month}-${day}`
        : null,
      valid,
    };
  }

  return { normalized: null, valid: false };
};

const buildAnomaly = (
  type: PricingReferenceAnomalyType,
  severity: PricingReferenceAnomalySeverity,
  fileKind: PricingReferenceFileKind | null,
  sourceRowNumber: number | null,
  columns: string[],
  message: string,
  details: Record<string, unknown> = {},
): ParsedReferenceAnomaly => ({
  type,
  severity,
  file_kind: fileKind,
  source_row_number: sourceRowNumber,
  columns,
  message,
  details,
});

const decodeXmlEntities = (value: string): string =>
  value.replace(
    /&(#x[0-9a-fA-F]+|#\d+|amp|lt|gt|quot|apos);/g,
    (match, entity: string) => {
      switch (entity) {
        case "amp":
          return "&";
        case "lt":
          return "<";
        case "gt":
          return ">";
        case "quot":
          return '"';
        case "apos":
          return "'";
        default:
          if (entity.startsWith("#x")) {
            return String.fromCodePoint(Number.parseInt(entity.slice(2), 16));
          }
          if (entity.startsWith("#")) {
            return String.fromCodePoint(Number.parseInt(entity.slice(1), 10));
          }
          return match;
      }
    },
  );

const escapeRegex = (value: string): string =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const readXmlAttribute = (tag: string, attribute: string): string | null => {
  const pattern = new RegExp(
    `(?:^|\\s)${escapeRegex(attribute)}=(["'])(.*?)\\1`,
  );
  const match = pattern.exec(tag);
  return match ? decodeXmlEntities(match[2] ?? "") : null;
};

const readZipText = (
  entries: Record<string, Uint8Array>,
  path: string,
  filename: string,
): string => {
  const entry = entries[path];
  if (!entry) {
    throw httpError(
      400,
      "PRICING_REFERENCE_IMPORT_PARSE_FAILED",
      `Structure XLSX invalide dans le fichier ${filename}.`,
    );
  }
  return strFromU8(entry);
};

const normalizeZipPath = (basePath: string, target: string): string => {
  const targetPath = target.startsWith("/")
    ? target.slice(1)
    : `${basePath}/${target}`;
  const parts: string[] = [];
  targetPath.split("/").forEach((part) => {
    if (!part || part === ".") return;
    if (part === "..") {
      parts.pop();
      return;
    }
    parts.push(part);
  });
  return parts.join("/");
};

const resolveWorksheets = (
  entries: Record<string, Uint8Array>,
  filename: string,
): WorksheetDescriptor[] => {
  const workbookXml = readZipText(entries, "xl/workbook.xml", filename);
  const sheetPattern = /<sheet\b[^>]*>/gi;
  const sheets: Array<{ sheetName: string; relationshipId: string }> = [];
  let sheetMatch: RegExpExecArray | null;

  while ((sheetMatch = sheetPattern.exec(workbookXml)) !== null) {
    const tag = sheetMatch[0];
    const relationshipId = readXmlAttribute(tag, "r:id");
    if (!relationshipId) continue;
    sheets.push({
      sheetName: readXmlAttribute(tag, "name") ??
        `Feuille ${sheets.length + 1}`,
      relationshipId,
    });
  }

  if (sheets.length === 0) {
    throw httpError(
      400,
      "PRICING_REFERENCE_IMPORT_EMPTY",
      `Le fichier ${filename} ne contient aucun onglet.`,
    );
  }

  const relationshipsXml = readZipText(
    entries,
    "xl/_rels/workbook.xml.rels",
    filename,
  );
  const relationshipTargets = new Map<string, string>();
  const relationshipPattern = /<Relationship\b[^>]*>/gi;
  let relationshipMatch: RegExpExecArray | null;
  while (
    (relationshipMatch = relationshipPattern.exec(relationshipsXml)) !== null
  ) {
    const tag = relationshipMatch[0];
    const target = readXmlAttribute(tag, "Target");
    const id = readXmlAttribute(tag, "Id");
    if (id && target) {
      relationshipTargets.set(id, normalizeZipPath("xl", target));
    }
  }

  const worksheets = sheets.flatMap((sheet) => {
    const worksheetPath = relationshipTargets.get(sheet.relationshipId);
    return worksheetPath ? [{ sheetName: sheet.sheetName, worksheetPath }] : [];
  });

  if (worksheets.length > 0) {
    return worksheets;
  }

  throw httpError(
    400,
    "PRICING_REFERENCE_IMPORT_PARSE_FAILED",
    `Onglet XLSX introuvable dans le fichier ${filename}.`,
  );
};

const openWorkbookSheet = (
  input: PricingReferenceFileInput,
): {
  worksheets: WorksheetDescriptor[];
  selectedWorksheet: WorksheetDescriptor;
  sharedStrings: string[];
  sheetXml: string;
} => {
  ensurePricingReferenceFileAccepted(
    input.file_kind,
    input.original_filename,
    input.bytes.byteLength,
  );

  let entries: Record<string, Uint8Array>;
  try {
    entries = unzipSync(input.bytes);
  } catch {
    throw httpError(
      400,
      "PRICING_REFERENCE_IMPORT_PARSE_FAILED",
      `Impossible de lire le fichier ${input.original_filename}.`,
    );
  }

  const worksheets = resolveWorksheets(entries, input.original_filename);
  const requestedSheet = input.sheet_name?.trim();
  const selectedWorksheet = requestedSheet
    ? worksheets.find((sheet) => sheet.sheetName === requestedSheet)
    : worksheets[0];

  if (!selectedWorksheet) {
    throw httpError(
      400,
      "PRICING_REFERENCE_IMPORT_SHEET_NOT_FOUND",
      `Onglet ${
        requestedSheet ?? ""
      } introuvable dans le fichier ${input.original_filename}.`,
    );
  }

  return {
    worksheets,
    selectedWorksheet,
    sharedStrings: parseSharedStrings(entries),
    sheetXml: readZipText(
      entries,
      selectedWorksheet.worksheetPath,
      input.original_filename,
    ),
  };
};

const parseSharedStrings = (entries: Record<string, Uint8Array>): string[] => {
  const entry = entries["xl/sharedStrings.xml"];
  if (!entry) return [];

  const xml = strFromU8(entry);
  const values: string[] = [];
  const sharedStringPattern = /<si\b[^>]*>([\s\S]*?)<\/si>/gi;
  let sharedStringMatch: RegExpExecArray | null;
  while ((sharedStringMatch = sharedStringPattern.exec(xml)) !== null) {
    const itemXml = sharedStringMatch[1] ?? "";
    const textParts: string[] = [];
    const textPattern = /<t\b[^>]*>([\s\S]*?)<\/t>/gi;
    let textMatch: RegExpExecArray | null;
    while ((textMatch = textPattern.exec(itemXml)) !== null) {
      textParts.push(decodeXmlEntities(textMatch[1] ?? ""));
    }
    values.push(textParts.join(""));
  }
  return values;
};

const columnIndexFromCellRef = (
  cellRef: string | null,
  fallbackIndex: number,
): number => {
  if (!cellRef) return fallbackIndex;
  const letters = /^[A-Z]+/i.exec(cellRef)?.[0]?.toUpperCase();
  if (!letters) return fallbackIndex;

  let index = 0;
  for (const letter of letters) {
    index = index * 26 + (letter.charCodeAt(0) - 64);
  }
  return index - 1;
};

const readCellText = (
  cellXml: string,
  sharedStrings: readonly string[],
): string => {
  const openingTag = /^<c\b([^>]*?)(?:\/>|>)/i.exec(cellXml)?.[1] ?? "";
  const type = readXmlAttribute(openingTag, "t");

  if (type === "inlineStr") {
    const textParts: string[] = [];
    const textPattern = /<t\b[^>]*>([\s\S]*?)<\/t>/gi;
    let textMatch: RegExpExecArray | null;
    while ((textMatch = textPattern.exec(cellXml)) !== null) {
      textParts.push(decodeXmlEntities(textMatch[1] ?? ""));
    }
    return textParts.join("");
  }

  const rawValue = /<v\b[^>]*>([\s\S]*?)<\/v>/i.exec(cellXml)?.[1] ?? "";
  const value = decodeXmlEntities(rawValue);
  if (type === "s") {
    const sharedStringIndex = Number.parseInt(value, 10);
    return Number.isInteger(sharedStringIndex)
      ? sharedStrings[sharedStringIndex] ?? ""
      : "";
  }
  if (type === "b") return value === "1" ? "TRUE" : "FALSE";
  return value;
};

const parseSheetRow = (
  rowXml: string,
  sharedStrings: readonly string[],
): string[] => {
  const values: string[] = [];
  const cellPattern = /<c\b[^>]*(?:\/>|>[\s\S]*?<\/c>)/gi;
  let cellMatch: RegExpExecArray | null;
  let fallbackIndex = 0;

  while ((cellMatch = cellPattern.exec(rowXml)) !== null) {
    const cellXml = cellMatch[0];
    const openingTag = /^<c\b([^>]*?)(?:\/>|>)/i.exec(cellXml)?.[1] ?? "";
    const columnIndex = columnIndexFromCellRef(
      readXmlAttribute(openingTag, "r"),
      fallbackIndex,
    );
    values[columnIndex] = readCellText(cellXml, sharedStrings);
    fallbackIndex = columnIndex + 1;
  }

  return values;
};

const normalizeColumnIdentity = (value: string): string =>
  normalizeText(value)
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "");

const levenshteinDistance = (left: string, right: string): number => {
  if (left === right) return 0;
  if (left.length === 0) return right.length;
  if (right.length === 0) return left.length;

  const previous = Array.from(
    { length: right.length + 1 },
    (_, index) => index,
  );
  const current = Array.from({ length: right.length + 1 }, () => 0);

  for (let leftIndex = 1; leftIndex <= left.length; leftIndex += 1) {
    current[0] = leftIndex;
    for (let rightIndex = 1; rightIndex <= right.length; rightIndex += 1) {
      const cost = left[leftIndex - 1] === right[rightIndex - 1] ? 0 : 1;
      current[rightIndex] = Math.min(
        current[rightIndex - 1] + 1,
        previous[rightIndex] + 1,
        previous[rightIndex - 1] + cost,
      );
    }
    previous.splice(0, previous.length, ...current);
  }

  return previous[right.length] ?? 0;
};

const similarityScore = (left: string, right: string): number => {
  const normalizedLeft = normalizeColumnIdentity(left);
  const normalizedRight = normalizeColumnIdentity(right);
  const maxLength = Math.max(normalizedLeft.length, normalizedRight.length);
  if (maxLength === 0) return 0;
  return 1 - (levenshteinDistance(normalizedLeft, normalizedRight) / maxLength);
};

const mergeColumnAliases = (
  fileKind: PricingReferenceFileKind,
  savedAliases?: PricingReferenceColumnAliases | null,
): PricingReferenceColumnAliases => {
  const merged: PricingReferenceColumnAliases = {};
  const expected = getPricingReferenceExpectedColumns(fileKind);
  expected.forEach((column) => {
    merged[column] = uniqueValues([
      ...(DEFAULT_COLUMN_ALIASES[fileKind][column] ?? []),
      ...(savedAliases?.[column] ?? []),
    ]);
  });
  return merged;
};

const findHeaderByIdentity = (
  headers: readonly string[],
  value: string,
): string | null => {
  const identity = normalizeColumnIdentity(value);
  return headers.find((header) =>
    normalizeColumnIdentity(header) === identity
  ) ?? null;
};

export const proposePricingReferenceColumnMapping = (
  fileKind: PricingReferenceFileKind,
  detectedColumns: readonly string[],
  savedAliases?: PricingReferenceColumnAliases | null,
  savedMapping?: PricingReferenceColumnMapping | null,
): {
  candidates: PricingReferenceColumnMappingCandidate[];
  proposed_mapping: PricingReferenceColumnMapping;
  mapping_status: "auto" | "a_confirmer" | "invalide";
} => {
  const aliases = mergeColumnAliases(fileKind, savedAliases);
  const proposedMapping: PricingReferenceColumnMapping = {};
  const candidates = getPricingReferenceExpectedColumns(fileKind).map(
    (canonicalColumn) => {
      if (detectedColumns.includes(canonicalColumn)) {
        proposedMapping[canonicalColumn] = canonicalColumn;
        return {
          canonical_column: canonicalColumn,
          source_column: canonicalColumn,
          status: "auto" as const,
          confidence: 1,
          reason: "Nom exact detecte.",
        };
      }

      const normalizedMatch = findHeaderByIdentity(
        detectedColumns,
        canonicalColumn,
      );
      if (normalizedMatch) {
        proposedMapping[canonicalColumn] = normalizedMatch;
        return {
          canonical_column: canonicalColumn,
          source_column: normalizedMatch,
          status: "auto" as const,
          confidence: 0.98,
          reason:
            "Correspondance apres normalisation casse, accents et espaces.",
        };
      }

      const savedSource = savedMapping?.[canonicalColumn];
      if (savedSource) {
        const savedMatch = findHeaderByIdentity(detectedColumns, savedSource);
        if (savedMatch) {
          proposedMapping[canonicalColumn] = savedMatch;
          return {
            canonical_column: canonicalColumn,
            source_column: savedMatch,
            status: "alias" as const,
            confidence: 0.97,
            reason: "Mapping enregistre retrouve.",
          };
        }
      }

      const aliasMatch = aliases[canonicalColumn]
        ?.map((alias) => findHeaderByIdentity(detectedColumns, alias))
        .find((match): match is string => Boolean(match));
      if (aliasMatch) {
        proposedMapping[canonicalColumn] = aliasMatch;
        return {
          canonical_column: canonicalColumn,
          source_column: aliasMatch,
          status: "alias" as const,
          confidence: 0.94,
          reason: "Alias connu retrouve.",
        };
      }

      const bestSimilarity = detectedColumns
        .map((column) => ({
          column,
          score: similarityScore(canonicalColumn, column),
        }))
        .sort((left, right) => right.score - left.score)[0];
      if (bestSimilarity && bestSimilarity.score >= 0.78) {
        proposedMapping[canonicalColumn] = bestSimilarity.column;
        return {
          canonical_column: canonicalColumn,
          source_column: bestSimilarity.column,
          status: "a_confirmer" as const,
          confidence: Number(bestSimilarity.score.toFixed(2)),
          reason: "Nom proche detecte, confirmation requise.",
        };
      }

      return {
        canonical_column: canonicalColumn,
        source_column: null,
        status: "manquant" as const,
        confidence: 0,
        reason: "Aucune colonne source fiable detectee.",
      };
    },
  );

  const mappingStatus =
    candidates.some((candidate) => candidate.status === "manquant")
      ? "invalide"
      : candidates.some((candidate) => candidate.status === "a_confirmer")
      ? "a_confirmer"
      : "auto";

  return {
    candidates,
    proposed_mapping: proposedMapping,
    mapping_status: mappingStatus,
  };
};

const buildResolvedColumnMapping = (
  headers: readonly string[],
  expectedColumns: readonly string[],
  explicitMapping?: PricingReferenceColumnMapping | null,
): PricingReferenceColumnMapping => {
  const resolved: PricingReferenceColumnMapping = {};
  expectedColumns.forEach((column) => {
    const mappedSource = explicitMapping?.[column];
    const source = mappedSource
      ? findHeaderByIdentity(headers, mappedSource)
      : null;
    if (source) {
      resolved[column] = source;
      return;
    }
    if (headers.includes(column)) {
      resolved[column] = column;
      return;
    }
    const normalized = findHeaderByIdentity(headers, column);
    if (normalized) resolved[column] = normalized;
  });
  return resolved;
};

const readWorkbookTable = (
  input: PricingReferenceFileInput,
  expectedColumns: readonly string[] = getPricingReferenceExpectedColumns(
    input.file_kind,
  ),
): WorkbookReader => {
  const { selectedWorksheet, sharedStrings, sheetXml } = openWorkbookSheet(
    input,
  );
  const rowPattern = /<row\b[^>]*>[\s\S]*?<\/row>/gi;
  const headerMatch = rowPattern.exec(sheetXml);
  const headerRow = headerMatch
    ? parseSheetRow(headerMatch[0], sharedStrings)
    : [];
  const headers = headerRow.map(normalizeHeader).filter((value) =>
    value !== ""
  );
  const columnMapping = buildResolvedColumnMapping(
    headers,
    expectedColumns,
    input.column_mapping,
  );
  const columnRemaps = Object.entries(columnMapping)
    .filter(([canonicalColumn, sourceColumn]) =>
      canonicalColumn !== sourceColumn
    );

  if (headers.length === 0) {
    throw httpError(
      400,
      "PRICING_REFERENCE_IMPORT_EMPTY",
      `Le fichier ${input.original_filename} ne contient aucun en-tete.`,
    );
  }

  const rows = function* iterateRows(): IterableIterator<ParsedWorkbookRow> {
    let rowMatch: RegExpExecArray | null;
    let fallbackRowNumber = 2;
    while ((rowMatch = rowPattern.exec(sheetXml)) !== null) {
      const rowXml = rowMatch[0];
      const row = parseSheetRow(rowXml, sharedStrings);
      const rawValues: Record<string, string> = {};
      const values: Record<string, string> = {};
      let hasValue = false;

      headers.forEach((header, index) => {
        const rawValue = stringifyCell(row[index] ?? "");
        const normalizedValue = normalizeCell(header, rawValue);
        rawValues[header] = rawValue;
        values[header] = normalizedValue;
        if (normalizedValue !== "") hasValue = true;
      });

      columnRemaps.forEach(([canonicalColumn, sourceColumn]) => {
        const rawValue = rawValues[sourceColumn] ?? "";
        rawValues[canonicalColumn] = rawValue;
        values[canonicalColumn] = normalizeCell(canonicalColumn, rawValue);
        if (values[canonicalColumn] !== "") hasValue = true;
      });

      if (hasValue) {
        const rowNumber = Number.parseInt(
          readXmlAttribute(rowXml, "r") ?? "",
          10,
        );
        yield {
          source_row_number: Number.isInteger(rowNumber)
            ? rowNumber
            : fallbackRowNumber,
          raw_values: rawValues,
          values,
        };
      }
      fallbackRowNumber += 1;
    }
  };

  return {
    sheetName: selectedWorksheet.sheetName,
    headers,
    mappedColumns: Object.keys(columnMapping),
    rows: { [Symbol.iterator]: rows },
  };
};

const missingColumns = (
  mappedColumns: string[],
  expected: readonly string[],
): string[] => expected.filter((column) => !mappedColumns.includes(column));

const hasEmpty = (
  row: ParsedWorkbookRow,
  columns: readonly string[],
): boolean => columns.some((column) => (row.values[column] ?? "") === "");

const toRawValues = (
  row: ParsedWorkbookRow,
  columns: readonly string[],
): Record<string, string> => {
  const values: Record<string, string> = {};
  columns.forEach((column) => {
    values[column] = row.raw_values[column] ?? "";
  });
  return values;
};

const toNormalizedValues = (
  row: ParsedWorkbookRow,
  columns: readonly string[],
): Record<string, string> => {
  const values: Record<string, string> = {};
  columns.forEach((column) => {
    values[column] = row.values[column] ?? "";
  });
  return values;
};

export const listPricingReferenceCanonicalSourceRows = (
  input: PricingReferenceFileInput,
): PricingReferenceCanonicalSourceRow[] => {
  const expectedColumns = getPricingReferenceExpectedColumns(input.file_kind);
  const table = readWorkbookTable(input, expectedColumns);
  return Array.from(table.rows, (row) => ({
    source_row_number: row.source_row_number,
    raw_values: toRawValues(row, expectedColumns),
  }));
};

export const inspectPricingReferenceWorkbook = (
  input: PricingReferenceFileInput,
  savedAliases?: PricingReferenceColumnAliases | null,
  savedMapping?: PricingReferenceColumnMapping | null,
): PricingReferenceWorkbookInspection => {
  const { worksheets, selectedWorksheet, sharedStrings, sheetXml } =
    openWorkbookSheet(input);
  const rowPattern = /<row\b[^>]*>[\s\S]*?<\/row>/gi;
  const headerMatch = rowPattern.exec(sheetXml);
  const headerRow = headerMatch
    ? parseSheetRow(headerMatch[0], sharedStrings)
    : [];
  const detectedColumns = headerRow.map(normalizeHeader).filter((value) =>
    value !== ""
  );

  if (detectedColumns.length === 0) {
    throw httpError(
      400,
      "PRICING_REFERENCE_IMPORT_EMPTY",
      `Le fichier ${input.original_filename} ne contient aucun en-tete.`,
    );
  }

  let rowCount = 0;
  const sampleRows: Record<string, string>[] = [];
  let rowMatch: RegExpExecArray | null;
  while ((rowMatch = rowPattern.exec(sheetXml)) !== null) {
    const row = parseSheetRow(rowMatch[0], sharedStrings);
    const values: Record<string, string> = {};
    let hasValue = false;

    detectedColumns.forEach((header, index) => {
      const value = stringifyCell(row[index] ?? "");
      values[header] = value;
      if (normalizeText(value) !== "") hasValue = true;
    });

    if (!hasValue) continue;
    rowCount += 1;
    if (sampleRows.length < 10) sampleRows.push(values);
  }

  const proposal = proposePricingReferenceColumnMapping(
    input.file_kind,
    detectedColumns,
    savedAliases,
    savedMapping,
  );

  return {
    sheet_name: selectedWorksheet.sheetName,
    worksheets: worksheets.map((sheet) => sheet.sheetName),
    expected_columns: [...getPricingReferenceExpectedColumns(input.file_kind)],
    detected_columns: detectedColumns,
    row_count: rowCount,
    sample_rows: sampleRows,
    ...proposal,
  };
};

const parseClassification = (
  input: PricingReferenceFileInput,
): {
  table: WorkbookTable;
  rows: ParsedClassificationRow[];
  anomalies: ParsedReferenceAnomaly[];
  duplicateCirKeys: number;
  mandatoryEmptyRows: number;
} => {
  const table = readWorkbookTable(input);
  const anomalies: ParsedReferenceAnomaly[] = [];
  const missing = missingColumns(
    table.mappedColumns,
    CLASSIFICATION_EXPECTED_COLUMNS,
  );

  missing.forEach((column) => {
    anomalies.push(buildAnomaly(
      "missing_column",
      "bloquante",
      "classification",
      null,
      [column],
      `Colonne obligatoire absente dans le fichier classification: ${column}.`,
    ));
  });

  const seenKeys = new Set<string>();
  let duplicateCirKeys = 0;
  let mandatoryEmptyRows = 0;
  let rowsCount = 0;
  const parsedRows: ParsedClassificationRow[] = [];

  for (const row of table.rows) {
    rowsCount += 1;
    const mega = row.values.MEGA ?? "";
    const fam = row.values.FAM ?? "";
    const sfa = row.values.SFA ?? "";
    const key = cirKey(mega, fam, sfa);
    const emptyColumns = CLASSIFICATION_EXPECTED_COLUMNS.filter((column) =>
      (row.values[column] ?? "") === ""
    );

    if (emptyColumns.length > 0) {
      mandatoryEmptyRows += 1;
      anomalies.push(buildAnomaly(
        "classification_required_empty",
        "bloquante",
        "classification",
        row.source_row_number,
        emptyColumns,
        "Champ obligatoire vide dans la classification CIR.",
        {
          cir_key: key,
          raw_values: toRawValues(row, CLASSIFICATION_EXPECTED_COLUMNS),
        },
      ));
      continue;
    }

    if (seenKeys.has(key)) {
      duplicateCirKeys += 1;
      anomalies.push(buildAnomaly(
        "classification_duplicate_key",
        "bloquante",
        "classification",
        row.source_row_number,
        ["MEGA", "FAM", "SFA"],
        `Cle CIR dupliquee: ${key}.`,
        {
          cir_key: key,
          raw_values: toRawValues(row, CLASSIFICATION_EXPECTED_COLUMNS),
        },
      ));
      continue;
    } else {
      seenKeys.add(key);
    }

    parsedRows.push({
      source_row_number: row.source_row_number,
      mega,
      fam,
      sfa,
      mega_lib: row.values.MEGA_LIB ?? "",
      fam_lib: row.values.FAM_LIB ?? "",
      sfa_lib: row.values.SFA_LIB ?? "",
      cir_key: key,
      raw_values: toRawValues(row, CLASSIFICATION_EXPECTED_COLUMNS),
      normalized_values: {
        MEGA: mega,
        FAM: fam,
        SFA: sfa,
        MEGA_LIB: row.values.MEGA_LIB ?? "",
        FAM_LIB: row.values.FAM_LIB ?? "",
        SFA_LIB: row.values.SFA_LIB ?? "",
      },
    });
  }

  if (rowsCount === 0) {
    throw httpError(
      400,
      "PRICING_REFERENCE_IMPORT_EMPTY",
      `Le fichier ${input.original_filename} ne contient aucune ligne.`,
    );
  }

  return {
    table: {
      sheetName: table.sheetName,
      headers: table.headers,
      mappedColumns: table.mappedColumns,
      rowsCount,
    },
    rows: parsedRows,
    anomalies,
    duplicateCirKeys,
    mandatoryEmptyRows,
  };
};

const classifyLinkStatus = (
  mega: string,
  fam: string,
  sfa: string,
  validClassificationKeys: Set<string>,
): ParsedSegmentClassificationLinkRow["link_status"] => {
  const values = [mega, fam, sfa];
  if (values.every((value) => value === "")) return "missing";
  if (values.some((value) => value === "")) return "partial";
  return validClassificationKeys.has(cirKey(mega, fam, sfa))
    ? "complete_valid"
    : "unknown_key";
};

const buildAmbiguousBrandCategoryAnomalies = (
  grouped: Map<string, { firstRow: number; keys: Set<string> }>,
): ParsedReferenceAnomaly[] => {
  const anomalies: ParsedReferenceAnomaly[] = [];
  for (const [brandCategoryKey, entry] of grouped.entries()) {
    if (entry.keys.size <= 1) continue;
    const [marque, catFab] = brandCategoryKey.split("|");
    anomalies.push(buildAnomaly(
      "segment_ambiguous_link",
      "haute",
      "segments_grids",
      entry.firstRow,
      ["MARQUE", "CAT_FAB", "MEGA_FAMILLE", "FAMILLE", "SOUS_FAMILLE"],
      `Liaison CIR ambigue pour ${marque} + ${catFab}.`,
      { marque, cat_fab: catFab, cir_keys: Array.from(entry.keys).sort() },
    ));
  }

  return anomalies;
};

const parseSegments = (
  input: PricingReferenceFileInput,
  validClassificationKeys: Set<string>,
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
  const missing = missingColumns(
    table.mappedColumns,
    SEGMENTS_EXPECTED_COLUMNS,
  );

  missing.forEach((column) => {
    anomalies.push(buildAnomaly(
      "missing_column",
      "bloquante",
      "segments_grids",
      null,
      [column],
      `Colonne obligatoire absente dans le fichier segments/grilles: ${column}.`,
    ));
  });

  const segmentRowsByKey = new Map<string, ParsedSupplierSegmentRow>();
  const linkRowsByKey = new Map<string, ParsedSegmentClassificationLinkRow>();
  const purchaseGridRows: ParsedSegmentPurchaseGridRow[] = [];
  let identityIncompleteRows = 0;
  let classificationIncompleteRows = 0;
  let cirKeysNotValidatedRows = 0;
  let purchaseGridMissingRows = 0;
  let rowsCount = 0;
  const ambiguousBrandCategoryGroups = new Map<
    string,
    { firstRow: number; keys: Set<string> }
  >();

  for (const row of table.rows) {
    rowsCount += 1;
    const segment = row.values.SEGMENT ?? "";
    const idnumerique = row.values.IDNUMERIQUE ?? "";
    const marque = row.values.MARQUE ?? "";
    const catFab = row.values.CAT_FAB ?? "";
    const key = segmentKey(segment, idnumerique, marque, catFab);

    if (hasEmpty(row, SEGMENT_IDENTITY_COLUMNS)) {
      identityIncompleteRows += 1;
      anomalies.push(buildAnomaly(
        "segment_identity_incomplete",
        "bloquante",
        "segments_grids",
        row.source_row_number,
        SEGMENT_IDENTITY_COLUMNS.filter((column) =>
          (row.values[column] ?? "") === ""
        ),
        "Identite segment fabricant incomplete.",
        {
          segment_key: key,
          raw_values: toRawValues(row, SEGMENT_STORAGE_COLUMNS),
        },
      ));
    }

    if (
      !segmentRowsByKey.has(key) && !hasEmpty(row, SEGMENT_IDENTITY_COLUMNS)
    ) {
      segmentRowsByKey.set(key, {
        source_row_number: row.source_row_number,
        segment,
        idnumerique,
        marque,
        cat_fab: catFab,
        cat_fab_l: nullableValue(row.values.CAT_FAB_L ?? ""),
        strategiq: nullableValue(row.values.STRATEGIQ ?? ""),
        codif_fair: nullableValue(row.values.CODIF_FAIR ?? ""),
        tarif_fab: nullableValue(row.values.TARIF_FAB ?? ""),
        segment_key: key,
        raw_values: toRawValues(row, SEGMENT_STORAGE_COLUMNS),
        normalized_values: toNormalizedValues(row, SEGMENT_STORAGE_COLUMNS),
      });
    }

    const mega = row.values.MEGA_FAMILLE ?? "";
    const fam = row.values.FAMILLE ?? "";
    const sfa = row.values.SOUS_FAMILLE ?? "";
    const classificationKey = cirKey(mega, fam, sfa);
    const linkStatus = classifyLinkStatus(
      mega,
      fam,
      sfa,
      validClassificationKeys,
    );
    const classificationIncomplete = linkStatus === "missing" ||
      linkStatus === "partial";
    if (marque && catFab && mega && fam && sfa) {
      const brandCategoryKey = `${marque}|${catFab}`;
      const entry = ambiguousBrandCategoryGroups.get(brandCategoryKey) ?? {
        firstRow: row.source_row_number,
        keys: new Set<string>(),
      };
      entry.keys.add(classificationKey);
      ambiguousBrandCategoryGroups.set(brandCategoryKey, entry);
    }

    if (classificationIncomplete) {
      classificationIncompleteRows += 1;
      anomalies.push(buildAnomaly(
        "segment_classification_incomplete",
        "moyenne",
        "segments_grids",
        row.source_row_number,
        SEGMENT_CLASSIFICATION_COLUMNS.filter((column) =>
          (row.values[column] ?? "") === ""
        ),
        "Classification CIR incomplete pour le segment fabricant.",
        {
          segment_key: key,
          cir_key: classificationKey,
          raw_values: toRawValues(row, SEGMENT_CLASSIFICATION_COLUMNS),
        },
      ));
    }

    if (classificationIncomplete || linkStatus === "unknown_key") {
      cirKeysNotValidatedRows += 1;
      if (linkStatus === "unknown_key") {
        anomalies.push(buildAnomaly(
          "segment_classification_unknown",
          "haute",
          "segments_grids",
          row.source_row_number,
          [...SEGMENT_CLASSIFICATION_COLUMNS],
          `Cle CIR non reconnue dans la classification: ${classificationKey}.`,
          {
            segment_key: key,
            cir_key: classificationKey,
            raw_values: toRawValues(row, SEGMENT_CLASSIFICATION_COLUMNS),
          },
        ));
      }
    }

    const linkKey = `${key}|${classificationKey}`;
    if (
      !linkRowsByKey.has(linkKey) && !hasEmpty(row, SEGMENT_IDENTITY_COLUMNS)
    ) {
      linkRowsByKey.set(linkKey, {
        source_row_number: row.source_row_number,
        segment_key: key,
        classification_cir_key: linkStatus === "complete_valid"
          ? classificationKey
          : null,
        mega_famille: nullableValue(mega),
        famille: nullableValue(fam),
        sous_famille: nullableValue(sfa),
        cir_key: classificationKey,
        link_status: linkStatus,
        raw_values: toRawValues(row, [
          ...SEGMENT_CLASSIFICATION_COLUMNS,
          ...SEGMENT_CLASSIFICATION_LABEL_COLUMNS,
        ]),
        normalized_values: {
          MEGA_FAMILLE: mega,
          FAMILLE: fam,
          SOUS_FAMILLE: sfa,
          MEGA_LIBELLE: row.values.MEGA_LIBELLE ?? "",
          FAMILLE_LIBELLE: row.values.FAMILLE_LIBELLE ?? "",
          SFAM_LIBELLE: row.values.SFAM_LIBELLE ?? "",
        },
      });
    }

    const missingGridColumns = PURCHASE_GRID_REQUIRED_COLUMNS.filter((column) =>
      (row.values[column] ?? "") === ""
    );
    if (missingGridColumns.length > 0) {
      purchaseGridMissingRows += 1;
      anomalies.push(buildAnomaly(
        "purchase_grid_missing",
        "moyenne",
        "segments_grids",
        row.source_row_number,
        missingGridColumns,
        "Champ grille achat structurel manquant.",
        { segment_key: key, raw_values: toRawValues(row, missingGridColumns) },
      ));
    }

    if (!hasEmpty(row, SEGMENT_IDENTITY_COLUMNS)) {
      const normalizedDates = {
        DATE_DEBUT: normalizeCirDate(row.values.DATE_DEBUT ?? ""),
        DATE_FIN: normalizeCirDate(row.values.DATE_FIN ?? ""),
      };

      DATE_COLUMNS.forEach((column) => {
        const dateResult = normalizedDates[column];
        if (dateResult.valid) return;
        anomalies.push(buildAnomaly(
          "parse_failed",
          "moyenne",
          "segments_grids",
          row.source_row_number,
          [column],
          `Date CIR invalide dans la colonne ${column}.`,
          {
            segment_key: key,
            source_value: row.raw_values[column] ?? "",
            normalized_value: null,
          },
        ));
      });

      purchaseGridRows.push({
        source_row_number: row.source_row_number,
        segment_key: key,
        num_four: nullableValue(row.values.NUM_FOUR ?? ""),
        remise_ha: nullableValue(row.values.REMISE_HA ?? ""),
        col_ha: nullableValue(row.values.COL_HA ?? ""),
        priorite: nullableValue(row.values.PRIORITE ?? ""),
        type_grill: nullableValue(row.values.TYPE_GRILL ?? ""),
        date_debut_raw: nullableRawValue(row.raw_values.DATE_DEBUT ?? ""),
        date_fin_raw: nullableRawValue(row.raw_values.DATE_FIN ?? ""),
        date_debut_normalized: normalizedDates.DATE_DEBUT.normalized,
        date_fin_normalized: normalizedDates.DATE_FIN.normalized,
        borne_acha: nullableValue(row.values.BORNE_ACHA ?? ""),
        coef_retro: nullableValue(row.values.COEF_RETRO ?? ""),
        coef_ha: nullableValue(row.values.COEF_HA ?? ""),
        coef_majvte: nullableValue(row.values.COEF_MAJVTE ?? ""),
        raw_values: {
          DATE_DEBUT: row.raw_values.DATE_DEBUT ?? "",
          DATE_FIN: row.raw_values.DATE_FIN ?? "",
        },
        normalized_values: {
          DATE_DEBUT: normalizedDates.DATE_DEBUT.normalized ?? "",
          DATE_FIN: normalizedDates.DATE_FIN.normalized ?? "",
        },
      });
    }
  }

  if (rowsCount === 0) {
    throw httpError(
      400,
      "PRICING_REFERENCE_IMPORT_EMPTY",
      `Le fichier ${input.original_filename} ne contient aucune ligne.`,
    );
  }

  anomalies.push(
    ...buildAmbiguousBrandCategoryAnomalies(ambiguousBrandCategoryGroups),
  );

  return {
    table: {
      sheetName: table.sheetName,
      headers: table.headers,
      mappedColumns: table.mappedColumns,
      rowsCount,
    },
    segmentRows: Array.from(segmentRowsByKey.values()),
    linkRows: Array.from(linkRowsByKey.values()),
    purchaseGridRows,
    anomalies,
    identityIncompleteRows,
    classificationIncompleteRows,
    cirKeysNotValidatedRows,
    purchaseGridMissingRows,
  };
};

const summarizeAnomalies = (anomalies: ParsedReferenceAnomaly[]) => ({
  total: anomalies.length,
  bloquante:
    anomalies.filter((anomaly) => anomaly.severity === "bloquante").length,
  haute: anomalies.filter((anomaly) => anomaly.severity === "haute").length,
  moyenne: anomalies.filter((anomaly) => anomaly.severity === "moyenne").length,
  faible: anomalies.filter((anomaly) => anomaly.severity === "faible").length,
});

const buildFileHealth = (
  input: PricingReferenceFileInput,
  table: WorkbookTable,
  expected: readonly string[],
) => ({
  file_kind: input.file_kind,
  original_filename: input.original_filename,
  storage_path: input.storage_path ?? null,
  sha256: input.sha256 ?? "",
  size_bytes: input.bytes.byteLength,
  sheet_name: table.sheetName,
  rows_count: table.rowsCount,
  columns_count: table.headers.length,
  columns: {
    expected: [...expected],
    detected: table.headers,
    missing: missingColumns(table.mappedColumns, expected),
  },
});

export const analyzePricingReferenceWorkbooks = async (
  classificationInput: PricingReferenceFileInput,
  segmentsInput: PricingReferenceFileInput,
): Promise<PricingReferenceAnalysisResult> => {
  const classificationSha = classificationInput.sha256 ??
    await computeSha256(classificationInput.bytes);
  const segmentsSha = segmentsInput.sha256 ??
    await computeSha256(segmentsInput.bytes);
  const classificationWithHash = {
    ...classificationInput,
    sha256: classificationSha,
  };
  const segmentsWithHash = { ...segmentsInput, sha256: segmentsSha };

  const classification = parseClassification(classificationWithHash);
  const validClassificationKeys = new Set(
    classification.rows
      .filter((row) => row.mega !== "" && row.fam !== "" && row.sfa !== "")
      .map((row) => row.cir_key),
  );
  const segments = parseSegments(segmentsWithHash, validClassificationKeys);
  const anomalies = [...classification.anomalies, ...segments.anomalies];
  const uniqueClassificationKeys =
    uniqueValues(classification.rows.map((row) => row.cir_key)).length;

  const healthReport = {
    generated_at: new Date().toISOString(),
    storage: {
      bucket: PRICING_REFERENCE_STORAGE_BUCKET,
      max_file_size_bytes: PRICING_REFERENCE_MAX_FILE_SIZE_BYTES,
      allowed_extensions: [".xlsx" as const],
    },
    files: {
      classification: buildFileHealth(
        classificationWithHash,
        classification.table,
        CLASSIFICATION_EXPECTED_COLUMNS,
      ),
      segments_grids: buildFileHealth(
        segmentsWithHash,
        segments.table,
        SEGMENTS_EXPECTED_COLUMNS,
      ),
    },
    classification: {
      rows_count: classification.table.rowsCount,
      columns_count: classification.table.headers.length,
      unique_cir_keys: uniqueClassificationKeys,
      duplicate_cir_keys: classification.duplicateCirKeys,
      mandatory_empty_rows: classification.mandatoryEmptyRows,
    },
    segments_grids: {
      rows_count: segments.table.rowsCount,
      columns_count: segments.table.headers.length,
      unique_segment_identities: segments.segmentRows.length,
      identity_incomplete_rows: segments.identityIncompleteRows,
      classification_incomplete_rows: segments.classificationIncompleteRows,
      cir_keys_not_validated_rows: segments.cirKeysNotValidatedRows,
      purchase_grid_missing_rows: segments.purchaseGridMissingRows,
    },
    anomalies: summarizeAnomalies(anomalies),
    anomaly_samples: anomalies.slice(0, ANOMALY_SAMPLE_LIMIT),
  };

  const parsedHealthReport = pricingReferenceHealthReportSchema.safeParse(
    healthReport,
  );
  if (!parsedHealthReport.success) {
    throw httpError(
      500,
      "PRICING_REFERENCE_IMPORT_PARSE_FAILED",
      "Le rapport de sante referentiel est invalide.",
      parsedHealthReport.error.issues.map((issue) => issue.message).join(" | "),
    );
  }

  return {
    health_report: parsedHealthReport.data,
    classification_rows: classification.rows,
    segment_rows: segments.segmentRows,
    link_rows: segments.linkRows,
    purchase_grid_rows: segments.purchaseGridRows,
    anomalies,
  };
};
