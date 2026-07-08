import { assertEquals } from "std/assert";
import * as XLSX from "xlsx";

import {
  PRICING_REFERENCE_MAX_FILE_SIZE_BYTES,
  pricingReferenceAnomaliesExportInputSchema,
  pricingReferenceAnomaliesExportResponseSchema,
  pricingReferenceAnomaliesListInputSchema,
  pricingReferenceAnomaliesListResponseSchema,
  pricingReferenceAnomaliesSummaryGetInputSchema,
  pricingReferenceAnomaliesSummaryResponseSchema,
  pricingReferenceClassificationListAllInputSchema,
  pricingReferenceClassificationListAllResponseSchema,
  pricingReferenceClassificationListInputSchema,
  pricingReferenceDiagnoseInputSchema,
  pricingReferenceDiagnoseResponseSchema,
  pricingReferenceDiffsComputeInputSchema,
  pricingReferenceDiffsComputeResponseSchema,
  pricingReferenceDiffsListInputSchema,
  pricingReferenceDiffsListResponseSchema,
  pricingReferenceDiffsSummaryGetInputSchema,
  pricingReferenceDiffsSummaryResponseSchema,
  pricingReferenceImportActivateInputSchema,
  pricingReferenceImportActivateResponseSchema,
  pricingReferenceImportAnalyzeInputSchema,
  pricingReferenceImportAssistMappingInputSchema,
  pricingReferenceImportAssistMappingResponseSchema,
  pricingReferenceImportConfirmMappingInputSchema,
  pricingReferenceImportGetResponseSchema,
  pricingReferenceImportInspectInputSchema,
  pricingReferenceImportsListInputSchema,
  pricingReferenceImportsListResponseSchema,
  pricingReferenceImportsPrepareInputSchema,
  pricingReferenceRowsListInputSchema,
  pricingReferenceSegmentsListInputSchema,
} from "../../../../shared/schemas/pricing/references.schema.ts";
import type { DbClient } from "../types.ts";
import {
  buildAnomaliesExportWorkbook,
  getPricingReferenceAnomaliesSummary,
  listAllPricingReferenceClassification,
  type PricingReferenceAnomalyQueryRow,
  type PricingReferenceExportSourceRow,
} from "../services/pricing/references/referenceImports.ts";

const readObject = (
  record: Record<string, unknown>,
  key: string,
): Record<string, unknown> | null => {
  const value = record[key];
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
};

const readString = (
  record: Record<string, unknown>,
  key: string,
): string | null => {
  const value = record[key];
  return typeof value === "string" ? value : null;
};

const readNumber = (
  record: Record<string, unknown>,
  key: string,
): number | null => {
  const value = record[key];
  return typeof value === "number" ? value : null;
};

const createExecuteOnlyDb = (
  responses: unknown[][],
): { db: DbClient; calls: unknown[] } => {
  const queue = [...responses];
  const calls: unknown[] = [];
  const db = {
    execute: (query: unknown) => {
      calls.push(query);
      return Promise.resolve(queue.shift() ?? []);
    },
  } as unknown as DbClient;
  return { db, calls };
};

const readErrorData = async (
  response: Response,
): Promise<Record<string, unknown>> => {
  const payload = (await response.json()) as Record<string, unknown>;
  const error = readObject(payload, "error");
  const data = error ? readObject(error, "data") : null;
  assertEquals(Boolean(data), true);
  return data as Record<string, unknown>;
};

Deno.test("pricing reference payload contracts are strict and bounded", () => {
  const preparePayload = {
    files: {
      classification: {
        original_filename: "classification.xlsx",
        size_bytes: 1024,
        sha256: "a".repeat(64),
        content_type:
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      },
      segments_grids: {
        original_filename: "segments.xlsx",
        size_bytes: PRICING_REFERENCE_MAX_FILE_SIZE_BYTES,
        sha256: "b".repeat(64),
      },
    },
  };

  assertEquals(
    pricingReferenceImportsPrepareInputSchema.safeParse(preparePayload).success,
    true,
  );
  assertEquals(
    pricingReferenceImportsPrepareInputSchema.safeParse({
      files: {
        classification: preparePayload.files.classification,
      },
    }).success,
    true,
  );
  assertEquals(
    pricingReferenceImportsPrepareInputSchema.safeParse({
      files: {
        segments_grids: preparePayload.files.segments_grids,
      },
    }).success,
    true,
  );
  assertEquals(
    pricingReferenceImportsPrepareInputSchema.safeParse({ files: {} }).success,
    false,
  );
  assertEquals(
    pricingReferenceImportsPrepareInputSchema.safeParse({
      ...preparePayload,
      extra: true,
    }).success,
    false,
  );
  assertEquals(
    pricingReferenceImportsPrepareInputSchema.safeParse({
      files: {
        ...preparePayload.files,
        classification: {
          ...preparePayload.files.classification,
          original_filename: "classification.xls",
        },
      },
    }).success,
    false,
  );
  assertEquals(
    pricingReferenceImportsPrepareInputSchema.safeParse({
      files: {
        ...preparePayload.files,
        segments_grids: {
          ...preparePayload.files.segments_grids,
          size_bytes: PRICING_REFERENCE_MAX_FILE_SIZE_BYTES + 1,
        },
      },
    }).success,
    false,
  );
});

Deno.test("pricing reference list and analyze contracts reject unsupported fields", () => {
  assertEquals(
    pricingReferenceImportsListInputSchema.safeParse({ page: 1, page_size: 50 })
      .success,
    true,
  );
  assertEquals(
    pricingReferenceImportsListInputSchema.safeParse({
      page: 1,
      page_size: 101,
    }).success,
    false,
  );
  assertEquals(
    pricingReferenceImportsListInputSchema.safeParse({
      page: 1,
      page_size: 50,
      activate: true,
    }).success,
    false,
  );
  assertEquals(
    pricingReferenceRowsListInputSchema.safeParse({
      page: 1,
      page_size: 50,
      search: "marque",
    }).success,
    true,
  );
  assertEquals(
    pricingReferenceClassificationListInputSchema.safeParse({
      page: 1,
      page_size: 50,
      search: "MEGA",
      filters: { mega: "10", fam: "20" },
      sort_by: "cir_key",
      sort_direction: "desc",
    }).success,
    true,
  );
  assertEquals(
    pricingReferenceClassificationListInputSchema.safeParse({
      page: 1,
      page_size: 50,
      filters: { mega: "10", unknown: "x" },
    }).success,
    false,
  );
  assertEquals(
    pricingReferenceSegmentsListInputSchema.safeParse({
      page: 1,
      page_size: 50,
      filters: {
        marque: "SKF",
        cat_fab: "ROULEMENT",
        link_status: "complete_valid",
      },
      sort_by: "purchase_grid_rows_count",
      sort_direction: "desc",
    }).success,
    true,
  );
  assertEquals(
    pricingReferenceSegmentsListInputSchema.safeParse({
      page: 1,
      page_size: 50,
      filters: { link_status: "active" },
    }).success,
    false,
  );
  assertEquals(
    pricingReferenceAnomaliesListInputSchema.safeParse({
      page: 1,
      page_size: 50,
      severities: ["haute"],
      types: ["purchase_grid_missing"],
      marques: ["BOSCH"],
      sort_by: "severity",
      sort_direction: "asc",
    }).success,
    true,
  );
  assertEquals(
    pricingReferenceAnomaliesListInputSchema.safeParse({
      page: 1,
      page_size: 50,
      severities: Array(21).fill("haute"),
    }).success,
    false,
  );
  assertEquals(
    pricingReferenceAnomaliesListInputSchema.safeParse({
      page: 1,
      page_size: 50,
      types: Array(21).fill("purchase_grid_missing"),
    }).success,
    false,
  );
  assertEquals(
    pricingReferenceAnomaliesListInputSchema.safeParse({
      page: 1,
      page_size: 50,
      marques: Array(21).fill("BOSCH"),
    }).success,
    false,
  );
  assertEquals(
    pricingReferenceAnomaliesListInputSchema.safeParse({
      page: 1,
      page_size: 50,
      severity: "haute",
    }).success,
    false,
  );
  assertEquals(
    pricingReferenceAnomaliesListInputSchema.safeParse({
      page: 1,
      page_size: 50,
      sort_by: "activation",
    }).success,
    false,
  );
  assertEquals(
    pricingReferenceRowsListInputSchema.safeParse({
      page: 1,
      page_size: 50,
      search: "x".repeat(121),
    }).success,
    false,
  );
  assertEquals(
    pricingReferenceAnomaliesListResponseSchema.safeParse({
      ok: true,
      rows: [{
        id: "11111111-1111-4111-8111-111111111111",
        import_id: "22222222-2222-4222-8222-222222222222",
        snapshot_id: "33333333-3333-4333-8333-333333333333",
        source_file_id: "44444444-4444-4444-8444-444444444444",
        source_file: {
          file_kind: "segments_grids",
          original_filename: "segments.xlsx",
        },
        source_row_number: 8,
        type: "purchase_grid_missing",
        severity: "moyenne",
        object_type: null,
        object_id: null,
        columns: ["NUM_FOUR"],
        message: "Champ grille achat structurel manquant.",
        details: { raw_values: { MARQUE: "BOSCH" } },
        created_at: "2026-06-22T10:06:00.000Z",
      }],
      page: 1,
      page_size: 50,
      total: 1,
    }).success,
    true,
  );
  assertEquals(
    pricingReferenceAnomaliesListResponseSchema.safeParse({
      ok: true,
      rows: [{
        id: "11111111-1111-4111-8111-111111111111",
        import_id: "22222222-2222-4222-8222-222222222222",
        snapshot_id: null,
        source_file_id: null,
        source_file: null,
        source_row_number: null,
        type: "purchase_grid_missing",
        severity: "moyenne",
        object_type: null,
        object_id: null,
        columns: [],
        message: "Champ grille achat structurel manquant.",
        details: {},
        created_at: "2026-06-22T10:06:00.000Z",
        status: "nouvelle",
      }],
      page: 1,
      page_size: 50,
      total: 1,
    }).success,
    false,
  );
  assertEquals(
    pricingReferenceImportAnalyzeInputSchema.safeParse({
      import_id: "11111111-1111-4111-8111-111111111111",
    }).success,
    true,
  );
  assertEquals(
    pricingReferenceImportAnalyzeInputSchema.safeParse({
      import_id: "11111111-1111-4111-8111-111111111111",
      activate: true,
    }).success,
    false,
  );
  assertEquals(
    pricingReferenceImportActivateInputSchema.safeParse({
      import_id: "11111111-1111-4111-8111-111111111111",
    }).success,
    true,
  );
  assertEquals(
    pricingReferenceImportActivateInputSchema.safeParse({
      import_id: "11111111-1111-4111-8111-111111111111",
      force: true,
    }).success,
    false,
  );
  assertEquals(
    pricingReferenceImportActivateResponseSchema.safeParse({
      ok: true,
      request_id: "request-1",
      import_id: "11111111-1111-4111-8111-111111111111",
      snapshot_id: "22222222-2222-4222-8222-222222222222",
      activated_at: "2026-07-07T06:40:00.000Z",
      previous_snapshot_id: null,
      previous_deactivated_at: null,
    }).success,
    true,
  );
  assertEquals(
    pricingReferenceImportActivateResponseSchema.safeParse({
      ok: true,
      request_id: "request-1",
      import_id: "11111111-1111-4111-8111-111111111111",
      snapshot_id: "22222222-2222-4222-8222-222222222222",
      activated_at: "2026-07-07T06:40:00.000Z",
      previous_snapshot_id: null,
      previous_deactivated_at: null,
      import_status: "archive",
    }).success,
    false,
  );
});

Deno.test("pricing reference import responses expose effective files distinctly", () => {
  const importId = crypto.randomUUID();
  const fileId = crypto.randomUUID();
  const sourceImportId = crypto.randomUUID();
  const effectiveFile = {
    file_kind: "classification",
    original_filename: "classification.xlsx",
    size_bytes: 1024,
    sha256: "a".repeat(64),
    row_count: 497,
    source: "reutilise",
    source_import_id: sourceImportId,
    source_import_created_at: "2026-07-05T08:00:00.000Z",
  };
  const summary = {
    id: importId,
    status: "analyse_ok",
    created_by: null,
    analyzed_by: crypto.randomUUID(),
    created_at: "2026-07-06T08:00:00.000Z",
    updated_at: "2026-07-06T08:01:00.000Z",
    analysis_started_at: "2026-07-06T08:00:10.000Z",
    analysis_completed_at: "2026-07-06T08:01:00.000Z",
    error_code: null,
    error_message: null,
    classification_rows_count: 497,
    segments_rows_count: 12_635,
    anomalies_total: 0,
    is_active_version: true,
    snapshot_status: "actif",
    activated_at: "2026-07-06T08:02:00.000Z",
    deactivated_at: null,
    files: [effectiveFile],
  };
  const attachedFile = {
    id: fileId,
    import_id: importId,
    file_kind: "segments_grids",
    original_filename: "segments.xlsx",
    storage_bucket: "pricing-reference-sources",
    storage_path: "imports/2026-07-06/segments.xlsx",
    size_bytes: 2048,
    sha256: "b".repeat(64),
    content_type: null,
    sheet_name: null,
    detected_columns: [],
    row_count: 12_635,
    mapping_profile_id: null,
    column_mapping: {},
    mapping_status: "confirme",
    mapping_confirmed_by: null,
    mapping_confirmed_at: null,
    created_at: "2026-07-06T08:00:20.000Z",
  };

  assertEquals(
    pricingReferenceImportsListResponseSchema.safeParse({
      ok: true,
      imports: [summary],
      page: 1,
      page_size: 50,
      total: 1,
    }).success,
    true,
  );
  assertEquals(
    pricingReferenceImportsListResponseSchema.safeParse({
      ok: true,
      imports: [{ ...summary, files: undefined }],
      page: 1,
      page_size: 50,
      total: 1,
    }).success,
    false,
  );
  assertEquals(
    pricingReferenceImportGetResponseSchema.safeParse({
      ok: true,
      import: {
        ...summary,
        files: [attachedFile],
        effective_files: [effectiveFile],
        health_report: null,
      },
    }).success,
    true,
  );
  assertEquals(
    pricingReferenceImportGetResponseSchema.safeParse({
      ok: true,
      import: {
        ...summary,
        files: [attachedFile],
        effective_files: [{ ...effectiveFile, source: "ancien" }],
        health_report: null,
      },
    }).success,
    false,
  );
});

Deno.test("pricing reference summary and listAll contracts are strict", () => {
  assertEquals(
    pricingReferenceAnomaliesSummaryGetInputSchema.safeParse({}).success,
    true,
  );
  assertEquals(
    pricingReferenceAnomaliesSummaryGetInputSchema.safeParse({
      import_id: "11111111-1111-4111-8111-111111111111",
    }).success,
    true,
  );
  assertEquals(
    pricingReferenceAnomaliesSummaryGetInputSchema.safeParse({
      search: "segment",
      severities: ["haute"],
      types: ["purchase_grid_missing"],
      marques: ["BOSCH"],
    }).success,
    true,
  );
  assertEquals(
    pricingReferenceAnomaliesSummaryGetInputSchema.safeParse({
      page: 1,
    }).success,
    false,
  );
  assertEquals(
    pricingReferenceAnomaliesListInputSchema.safeParse({
      page: 1,
      page_size: 50,
      marques: ["BOSCH"],
      types: ["purchase_grid_missing"],
    }).success,
    true,
  );
  assertEquals(
    pricingReferenceAnomaliesListInputSchema.safeParse({
      page: 1,
      page_size: 50,
      marques: [""],
    }).success,
    false,
  );
  assertEquals(
    pricingReferenceAnomaliesExportInputSchema.safeParse({
      search: "segment",
      severities: ["moyenne"],
      types: ["purchase_grid_missing"],
      marques: ["BOSCH"],
    }).success,
    true,
  );
  assertEquals(
    pricingReferenceAnomaliesExportInputSchema.safeParse({
      page: 1,
    }).success,
    false,
  );
  assertEquals(
    pricingReferenceAnomaliesSummaryResponseSchema.safeParse({
      ok: true,
      total: 3,
      groups_by_type: [{
        type: "purchase_grid_missing",
        label: "Grille achat incomplete",
        action_label:
          "Completer les champs de grille achat structurels dans le fichier source.",
        count: 3,
        max_severity: "haute",
      }],
      facets: {
        severities: [{
          value: "haute",
          label: "Haute",
          count: 3,
          max_severity: "haute",
        }],
        types: [{
          value: "purchase_grid_missing",
          label: "Grille achat incomplete",
          count: 3,
          max_severity: "haute",
        }],
        marques: [{
          value: "BOSCH",
          label: "BOSCH",
          count: 3,
          max_severity: "haute",
        }],
      },
    }).success,
    true,
  );
  assertEquals(
    pricingReferenceAnomaliesSummaryResponseSchema.safeParse({
      ok: true,
      total: 3,
      marques: [{
        marque: "BOSCH",
        max_severity: "haute",
        types: [{
          type: "purchase_grid_missing",
          max_severity: "haute",
        }],
      }],
    }).success,
    false,
  );
  assertEquals(
    pricingReferenceAnomaliesExportResponseSchema.safeParse({
      ok: true,
      request_id: "request-1",
      files: [{
        file_kind: "classification",
        download_url: "https://example.test/classification.xlsx",
        expires_at: "2026-06-22T11:08:00.000Z",
        filename: "anomalies-classification.xlsx",
        row_count: 1,
      }, {
        file_kind: "segments_grids",
        download_url: "https://example.test/segments.xlsx",
        expires_at: "2026-06-22T11:08:00.000Z",
        filename: "anomalies-segments-grilles.xlsx",
        row_count: 2,
      }],
      row_count: 3,
    }).success,
    true,
  );
  assertEquals(
    pricingReferenceAnomaliesExportResponseSchema.safeParse({
      ok: true,
      request_id: "request-1",
      download_url: "https://example.test/legacy.xlsx",
      expires_at: "2026-06-22T11:08:00.000Z",
      filename: "anomalies.xlsx",
      row_count: 1,
    }).success,
    false,
  );
  assertEquals(
    pricingReferenceAnomaliesExportResponseSchema.safeParse({
      ok: true,
      request_id: "request-1",
      files: [{
        file_kind: "classification",
        download_url: "https://example.test/export.xlsx",
        expires_at: "2026-06-22T11:08:00.000Z",
        filename: "anomalies.xlsx",
        row_count: -1,
      }],
      row_count: -1,
    }).success,
    false,
  );
  assertEquals(
    pricingReferenceClassificationListAllInputSchema.safeParse({}).success,
    true,
  );
  assertEquals(
    pricingReferenceClassificationListAllInputSchema.safeParse({
      search: "abc",
    }).success,
    false,
  );
  assertEquals(
    pricingReferenceClassificationListAllResponseSchema.safeParse({
      ok: true,
      total: 1,
      truncated: false,
      rows: [{
        id: "11111111-1111-4111-8111-111111111111",
        snapshot_id: "33333333-3333-4333-8333-333333333333",
        import_id: "22222222-2222-4222-8222-222222222222",
        source_row_number: 2,
        cir_key: "9_20_99",
        mega: "9",
        fam: "20",
        sfa: "99",
        mega_lib: "Outillage",
        fam_lib: "Outillage a main",
        sfa_lib: "Divers",
      }],
    }).success,
    true,
  );
  assertEquals(
    pricingReferenceClassificationListAllResponseSchema.safeParse({
      ok: true,
      total: 0,
      rows: [],
    }).success,
    false,
  );
});

Deno.test("pricing reference diff contracts are strict and cache-aware", () => {
  const baseId = "11111111-1111-4111-8111-111111111111";
  const targetId = "22222222-2222-4222-8222-222222222222";
  const runId = "33333333-3333-4333-8333-333333333333";
  const summaryResponse = {
    ok: true,
    request_id: "request-1",
    run_id: runId,
    base_snapshot_id: baseId,
    target_snapshot_id: targetId,
    status: "computed",
    initial_import: false,
    skipped_file_kinds: ["classification"],
    computed_at: "2026-07-06T18:45:00.000Z",
    total: 2,
    counts_by_type: [{
      object_type: "grille",
      diff_type: "modifie",
      count: 1,
    }],
    counts_by_object_type: [{
      object_type: "grille",
      total: 1,
      by_severity: [{ severity: "moyenne", count: 1 }],
    }],
    changed_columns: [{ column: "remise_ha", count: 1 }],
    financial_changes_count: 1,
    deviation_alerts: [{
      object_type: "segment",
      base_count: 10,
      deleted_count: 3,
      suppression_rate: 0.3,
      severity: "haute",
      message: "Suppressions importantes sur Segment: 3/10.",
    }],
    snapshot_counters: {
      base: {
        classifications: 1,
        segments: 10,
        liaisons: 10,
        grilles: 12,
        anomalies: 0,
      },
      target: {
        classifications: 1,
        segments: 7,
        liaisons: 7,
        grilles: 11,
        anomalies: 1,
      },
    },
  };
  const diffRow = {
    id: "44444444-4444-4444-8444-444444444444",
    base_snapshot_id: baseId,
    target_snapshot_id: targetId,
    diff_type: "modifie",
    object_type: "grille",
    object_key: "SEG|FOUR|1|A|2026-01-01|2026-12-31",
    severity: "moyenne",
    changed_columns: ["remise_ha"],
    payload: {
      changed_columns: ["remise_ha"],
      before: { remise_ha: "12" },
      after: { remise_ha: "14" },
      labels: { segment_key: "SEG", marque: "BOSCH" },
      source_row_numbers: { before: [10], after: [12] },
      identity_note: "Identite grille.",
    },
    created_at: "2026-07-06T18:45:01.000Z",
  };

  assertEquals(
    pricingReferenceDiffsSummaryGetInputSchema.safeParse({
      target_snapshot_id: targetId,
    }).success,
    true,
  );
  assertEquals(
    pricingReferenceDiffsSummaryGetInputSchema.safeParse({}).success,
    false,
  );
  assertEquals(
    pricingReferenceDiffsListInputSchema.safeParse({
      run_id: runId,
      page: 1,
      page_size: 50,
      object_types: ["grille"],
      diff_types: ["modifie"],
      changed_columns: ["remise_ha"],
      marques: ["BOSCH"],
      sort_by: "severity",
      sort_direction: "desc",
    }).success,
    true,
  );
  assertEquals(
    pricingReferenceDiffsListInputSchema.safeParse({
      page: 1,
      page_size: 50,
    }).success,
    false,
  );
  assertEquals(
    pricingReferenceDiffsComputeInputSchema.safeParse({
      target_snapshot_id: targetId,
      base_snapshot_id: null,
      force: true,
    }).success,
    true,
  );
  assertEquals(
    pricingReferenceDiffsComputeInputSchema.safeParse({
      target_snapshot_id: targetId,
      activate_snapshot: true,
    }).success,
    false,
  );
  assertEquals(
    pricingReferenceDiffsSummaryResponseSchema.safeParse(summaryResponse)
      .success,
    true,
  );
  assertEquals(
    pricingReferenceDiffsComputeResponseSchema.safeParse({
      ...summaryResponse,
      cache_status: "computed",
    }).success,
    true,
  );
  assertEquals(
    pricingReferenceDiffsListResponseSchema.safeParse({
      ok: true,
      request_id: "request-1",
      run_id: runId,
      base_snapshot_id: baseId,
      target_snapshot_id: targetId,
      rows: [diffRow],
      total: 1,
    }).success,
    true,
  );
  assertEquals(
    pricingReferenceDiffsListResponseSchema.safeParse({
      ok: true,
      request_id: "request-1",
      run_id: runId,
      base_snapshot_id: baseId,
      target_snapshot_id: targetId,
      rows: [{ ...diffRow, payload: { changed_columns: ["remise_ha"] } }],
      total: 1,
    }).success,
    false,
  );
});

Deno.test("pricing reference classification listAll returns a real total when capped", async () => {
  const rows = [{
    id: "11111111-1111-4111-8111-111111111111",
    snapshot_id: "33333333-3333-4333-8333-333333333333",
    import_id: "22222222-2222-4222-8222-222222222222",
    source_row_number: 2,
    cir_key: "9_20_99",
    mega: "9",
    fam: "20",
    sfa: "99",
    mega_lib: "Outillage",
    fam_lib: "Outillage a main",
    sfa_lib: "Divers",
  }];
  const { db, calls } = createExecuteOnlyDb([
    rows,
    [{ total: 5001 }],
  ]);

  const response = await listAllPricingReferenceClassification(
    db,
    "user-1",
    "request-1",
    {
      snapshot_id: "33333333-3333-4333-8333-333333333333",
    },
  );

  assertEquals(calls.length, 2);
  assertEquals(response.rows.length, 1);
  assertEquals(response.total, 5001);
  assertEquals(response.truncated, true);
});

Deno.test("pricing reference anomaly export keeps complete source rows and annotates matching anomalies", () => {
  const sourceRows: PricingReferenceExportSourceRow[] = [
    {
      file_kind: "classification",
      source_row_number: 2,
      raw_values: {
        MEGA: "9",
        FAM: "20",
        SFA: "99",
        MEGA_LIB: "Outillage",
        FAM_LIB: "Outillage a main",
        SFA_LIB: "Divers",
      },
    },
    {
      file_kind: "classification",
      source_row_number: 3,
      raw_values: {
        MEGA: "10",
        FAM: "30",
        SFA: "01",
        MEGA_LIB: "Quincaillerie",
        FAM_LIB: "Fixation",
        SFA_LIB: "Visserie",
      },
    },
  ];
  const anomalyRows: PricingReferenceAnomalyQueryRow[] = [{
    id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    import_id: "22222222-2222-4222-8222-222222222222",
    snapshot_id: "33333333-3333-4333-8333-333333333333",
    source_file_id: "44444444-4444-4444-8444-444444444444",
    source_file: {
      file_kind: "classification",
      original_filename: "classification.xlsx",
    },
    source_row_number: 2,
    type: "classification_required_empty",
    severity: "bloquante",
    object_type: null,
    object_id: null,
    columns: ["FAM_LIB"],
    message: "Champ obligatoire vide dans la classification CIR.",
    details: {},
    created_at: "2026-06-22T11:08:00.000Z",
  }];

  const workbook = XLSX.read(
    buildAnomaliesExportWorkbook(sourceRows, anomalyRows),
    { type: "array" },
  );
  const worksheet = workbook.Sheets.Classification;
  assertEquals(Boolean(worksheet), true);
  const rows = XLSX.utils.sheet_to_json<Record<string, string | number>>(
    worksheet,
  );

  assertEquals(rows.length, 2);
  assertEquals(rows[0]?.MEGA, "9");
  assertEquals(rows[0]?.TYPE_ANOMALIE, "Champ classification vide");
  assertEquals(
    rows[0]?.ACTION_CORRECTION,
    "Completer les champs classification obligatoires dans Excel.",
  );
  assertEquals(rows[1]?.MEGA, "10");
  const headerRow =
    XLSX.utils.sheet_to_json<string[]>(worksheet, { header: 1 })[0] ?? [];
  assertEquals(headerRow, [
    "MEGA",
    "FAM",
    "SFA",
    "MEGA_LIB",
    "FAM_LIB",
    "SFA_LIB",
    "TYPE_ANOMALIE",
    "ACTION_CORRECTION",
  ]);
  assertEquals(worksheet?.["!autofilter"]?.ref, "A1:H3");
});

Deno.test("pricing reference anomalies summary aggregates faceted counts", async () => {
  const { db } = createExecuteOnlyDb([
    [{ total: 4 }],
    [
      {
        type: "segment_classification_unknown",
        count: 1,
        max_severity_weight: 4,
      },
      { type: "invalid_file", count: 1, max_severity_weight: 3 },
      { type: "purchase_grid_missing", count: 2, max_severity_weight: 2 },
    ],
    [
      { value: "bloquante", count: 1, max_severity_weight: 4 },
      { value: "haute", count: 1, max_severity_weight: 3 },
      { value: "moyenne", count: 2, max_severity_weight: 2 },
    ],
    [
      {
        value: "segment_classification_unknown",
        count: 1,
        max_severity_weight: 4,
      },
      { value: "invalid_file", count: 1, max_severity_weight: 3 },
      { value: "purchase_grid_missing", count: 2, max_severity_weight: 2 },
    ],
    [
      { value: "BOSCH", count: 3, max_severity_weight: 4 },
      { value: "Général", count: 1, max_severity_weight: 3 },
    ],
  ]);

  const response = await getPricingReferenceAnomaliesSummary(
    db,
    "user-1",
    "request-1",
    {
      snapshot_id: "33333333-3333-4333-8333-333333333333",
    },
  );

  assertEquals(response.total, 4);
  assertEquals(response.groups_by_type, [
    {
      type: "segment_classification_unknown",
      label: "Cle CIR inconnue",
      action_label:
        "Corriger la cle CIR ou importer la classification correspondante.",
      count: 1,
      max_severity: "bloquante",
    },
    {
      type: "invalid_file",
      label: "Fichier invalide",
      action_label: "Remplacer le fichier par un export Excel valide.",
      count: 1,
      max_severity: "haute",
    },
    {
      type: "purchase_grid_missing",
      label: "Grille achat incomplete",
      action_label:
        "Completer les champs de grille achat structurels dans le fichier source.",
      count: 2,
      max_severity: "moyenne",
    },
  ]);
  assertEquals(response.facets.severities, [
    {
      value: "bloquante",
      label: "Bloquante",
      count: 1,
      max_severity: "bloquante",
    },
    { value: "haute", label: "Haute", count: 1, max_severity: "haute" },
    { value: "moyenne", label: "Moyenne", count: 2, max_severity: "moyenne" },
  ]);
  assertEquals(response.facets.marques, [
    { value: "BOSCH", label: "BOSCH", count: 3, max_severity: "bloquante" },
    { value: "Général", label: "Général", count: 1, max_severity: "haute" },
  ]);
});

Deno.test("pricing reference column mapping contracts are strict", () => {
  const inspectPayload = {
    import_id: "11111111-1111-4111-8111-111111111111",
    file_id: "22222222-2222-4222-8222-222222222222",
    file_kind: "classification",
    sheet_name: "Feuil1",
  };

  assertEquals(
    pricingReferenceImportInspectInputSchema.safeParse(inspectPayload).success,
    true,
  );
  assertEquals(
    pricingReferenceImportInspectInputSchema.safeParse({
      ...inspectPayload,
      unknown: true,
    }).success,
    false,
  );
  assertEquals(
    pricingReferenceImportInspectInputSchema.safeParse({
      ...inspectPayload,
      file_kind: "supplier_prices",
    }).success,
    false,
  );

  const confirmPayload = {
    import_id: "11111111-1111-4111-8111-111111111111",
    file_id: "22222222-2222-4222-8222-222222222222",
    file_kind: "classification",
    sheet_name: "Feuil1",
    column_mapping: {
      MEGA: "Mega",
      FAM: "Famille",
      SFA: "Sous famille",
      MEGA_LIB: "Libelle mega",
      FAM_LIB: "Libelle famille",
      SFA_LIB: "Libelle sous famille",
    },
    save_as_default: true,
  };

  assertEquals(
    pricingReferenceImportConfirmMappingInputSchema.safeParse(confirmPayload)
      .success,
    true,
  );
  assertEquals(
    pricingReferenceImportConfirmMappingInputSchema.safeParse({
      ...confirmPayload,
      activate_snapshot: true,
    }).success,
    false,
  );
  assertEquals(
    pricingReferenceImportConfirmMappingInputSchema.safeParse({
      ...confirmPayload,
      column_mapping: {
        ...confirmPayload.column_mapping,
        UNKNOWN: "Colonne inconnue",
      },
    }).success,
    false,
  );
  assertEquals(
    pricingReferenceImportConfirmMappingInputSchema.safeParse({
      ...confirmPayload,
      column_mapping: {
        ...confirmPayload.column_mapping,
        MEGA: "",
      },
    }).success,
    false,
  );
});

Deno.test("pricing reference tRPC namespace is protected and activate requires super admin auth", async () => {
  const appModule = await import("../app.ts");
  const prepareResponse = await appModule.default.request(
    "/trpc/pricing.references.imports.prepare",
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        files: {
          classification: {
            original_filename: "classification.xlsx",
            size_bytes: 1024,
            sha256: "a".repeat(64),
          },
          segments_grids: {
            original_filename: "segments.xlsx",
            size_bytes: 1024,
            sha256: "b".repeat(64),
          },
        },
      }),
    },
  );

  const prepareError = await readErrorData(prepareResponse);
  assertEquals(prepareResponse.status, 401);
  assertEquals(readString(prepareError, "appCode"), "AUTH_REQUIRED");

  const healthResponse = await appModule.default.request(
    "/trpc/pricing.references.health.get",
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        import_id: "11111111-1111-4111-8111-111111111111",
      }),
    },
  );
  const healthError = await readErrorData(healthResponse);
  assertEquals(healthResponse.status, 401);
  assertEquals(readString(healthError, "appCode"), "AUTH_REQUIRED");

  const diffSummaryResponse = await appModule.default.request(
    "/trpc/pricing.references.diffs.summary",
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        target_snapshot_id: "22222222-2222-4222-8222-222222222222",
      }),
    },
  );
  const diffSummaryError = await readErrorData(diffSummaryResponse);
  assertEquals(diffSummaryResponse.status, 401);
  assertEquals(readString(diffSummaryError, "appCode"), "AUTH_REQUIRED");

  const diffComputeResponse = await appModule.default.request(
    "/trpc/pricing.references.diffs.compute",
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        target_snapshot_id: "22222222-2222-4222-8222-222222222222",
      }),
    },
  );
  const diffComputeError = await readErrorData(diffComputeResponse);
  assertEquals(diffComputeResponse.status, 401);
  assertEquals(readString(diffComputeError, "appCode"), "AUTH_REQUIRED");

  const activateResponse = await appModule.default.request(
    "/trpc/pricing.references.imports.activate",
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "{}",
    },
  );
  const activateError = await readErrorData(activateResponse);
  assertEquals(activateResponse.status, 401);
  assertEquals(readString(activateError, "appCode"), "AUTH_REQUIRED");
  assertEquals(readNumber(activateError, "httpStatus"), 401);
});

Deno.test("pricing reference diagnose contract validates correct structure", () => {
  const validPayload = {
    import_id: crypto.randomUUID(),
    file_type: "classification",
    prompt_version_id: crypto.randomUUID(),
    model_config_id: crypto.randomUUID(),
  };

  assertEquals(
    pricingReferenceDiagnoseInputSchema.safeParse(validPayload).success,
    true,
  );
  assertEquals(
    pricingReferenceDiagnoseInputSchema.safeParse({
      file_type: "segments_grids",
    }).success,
    true,
  );
  assertEquals(
    pricingReferenceDiagnoseInputSchema.safeParse({
      ...validPayload,
      apiKey: "sk-test-key",
    }).success,
    false,
  );
  assertEquals(
    pricingReferenceDiagnoseInputSchema.safeParse({
      ...validPayload,
      inputCostPerMillion: 0.075,
    }).success,
    false,
  );

  const validResponse = {
    ok: true,
    ai_available: true,
    result: {
      summary: "Anomalies a prioriser.",
      priority_anomalies: [{
        title: "Cle inconnue",
        severity: "haute",
        evidence: "Une cle CIR absente de la classification.",
        recommendation: "Verifier la cle dans le fichier source.",
      }],
      recommendations: ["Traiter les cles inconnues avant activation."],
      limits: ["Analyse limitee au rapport de sante fourni."],
      confidence: 0.82,
    },
    usage: {
      provider: "openrouter",
      model_id: "deepseek/deepseek-v4-pro",
      input_tokens: 100,
      output_tokens: 40,
      cached_input_tokens: 0,
      reasoning_tokens: 0,
    },
    cost: { amount: null, currency: "USD", priced: false },
    cache: { hit: false },
  };

  assertEquals(
    pricingReferenceDiagnoseResponseSchema.safeParse(validResponse).success,
    true,
  );
  assertEquals(
    pricingReferenceDiagnoseResponseSchema.safeParse({
      ...validResponse,
      result: { ...validResponse.result, confidence: 2 },
    }).success,
    false,
  );
});

Deno.test("pricing reference assist mapping contracts are strict", () => {
  const scope = {
    import_id: "11111111-1111-4111-8111-111111111111",
  };
  const assistInput = {
    import_id: scope.import_id,
    file_id: "33333333-3333-4333-8333-333333333333",
    file_kind: "segments_grids",
    sheet_name: "Segments",
  };
  assertEquals(
    pricingReferenceImportAssistMappingInputSchema.safeParse(assistInput)
      .success,
    true,
  );
  assertEquals(
    pricingReferenceImportAssistMappingInputSchema.safeParse({
      ...assistInput,
      confirmMapping: true,
    }).success,
    false,
  );
  assertEquals(
    pricingReferenceImportAssistMappingResponseSchema.safeParse({
      ok: true,
      import_id: scope.import_id,
      file_id: assistInput.file_id,
      file_kind: "segments_grids",
      sheet_name: "Segments",
      mapping_status: "a_confirmer",
      ai_needed: true,
      human_validation_required: true,
      worksheet_score: 0.8,
      header_quality: 0.72,
      expected_columns: ["SEGMENT"],
      detected_columns: ["Segment"],
      candidates: [{
        canonical_column: "SEGMENT",
        source_column: "Segment",
        status: "a_confirmer",
        confidence: 0.82,
        reason: "Similarite forte.",
      }],
      proposed_mapping: { SEGMENT: "Segment" },
      evidence: ["1/1 colonne(s) mappees par le moteur deterministe."],
      ai_policy: {
        trigger: "ambiguous_or_invalid_only",
        response_schema: "strict_mapping_candidate",
        can_confirm_mapping: false,
      },
    }).success,
    true,
  );
});
