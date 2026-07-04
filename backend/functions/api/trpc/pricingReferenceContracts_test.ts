import { assertEquals } from 'std/assert';

import {
  PRICING_REFERENCE_MAX_FILE_SIZE_BYTES,
  pricingReferenceAnomaliesListInputSchema,
  pricingReferenceAnomaliesListResponseSchema,
  pricingReferenceBatchCorrectionProposalsResponseSchema,
  pricingReferenceClassificationListInputSchema,
  pricingReferenceCorrectionPlanGetInputSchema,
  pricingReferenceCorrectionPlanResponseSchema,
  pricingReferenceDiagnoseInputSchema,
  pricingReferenceDiagnoseResponseSchema,
  pricingReferenceImportAssistMappingInputSchema,
  pricingReferenceImportAssistMappingResponseSchema,
  pricingReferenceImportAnalyzeInputSchema,
  pricingReferenceImportConfirmMappingInputSchema,
  pricingReferenceImportInspectInputSchema,
  pricingReferenceImportsListInputSchema,
  pricingReferenceImportsPrepareInputSchema,
  pricingReferenceRowsListInputSchema,
  pricingReferenceSegmentsListInputSchema
} from '../../../../shared/schemas/pricing/references.schema.ts';
import { buildPricingReferenceCorrectionPlanFromRows } from '../services/pricing/references/referenceImports.ts';

const readObject = (record: Record<string, unknown>, key: string): Record<string, unknown> | null => {
  const value = record[key];
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
};

const readString = (record: Record<string, unknown>, key: string): string | null => {
  const value = record[key];
  return typeof value === 'string' ? value : null;
};

const readNumber = (record: Record<string, unknown>, key: string): number | null => {
  const value = record[key];
  return typeof value === 'number' ? value : null;
};

const readErrorData = async (response: Response): Promise<Record<string, unknown>> => {
  const payload = (await response.json()) as Record<string, unknown>;
  const error = readObject(payload, 'error');
  const data = error ? readObject(error, 'data') : null;
  assertEquals(Boolean(data), true);
  return data as Record<string, unknown>;
};

Deno.test('pricing reference payload contracts are strict and bounded', () => {
  const preparePayload = {
    files: {
      classification: {
        original_filename: 'classification.xlsx',
        size_bytes: 1024,
        sha256: 'a'.repeat(64),
        content_type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      },
      segments_grids: {
        original_filename: 'segments.xlsx',
        size_bytes: PRICING_REFERENCE_MAX_FILE_SIZE_BYTES,
        sha256: 'b'.repeat(64)
      }
    }
  };

  assertEquals(pricingReferenceImportsPrepareInputSchema.safeParse(preparePayload).success, true);
  assertEquals(pricingReferenceImportsPrepareInputSchema.safeParse({
    files: {
      classification: preparePayload.files.classification
    }
  }).success, true);
  assertEquals(pricingReferenceImportsPrepareInputSchema.safeParse({
    files: {
      segments_grids: preparePayload.files.segments_grids
    }
  }).success, true);
  assertEquals(pricingReferenceImportsPrepareInputSchema.safeParse({ files: {} }).success, false);
  assertEquals(pricingReferenceImportsPrepareInputSchema.safeParse({ ...preparePayload, extra: true }).success, false);
  assertEquals(pricingReferenceImportsPrepareInputSchema.safeParse({
    files: {
      ...preparePayload.files,
      classification: {
        ...preparePayload.files.classification,
        original_filename: 'classification.xls'
      }
    }
  }).success, false);
  assertEquals(pricingReferenceImportsPrepareInputSchema.safeParse({
    files: {
      ...preparePayload.files,
      segments_grids: {
        ...preparePayload.files.segments_grids,
        size_bytes: PRICING_REFERENCE_MAX_FILE_SIZE_BYTES + 1
      }
    }
  }).success, false);
});

Deno.test('pricing reference list and analyze contracts reject unsupported fields', () => {
  assertEquals(pricingReferenceImportsListInputSchema.safeParse({ page: 1, page_size: 50 }).success, true);
  assertEquals(pricingReferenceImportsListInputSchema.safeParse({ page: 1, page_size: 101 }).success, false);
  assertEquals(pricingReferenceImportsListInputSchema.safeParse({ page: 1, page_size: 50, activate: true }).success, false);
  assertEquals(pricingReferenceRowsListInputSchema.safeParse({
    page: 1,
    page_size: 50,
    search: 'marque'
  }).success, true);
  assertEquals(pricingReferenceClassificationListInputSchema.safeParse({
    page: 1,
    page_size: 50,
    search: 'MEGA',
    filters: { mega: '10', fam: '20' },
    sort_by: 'cir_key',
    sort_direction: 'desc'
  }).success, true);
  assertEquals(pricingReferenceClassificationListInputSchema.safeParse({
    page: 1,
    page_size: 50,
    filters: { mega: '10', unknown: 'x' }
  }).success, false);
  assertEquals(pricingReferenceSegmentsListInputSchema.safeParse({
    page: 1,
    page_size: 50,
    filters: { marque: 'SKF', cat_fab: 'ROULEMENT', link_status: 'complete_valid' },
    sort_by: 'purchase_grid_rows_count',
    sort_direction: 'desc'
  }).success, true);
  assertEquals(pricingReferenceSegmentsListInputSchema.safeParse({
    page: 1,
    page_size: 50,
    filters: { link_status: 'active' }
  }).success, false);
  assertEquals(pricingReferenceAnomaliesListInputSchema.safeParse({
    page: 1,
    page_size: 50,
    severity: 'haute',
    sort_by: 'severity',
    sort_direction: 'asc'
  }).success, true);
  assertEquals(pricingReferenceAnomaliesListInputSchema.safeParse({
    page: 1,
    page_size: 50,
    sort_by: 'activation'
  }).success, false);
  assertEquals(pricingReferenceRowsListInputSchema.safeParse({
    page: 1,
    page_size: 50,
    search: 'x'.repeat(121)
  }).success, false);
  assertEquals(pricingReferenceAnomaliesListResponseSchema.safeParse({
    ok: true,
    rows: [{
      id: '11111111-1111-4111-8111-111111111111',
      import_id: '22222222-2222-4222-8222-222222222222',
      snapshot_id: '33333333-3333-4333-8333-333333333333',
      source_file_id: '44444444-4444-4444-8444-444444444444',
      source_file: {
        file_kind: 'segments_grids',
        original_filename: 'segments.xlsx'
      },
      source_row_number: 8,
      type: 'purchase_grid_missing',
      severity: 'moyenne',
      object_type: null,
      object_id: null,
      columns: ['NUM_FOUR'],
      message: 'Champ grille achat structurel manquant.',
      details: { raw_values: { MARQUE: 'BOSCH' } },
      created_at: '2026-06-22T10:06:00.000Z'
    }],
    page: 1,
    page_size: 50,
    total: 1
  }).success, true);
  assertEquals(pricingReferenceAnomaliesListResponseSchema.safeParse({
    ok: true,
    rows: [{
      id: '11111111-1111-4111-8111-111111111111',
      import_id: '22222222-2222-4222-8222-222222222222',
      snapshot_id: null,
      source_file_id: null,
      source_file: null,
      source_row_number: null,
      type: 'purchase_grid_missing',
      severity: 'moyenne',
      object_type: null,
      object_id: null,
      columns: [],
      message: 'Champ grille achat structurel manquant.',
      details: {},
      created_at: '2026-06-22T10:06:00.000Z',
      status: 'nouvelle'
    }],
    page: 1,
    page_size: 50,
    total: 1
  }).success, false);
  assertEquals(pricingReferenceImportAnalyzeInputSchema.safeParse({
    import_id: '11111111-1111-4111-8111-111111111111'
  }).success, true);
  assertEquals(pricingReferenceImportAnalyzeInputSchema.safeParse({
    import_id: '11111111-1111-4111-8111-111111111111',
    activate: true
  }).success, false);
});

Deno.test('pricing reference column mapping contracts are strict', () => {
  const inspectPayload = {
    import_id: '11111111-1111-4111-8111-111111111111',
    file_id: '22222222-2222-4222-8222-222222222222',
    file_kind: 'classification',
    sheet_name: 'Feuil1'
  };

  assertEquals(pricingReferenceImportInspectInputSchema.safeParse(inspectPayload).success, true);
  assertEquals(pricingReferenceImportInspectInputSchema.safeParse({
    ...inspectPayload,
    unknown: true
  }).success, false);
  assertEquals(pricingReferenceImportInspectInputSchema.safeParse({
    ...inspectPayload,
    file_kind: 'supplier_prices'
  }).success, false);

  const confirmPayload = {
    import_id: '11111111-1111-4111-8111-111111111111',
    file_id: '22222222-2222-4222-8222-222222222222',
    file_kind: 'classification',
    sheet_name: 'Feuil1',
    column_mapping: {
      MEGA: 'Mega',
      FAM: 'Famille',
      SFA: 'Sous famille',
      MEGA_LIB: 'Libelle mega',
      FAM_LIB: 'Libelle famille',
      SFA_LIB: 'Libelle sous famille'
    },
    save_as_default: true
  };

  assertEquals(pricingReferenceImportConfirmMappingInputSchema.safeParse(confirmPayload).success, true);
  assertEquals(pricingReferenceImportConfirmMappingInputSchema.safeParse({
    ...confirmPayload,
    activate_snapshot: true
  }).success, false);
  assertEquals(pricingReferenceImportConfirmMappingInputSchema.safeParse({
    ...confirmPayload,
    column_mapping: {
      ...confirmPayload.column_mapping,
      UNKNOWN: 'Colonne inconnue'
    }
  }).success, false);
  assertEquals(pricingReferenceImportConfirmMappingInputSchema.safeParse({
    ...confirmPayload,
    column_mapping: {
      ...confirmPayload.column_mapping,
      MEGA: ''
    }
  }).success, false);
});

Deno.test('pricing reference tRPC namespace is protected and activate is absent', async () => {
  const appModule = await import('../app.ts');
  const prepareResponse = await appModule.default.request('/trpc/pricing.references.imports.prepare', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      files: {
        classification: {
          original_filename: 'classification.xlsx',
          size_bytes: 1024,
          sha256: 'a'.repeat(64)
        },
        segments_grids: {
          original_filename: 'segments.xlsx',
          size_bytes: 1024,
          sha256: 'b'.repeat(64)
        }
      }
    })
  });

  const prepareError = await readErrorData(prepareResponse);
  assertEquals(prepareResponse.status, 401);
  assertEquals(readString(prepareError, 'appCode'), 'AUTH_REQUIRED');

  const healthResponse = await appModule.default.request('/trpc/pricing.references.health.get', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: '{}'
  });
  const healthError = await readErrorData(healthResponse);
  assertEquals(healthResponse.status, 401);
  assertEquals(readString(healthError, 'appCode'), 'AUTH_REQUIRED');

  const activateResponse = await appModule.default.request('/trpc/pricing.references.imports.activate', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: '{}'
  });
  const activateError = await readErrorData(activateResponse);
  assertEquals(activateResponse.status, 404);
  assertEquals(readString(activateError, 'appCode'), 'NOT_FOUND');
  assertEquals(readNumber(activateError, 'httpStatus'), 404);
});

Deno.test('pricing reference diagnose contract validates correct structure', () => {
  const validPayload = {
    import_id: crypto.randomUUID(),
    file_type: 'classification',
    prompt_version_id: crypto.randomUUID(),
    model_config_id: crypto.randomUUID()
  };

  assertEquals(pricingReferenceDiagnoseInputSchema.safeParse(validPayload).success, true);
  assertEquals(pricingReferenceDiagnoseInputSchema.safeParse({
    file_type: 'segments_grids'
  }).success, true);
  assertEquals(pricingReferenceDiagnoseInputSchema.safeParse({
    ...validPayload,
    apiKey: 'sk-test-key'
  }).success, false);
  assertEquals(pricingReferenceDiagnoseInputSchema.safeParse({
    ...validPayload,
    inputCostPerMillion: 0.075
  }).success, false);

  const validResponse = {
    ok: true,
    ai_available: true,
    result: {
      summary: 'Anomalies a prioriser.',
      priority_anomalies: [{
        title: 'Cle inconnue',
        severity: 'haute',
        evidence: 'Une cle CIR absente de la classification.',
        recommendation: 'Verifier la cle dans le fichier source.'
      }],
      recommendations: ['Traiter les cles inconnues avant activation.'],
      limits: ['Analyse limitee au rapport de sante fourni.'],
      confidence: 0.82
    },
    usage: {
      provider: 'openrouter',
      model_id: 'deepseek/deepseek-v4-pro',
      input_tokens: 100,
      output_tokens: 40,
      cached_input_tokens: 0,
      reasoning_tokens: 0
    },
    cost: { amount: null, currency: 'USD', priced: false },
    cache: { hit: false }
  };

  assertEquals(pricingReferenceDiagnoseResponseSchema.safeParse(validResponse).success, true);
  assertEquals(pricingReferenceDiagnoseResponseSchema.safeParse({
    ...validResponse,
    result: { ...validResponse.result, confidence: 2 }
  }).success, false);
});

Deno.test('pricing reference correction assistance contracts are strict', () => {
  const scope = {
    import_id: '11111111-1111-4111-8111-111111111111'
  };
  assertEquals(pricingReferenceCorrectionPlanGetInputSchema.safeParse(scope).success, true);
  assertEquals(pricingReferenceCorrectionPlanGetInputSchema.safeParse({
    ...scope,
    auto_apply: true
  }).success, false);

  const correctionPlan = {
    ok: true,
    request_id: 'request-1',
    import_id: scope.import_id,
    snapshot_id: '22222222-2222-4222-8222-222222222222',
    generated_at: '2026-06-22T10:08:00.000Z',
    totals: { total: 1, bloquante: 0, haute: 0, moyenne: 1, faible: 0 },
    groups: [{
      id: 'grp-1',
      rank: 1,
      type: 'purchase_grid_missing',
      severity: 'moyenne',
      marque: 'PARK',
      segment: 'OKY',
      category: 'POMPE',
      columns: ['NUM_FOUR'],
      anomaly_count: 1,
      impacted_rows: 1,
      source_rows: [4766],
      source_files: [{
        file_kind: 'segments_grids',
        original_filename: 'segments.xlsx'
      }],
      message: 'Champ grille achat structurel manquant.',
      evidence: ['1 anomalie(s) dans ce groupe.'],
      excel_action: 'Completer dans Excel les champs de grille achat manquants: NUM_FOUR.',
      can_suggest_values: false,
      value_suggestion_reason: 'Aucune valeur proposee sans preuve deterministe majoritaire ou historique valide.'
    }],
    deterministic_recommendations: ['Corriger le fichier Excel source.'],
    ai_policy: {
      mode: 'secondary_interpretation_only',
      can_modify_source: false,
      can_modify_database: false,
      can_invent_values: false
    }
  };
  assertEquals(pricingReferenceCorrectionPlanResponseSchema.safeParse(correctionPlan).success, true);
  assertEquals(pricingReferenceCorrectionPlanResponseSchema.safeParse({
    ...correctionPlan,
    ai_policy: { ...correctionPlan.ai_policy, can_invent_values: true }
  }).success, false);

  const assistInput = {
    import_id: scope.import_id,
    file_id: '33333333-3333-4333-8333-333333333333',
    file_kind: 'segments_grids',
    sheet_name: 'Segments'
  };
  assertEquals(pricingReferenceImportAssistMappingInputSchema.safeParse(assistInput).success, true);
  assertEquals(pricingReferenceImportAssistMappingInputSchema.safeParse({
    ...assistInput,
    confirmMapping: true
  }).success, false);
  assertEquals(pricingReferenceImportAssistMappingResponseSchema.safeParse({
    ok: true,
    import_id: scope.import_id,
    file_id: assistInput.file_id,
    file_kind: 'segments_grids',
    sheet_name: 'Segments',
    mapping_status: 'a_confirmer',
    ai_needed: true,
    human_validation_required: true,
    worksheet_score: 0.8,
    header_quality: 0.72,
    expected_columns: ['SEGMENT'],
    detected_columns: ['Segment'],
    candidates: [{
      canonical_column: 'SEGMENT',
      source_column: 'Segment',
      status: 'a_confirmer',
      confidence: 0.82,
      reason: 'Similarite forte.'
    }],
    proposed_mapping: { SEGMENT: 'Segment' },
    evidence: ['1/1 colonne(s) mappees par le moteur deterministe.'],
    ai_policy: {
      trigger: 'ambiguous_or_invalid_only',
      response_schema: 'strict_mapping_candidate',
      can_confirm_mapping: false
    }
  }).success, true);
  assertEquals(pricingReferenceBatchCorrectionProposalsResponseSchema.safeParse({
    ok: true,
    import_id: scope.import_id,
    snapshot_id: '22222222-2222-4222-8222-222222222222',
    generated_at: '2026-06-22T10:08:00.000Z',
    proposals: [{
      id: 'batch-grp-1',
      group_id: 'grp-1',
      label: 'PARK · Champ grille achat structurel manquant.',
      anomaly_count: 1,
      columns: ['NUM_FOUR'],
      source_rows: [4766],
      manual_excel_action: 'Completer dans Excel.',
      proposed_values: [],
      status: 'proof_required',
      application_mode: 'manual_excel_only'
    }],
    automatic_apply_available: false
  }).success, true);
});

Deno.test('pricing reference correction plan groups anomalies deterministically without invented values', () => {
  const plan = buildPricingReferenceCorrectionPlanFromRows([
    {
      id: 'a1',
      import_id: '11111111-1111-4111-8111-111111111111',
      snapshot_id: '22222222-2222-4222-8222-222222222222',
      source_file_id: null,
      source_file: {
        file_kind: 'segments_grids',
        original_filename: 'segments.xlsx'
      },
      source_row_number: 4766,
      type: 'purchase_grid_missing',
      severity: 'moyenne',
      object_type: null,
      object_id: null,
      columns: ['NUM_FOUR'],
      message: 'Champ grille achat structurel manquant.',
      details: { segment_key: 'OKY|4661|PARK|POMPE' },
      created_at: '2026-06-22T10:06:00.000Z'
    },
    {
      id: 'a2',
      import_id: '11111111-1111-4111-8111-111111111111',
      snapshot_id: '22222222-2222-4222-8222-222222222222',
      source_file_id: null,
      source_file: {
        file_kind: 'segments_grids',
        original_filename: 'segments.xlsx'
      },
      source_row_number: 4767,
      type: 'purchase_grid_missing',
      severity: 'moyenne',
      object_type: null,
      object_id: null,
      columns: ['NUM_FOUR'],
      message: 'Champ grille achat structurel manquant.',
      details: { segment_key: 'OKY|4661|PARK|POMPE' },
      created_at: '2026-06-22T10:06:30.000Z'
    }
  ], 'request-1', '2026-06-22T10:08:00.000Z');

  assertEquals(plan.totals.total, 2);
  assertEquals(plan.groups.length, 1);
  assertEquals(plan.groups[0].marque, 'PARK');
  assertEquals(plan.groups[0].anomaly_count, 2);
  assertEquals(plan.groups[0].source_rows, [4766, 4767]);
  assertEquals(plan.groups[0].source_files, [{
    file_kind: 'segments_grids',
    original_filename: 'segments.xlsx'
  }]);
  assertEquals(plan.groups[0].can_suggest_values, false);
  assertEquals(plan.groups[0].value_suggestion_reason.includes('Aucune valeur proposee'), true);
});
