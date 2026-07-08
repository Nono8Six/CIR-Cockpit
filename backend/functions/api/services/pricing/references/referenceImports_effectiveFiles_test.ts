import { assertEquals } from "std/assert";

import {
  pricing_reference_import_files,
  pricing_reference_imports,
} from "../../../../../drizzle/schema.ts";
import {
  PRICING_REFERENCE_MAX_FILE_SIZE_BYTES,
  PRICING_REFERENCE_STORAGE_BUCKET,
  type PricingReferenceFileKind,
  type PricingReferenceHealthReport,
  type PricingReferenceImportStatus,
} from "../../../../../../shared/schemas/pricing/references.schema.ts";
import type { DbClient } from "../../../types.ts";
import {
  getPricingReferenceImport,
  listPricingReferenceImports,
} from "./referenceImports.ts";

type ImportRow = typeof pricing_reference_imports.$inferSelect;
type ImportFileRow = typeof pricing_reference_import_files.$inferSelect;

type FakeDbOptions = {
  imports: ImportRow[];
  executeResponses: unknown[][];
};

const requestId = "req_effective_files";
const callerId = crypto.randomUUID();

const createFakeDb = (
  { imports, executeResponses }: FakeDbOptions,
): { db: DbClient; executeCalls: unknown[] } => {
  const executeQueue = [...executeResponses];
  const executeCalls: unknown[] = [];
  const db = {
    select: (selection?: unknown) => {
      let selectedTable: unknown;
      let limitValue: number | null = null;
      let offsetValue = 0;

      const resolveRows = (): unknown[] => {
        if (selectedTable === pricing_reference_imports) {
          const isTotalSelection = Boolean(
            selection && typeof selection === "object" && "total" in selection,
          );
          if (isTotalSelection) return [{ total: imports.length }];
          return imports.slice(
            offsetValue,
            limitValue === null ? undefined : offsetValue + limitValue,
          );
        }
        return [];
      };

      const builder = {
        from: (table: unknown) => {
          selectedTable = table;
          return builder;
        },
        where: () => builder,
        orderBy: () => builder,
        limit: (value: number) => {
          limitValue = value;
          return builder;
        },
        offset: (value: number) => {
          offsetValue = value;
          return Promise.resolve(resolveRows());
        },
        then: (
          resolve: (value: unknown[]) => unknown,
          reject?: (reason: unknown) => unknown,
        ) => Promise.resolve(resolveRows()).then(resolve, reject),
      };
      return builder;
    },
    execute: (_query: unknown) => {
      executeCalls.push(_query);
      return Promise.resolve(executeQueue.shift() ?? []);
    },
  } as unknown as DbClient;

  return { db, executeCalls };
};

const importRow = (
  overrides: Partial<ImportRow> = {},
): ImportRow => ({
  id: crypto.randomUUID(),
  status: "analyse_ok",
  created_by: null,
  analyzed_by: callerId,
  analysis_started_at: "2026-07-06T08:00:00.000Z",
  analysis_completed_at: "2026-07-06T08:01:00.000Z",
  health_report: null,
  counters: {},
  error_code: null,
  error_message: null,
  error_details: null,
  created_at: "2026-07-06T07:59:00.000Z",
  updated_at: "2026-07-06T08:01:00.000Z",
  ...overrides,
});

const importFileRow = (
  {
    import_id,
    file_kind,
    sha256,
    ...overrides
  }: Partial<ImportFileRow> & {
    import_id: string;
    file_kind: PricingReferenceFileKind;
    sha256: string;
  },
): ImportFileRow => ({
  id: crypto.randomUUID(),
  import_id,
  file_kind,
  original_filename: `${file_kind}.xlsx`,
  storage_bucket: PRICING_REFERENCE_STORAGE_BUCKET,
  storage_path: `imports/2026-07-06/${crypto.randomUUID()}.xlsx`,
  size_bytes: 1024,
  sha256,
  content_type: null,
  sheet_name: null,
  detected_columns: [],
  row_count: null,
  mapping_profile_id: null,
  column_mapping: {},
  mapping_status: "confirme",
  mapping_confirmed_by: null,
  mapping_confirmed_at: null,
  uploaded_by: callerId,
  created_at: "2026-07-06T08:00:10.000Z",
  updated_at: "2026-07-06T08:00:10.000Z",
  ...overrides,
});

const healthFile = (
  file: ImportFileRow,
  rowsCount: number,
) => ({
  file_kind: file.file_kind,
  original_filename: file.original_filename,
  storage_path: file.storage_path,
  sha256: file.sha256,
  size_bytes: file.size_bytes,
  sheet_name: file.sheet_name,
  rows_count: rowsCount,
  columns_count: 0,
  columns: {
    expected: [],
    detected: [],
    missing: [],
  },
});

const healthReport = (
  classification: ImportFileRow,
  segments: ImportFileRow,
): PricingReferenceHealthReport => ({
  generated_at: "2026-07-06T08:01:00.000Z",
  storage: {
    bucket: PRICING_REFERENCE_STORAGE_BUCKET,
    max_file_size_bytes: PRICING_REFERENCE_MAX_FILE_SIZE_BYTES,
    allowed_extensions: [".xlsx"],
  },
  files: {
    classification: healthFile(classification, 497),
    segments_grids: healthFile(segments, 12_635),
  },
  classification: {
    rows_count: 497,
    columns_count: 0,
    unique_cir_keys: 497,
    duplicate_cir_keys: 0,
    mandatory_empty_rows: 0,
  },
  segments_grids: {
    rows_count: 12_635,
    columns_count: 0,
    unique_segment_identities: 9248,
    identity_incomplete_rows: 0,
    classification_incomplete_rows: 0,
    cir_keys_not_validated_rows: 0,
    purchase_grid_missing_rows: 0,
  },
  anomalies: {
    total: 0,
    bloquante: 0,
    haute: 0,
    moyenne: 0,
    faible: 0,
  },
  anomaly_samples: [],
});

const listImports = (db: DbClient) =>
  listPricingReferenceImports(db, callerId, requestId, {
    page: 1,
    page_size: 50,
  });

Deno.test("reference imports expose two provided effective files", async () => {
  const importId = crypto.randomUUID();
  const classificationFile = importFileRow({
    import_id: importId,
    file_kind: "classification",
    sha256: "a".repeat(64),
    row_count: 497,
  });
  const segmentsFile = importFileRow({
    import_id: importId,
    file_kind: "segments_grids",
    sha256: "b".repeat(64),
    row_count: 12_635,
  });
  const row = importRow({
    id: importId,
    health_report: healthReport(classificationFile, segmentsFile),
  });
  const { db, executeCalls } = createFakeDb({
    imports: [row],
    executeResponses: [[classificationFile, segmentsFile], []],
  });

  const response = await listImports(db);

  assertEquals(executeCalls.length, 2);
  assertEquals(response.imports[0]?.files.map((file) => file.source), [
    "fourni",
    "fourni",
  ]);
  assertEquals(response.imports[0]?.files.map((file) => file.row_count), [
    497,
    12_635,
  ]);

  const detailDb = createFakeDb({
    imports: [row],
    executeResponses: [[classificationFile, segmentsFile], []],
  });
  const detail = await getPricingReferenceImport(
    detailDb.db,
    callerId,
    requestId,
    { import_id: importId },
  );

  assertEquals(detail.import.files.length, 2);
  assertEquals(detail.import.effective_files.map((file) => file.source), [
    "fourni",
    "fourni",
  ]);
});

Deno.test("reference imports resolve reused classification provenance", async () => {
  const sourceImportId = crypto.randomUUID();
  const currentImportId = crypto.randomUUID();
  const sourceCreatedAt = "2026-07-05T08:00:00.000Z";
  const sourceClassificationFile = importFileRow({
    import_id: sourceImportId,
    file_kind: "classification",
    sha256: "c".repeat(64),
    original_filename: "classification-source.xlsx",
    created_at: sourceCreatedAt,
  });
  const currentSegmentsFile = importFileRow({
    import_id: currentImportId,
    file_kind: "segments_grids",
    sha256: "d".repeat(64),
    original_filename: "segments-current.xlsx",
    row_count: 12_635,
  });
  const currentRow = importRow({
    id: currentImportId,
    created_at: "2026-07-06T08:00:00.000Z",
    analysis_started_at: "2026-07-06T08:02:00.000Z",
    health_report: healthReport(sourceClassificationFile, currentSegmentsFile),
  });
  const { db, executeCalls } = createFakeDb({
    imports: [currentRow],
    executeResponses: [[currentSegmentsFile], [{
      file_kind: "classification",
      sha256: sourceClassificationFile.sha256,
      import_id: sourceImportId,
      source_import_created_at: sourceCreatedAt,
      snapshot_created_at: "2026-07-05T08:01:00.000Z",
    }], []],
  });

  const response = await listImports(db);
  const files = response.imports[0]?.files ?? [];

  assertEquals(executeCalls.length, 3);
  assertEquals(files[0]?.file_kind, "classification");
  assertEquals(files[0]?.source, "reutilise");
  assertEquals(files[0]?.source_import_id, sourceImportId);
  assertEquals(files[0]?.source_import_created_at, sourceCreatedAt);
  assertEquals(files[1]?.file_kind, "segments_grids");
  assertEquals(files[1]?.source, "fourni");
});

Deno.test("reference imports expose no effective files for draft without file", async () => {
  const draft = importRow({
    status: "brouillon",
    analyzed_by: null,
    analysis_started_at: null,
    analysis_completed_at: null,
    health_report: null,
  });
  const { db, executeCalls } = createFakeDb({
    imports: [draft],
    executeResponses: [[], []],
  });

  const response = await listImports(db);

  assertEquals(executeCalls.length, 2);
  assertEquals(response.imports[0]?.status, "brouillon");
  assertEquals(response.imports[0]?.files, []);
});

Deno.test("reference imports expose attached files for analysis error imports", async () => {
  const importId = crypto.randomUUID();
  const failedStatus: PricingReferenceImportStatus = "analyse_erreur";
  const failedFile = importFileRow({
    import_id: importId,
    file_kind: "classification",
    sha256: "e".repeat(64),
    row_count: null,
  });
  const failedImport = importRow({
    id: importId,
    status: failedStatus,
    health_report: null,
    error_code: "parse_failed",
    error_message: "Analyse impossible.",
  });
  const { db, executeCalls } = createFakeDb({
    imports: [failedImport],
    executeResponses: [[failedFile], []],
  });

  const response = await listImports(db);

  assertEquals(executeCalls.length, 2);
  assertEquals(response.imports[0]?.status, failedStatus);
  assertEquals(response.imports[0]?.files, [{
    file_kind: "classification",
    original_filename: "classification.xlsx",
    size_bytes: 1024,
    sha256: "e".repeat(64),
    row_count: null,
    source: "fourni",
    source_import_id: null,
    source_import_created_at: null,
  }]);
});
