import { expect, test, type Page } from '@playwright/test';

const superAdminEmail = process.env.E2E_ADMIN_EMAIL || process.env.E2E_USER_EMAIL;
const superAdminPassword = process.env.E2E_ADMIN_PASSWORD || process.env.E2E_USER_PASSWORD;
const role = process.env.E2E_USER_ROLE || (process.env.E2E_ADMIN_EMAIL ? 'super_admin' : '');
const isConfigured = Boolean(superAdminEmail && superAdminPassword);
const SKIP_REASON = 'E2E env missing: E2E_ADMIN_EMAIL / E2E_ADMIN_PASSWORD';

const importActive = '10000000-0000-4000-8000-000000000001';
const importCandidate = '10000000-0000-4000-8000-000000000002';
const snapshotActive = '10000000-0000-4000-8000-000000000011';
const snapshotCandidate = '10000000-0000-4000-8000-000000000022';
const runId = '10000000-0000-4000-8000-000000000033';

const classificationFile = {
  file_kind: 'classification',
  original_filename: 'Classification_produit_CIR_2026.xlsx',
  size_bytes: 2048,
  sha256: 'a'.repeat(64),
  row_count: 497,
  source: 'reutilise',
  source_import_id: importActive,
  source_import_created_at: '2026-06-27T13:04:00.000Z'
};

const segmentsFileV1 = {
  file_kind: 'segments_grids',
  original_filename: 'SEG_GRI_HA_27-06-2026.xlsx',
  size_bytes: 4096,
  sha256: 'b'.repeat(64),
  row_count: 12635,
  source: 'fourni',
  source_import_id: null,
  source_import_created_at: null
};

const segmentsFileV2 = {
  ...segmentsFileV1,
  original_filename: 'SEG_GRI_HA_07-07-2026_remises-mod.xlsx',
  sha256: 'c'.repeat(64)
};

const activeImport = {
  id: importActive,
  status: 'analyse_ok',
  created_by: null,
  analyzed_by: null,
  created_at: '2026-06-27T13:04:00.000Z',
  updated_at: '2026-06-27T13:10:00.000Z',
  analysis_started_at: '2026-06-27T13:05:00.000Z',
  analysis_completed_at: '2026-06-27T13:10:00.000Z',
  error_code: null,
  error_message: null,
  classification_rows_count: 497,
  segments_rows_count: 12635,
  anomalies_total: 0,
  is_active_version: true,
  snapshot_status: 'actif',
  activated_at: '2026-06-27T13:12:00.000Z',
  deactivated_at: null,
  files: [classificationFile, segmentsFileV1]
};

const candidateImport = {
  ...activeImport,
  id: importCandidate,
  created_at: '2026-07-07T16:23:00.000Z',
  updated_at: '2026-07-07T16:24:00.000Z',
  analysis_started_at: '2026-07-07T16:23:30.000Z',
  analysis_completed_at: '2026-07-07T16:24:00.000Z',
  is_active_version: false,
  snapshot_status: 'archive',
  activated_at: '2026-07-07T16:28:00.000Z',
  deactivated_at: '2026-07-07T16:32:00.000Z',
  files: [classificationFile, segmentsFileV2]
};

const healthReport = {
  generated_at: '2026-07-07T16:24:00.000Z',
  storage: {
    bucket: 'pricing-reference-sources',
    max_file_size_bytes: 52428800,
    allowed_extensions: ['.xlsx']
  },
  files: {
    classification: {
      file_kind: 'classification',
      original_filename: classificationFile.original_filename,
      storage_path: null,
      sha256: classificationFile.sha256,
      size_bytes: classificationFile.size_bytes,
      sheet_name: 'Classification',
      rows_count: 497,
      columns_count: 6,
      columns: { expected: [], detected: [], missing: [] }
    },
    segments_grids: {
      file_kind: 'segments_grids',
      original_filename: segmentsFileV2.original_filename,
      storage_path: null,
      sha256: segmentsFileV2.sha256,
      size_bytes: segmentsFileV2.size_bytes,
      sheet_name: 'SEG_GRI_HA',
      rows_count: 12635,
      columns_count: 25,
      columns: { expected: [], detected: [], missing: [] }
    }
  },
  classification: {
    rows_count: 497,
    columns_count: 6,
    unique_cir_keys: 497,
    duplicate_cir_keys: 0,
    mandatory_empty_rows: 0
  },
  segments_grids: {
    rows_count: 12635,
    columns_count: 25,
    unique_segment_identities: 9248,
    identity_incomplete_rows: 0,
    classification_incomplete_rows: 0,
    link_status_counts: { complete_valid: 9246, missing_classification: 2 },
    purchase_grid_rows_count: 12635
  },
  anomalies: { total: 0, by_severity: { bloquante: 0, haute: 0, moyenne: 0, faible: 0 } }
};

const diffSummary = {
  ok: true,
  run_id: runId,
  base_snapshot_id: snapshotActive,
  target_snapshot_id: snapshotCandidate,
  status: 'computed',
  initial_import: false,
  skipped_file_kinds: ['classification'],
  computed_at: '2026-07-07T16:24:30.000Z',
  total: 4,
  counts_by_type: [
    { object_type: 'liaison', diff_type: 'modifie', count: 1 },
    { object_type: 'grille', diff_type: 'modifie', count: 1 },
    { object_type: 'grille', diff_type: 'supprime', count: 1 },
    { object_type: 'grille', diff_type: 'ajoute', count: 1 }
  ],
  counts_by_object_type: [
    { object_type: 'liaison', total: 1, by_severity: [{ severity: 'moyenne', count: 1 }] },
    {
      object_type: 'grille',
      total: 3,
      by_severity: [
        { severity: 'haute', count: 1 },
        { severity: 'moyenne', count: 1 },
        { severity: 'faible', count: 1 }
      ]
    }
  ],
  changed_columns: [
    { column: 'remise_ha', count: 3 },
    { column: 'coef_retro', count: 1 },
    { column: 'link_status', count: 1 }
  ],
  financial_changes_count: 3,
  deviation_alerts: [{
    object_type: 'grille',
    base_count: 4,
    deleted_count: 1,
    suppression_rate: 0.25,
    severity: 'haute',
    message: 'Plus de 20 % des grilles achat ont été supprimées entre les deux versions.'
  }],
  snapshot_counters: {
    base: { classifications: 497, segments: 9248, liaisons: 9248, grilles: 12635, anomalies: 0 },
    target: { classifications: 497, segments: 9248, liaisons: 9248, grilles: 12634, anomalies: 0 }
  }
};

const grilleChange = {
  id: '10000000-0000-4000-8000-000000000044',
  base_snapshot_id: snapshotActive,
  target_snapshot_id: snapshotCandidate,
  diff_type: 'modifie',
  object_type: 'grille',
  object_key: '001|42|BOSCH|CAT|10|1|A|2026-01-01|∅',
  severity: 'moyenne',
  changed_columns: ['remise_ha', 'coef_retro'],
  payload: {
    changed_columns: ['remise_ha', 'coef_retro'],
    before: { remise_ha: '12', coef_retro: '1.50' },
    after: { remise_ha: '15', coef_retro: '1.80' },
    labels: {
      segment_key: '001|42|BOSCH|CAT',
      segment: '001',
      marque: 'BOSCH',
      cat_fab: 'CAT',
      num_four: '10',
      priorite: '1',
      type_grill: 'A'
    },
    source_row_numbers: { before: [20], after: [22] }
  },
  created_at: '2026-07-07T16:24:30.000Z'
};

const liaisonChange = {
  ...grilleChange,
  id: '10000000-0000-4000-8000-000000000045',
  diff_type: 'modifie',
  object_type: 'liaison',
  object_key: '001|42|BOSCH|CAT',
  severity: 'moyenne',
  changed_columns: ['link_status'],
  payload: {
    changed_columns: ['link_status'],
    before: { link_status: 'complete_valid' },
    after: { link_status: 'missing_classification' },
    labels: { segment_key: '001|42|BOSCH|CAT', segment: '001', marque: 'BOSCH', cat_fab: 'CAT' },
    source_row_numbers: { before: [11], after: [11] }
  }
};

const buildTrpcEnvelope = (data: unknown) => ({ result: { data } });
const buildTrpcBody = (responses: unknown[]): string =>
  JSON.stringify(responses.length === 1 ? responses[0] : responses);

const parseProcedures = (url: URL): string[] => {
  const procedurePath = url.pathname.split('/functions/v1/api/trpc/')[1]
    ?? url.pathname.split('/trpc/')[1]
    ?? '';
  return procedurePath.split(',').filter(Boolean);
};

const detailForImport = (importId: string) => {
  const summary = importId === importCandidate ? candidateImport : activeImport;
  const segmentFile = importId === importCandidate ? segmentsFileV2 : segmentsFileV1;
  return {
    ok: true,
    import: {
      ...summary,
      files: [{
        id: '10000000-0000-4000-8000-000000000099',
        import_id: summary.id,
        file_kind: 'segments_grids',
        original_filename: segmentFile.original_filename,
        storage_bucket: 'pricing-reference-sources',
        storage_path: `imports/${segmentFile.original_filename}`,
        size_bytes: segmentFile.size_bytes,
        sha256: segmentFile.sha256,
        content_type: null,
        sheet_name: 'SEG_GRI_HA',
        detected_columns: [],
        row_count: segmentFile.row_count,
        mapping_status: 'auto',
        created_at: summary.created_at
      }],
      effective_files: summary.files,
      health_report: null
    }
  };
};

const installPricingReferenceMocks = async (page: Page): Promise<void> => {
  await page.route('**/functions/v1/api/trpc/**', async (route) => {
    const url = new URL(route.request().url());
    const procedures = parseProcedures(url);
    const rawInput = `${url.searchParams.get('input') ?? ''} ${route.request().postData() ?? ''}`;

    const responses = procedures.map((procedure) => {
      switch (procedure) {
        case 'data.interactions':
          return buildTrpcEnvelope({
            request_id: 'req-interactions',
            ok: true,
            interactions: [],
            page: 1,
            page_size: 200,
            total: 0
          });
        case 'pricing.references.imports.list':
          return buildTrpcEnvelope({
            ok: true,
            imports: [candidateImport, activeImport],
            page: 1,
            page_size: rawInput.includes('page_size%22%3A50') ? 50 : 20,
            total: 2
          });
        case 'pricing.references.imports.get':
          return buildTrpcEnvelope(
            detailForImport(rawInput.includes(importCandidate) ? importCandidate : importActive)
          );
        case 'pricing.references.health.get':
          return buildTrpcEnvelope({ ok: true, health_report: healthReport });
        case 'pricing.references.classification.list': {
          const isCandidate = rawInput.includes(importCandidate) || rawInput.includes(snapshotCandidate);
          return buildTrpcEnvelope({
            ok: true,
            rows: [{
              id: '10000000-0000-4000-8000-000000000066',
              snapshot_id: isCandidate ? snapshotCandidate : snapshotActive,
              import_id: isCandidate ? importCandidate : importActive,
              source_row_number: 1,
              cir_key: '010203',
              mega: '01',
              fam: '02',
              sfa: '03',
              mega_lib: 'Outillage',
              fam_lib: 'Electroportatif',
              sfa_lib: 'Perceuses'
            }],
            page: 1,
            page_size: 1,
            total: 1
          });
        }
        case 'pricing.references.segments.list':
          return buildTrpcEnvelope({
            ok: true,
            rows: [],
            page: 1,
            page_size: 50,
            total: 0
          });
        case 'pricing.references.anomalies.summary':
          return buildTrpcEnvelope({
            ok: true,
            total: 0,
            groups_by_type: [],
            facets: { severities: [], types: [], marques: [] }
          });
        case 'pricing.references.diffs.summary':
          return buildTrpcEnvelope(diffSummary);
        case 'pricing.references.diffs.list': {
          const rows = rawInput.includes('liaison')
            ? rawInput.includes('remise_ha')
              ? []
              : [liaisonChange]
            : [grilleChange];
          return buildTrpcEnvelope({
            ok: true,
            run_id: runId,
            base_snapshot_id: snapshotActive,
            target_snapshot_id: snapshotCandidate,
            rows,
            total: rows.length
          });
        }
        case 'pricing.references.diffs.compute':
          return buildTrpcEnvelope({ ...diffSummary, cache_status: 'reused' });
        case 'pricing.references.imports.activate':
          return buildTrpcEnvelope({
            ok: true,
            import_id: importCandidate,
            snapshot_id: snapshotCandidate,
            activated_at: '2026-07-08T10:00:00.000Z',
            previous_snapshot_id: snapshotActive,
            previous_deactivated_at: '2026-07-08T10:00:00.000Z'
          });
        default:
          return null;
      }
    });

    if (responses.some((response) => response === null)) {
      await route.continue();
      return;
    }

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: buildTrpcBody(responses)
    });
  });
};

const login = async (page: Page): Promise<void> => {
  await page.goto('/');
  await page.getByLabel('Email').fill(superAdminEmail ?? '');
  await page.getByLabel('Mot de passe').fill(superAdminPassword ?? '');
  await page.getByRole('button', { name: /se connecter/i }).click();
  await expect(page.getByRole('button', { name: /recherche rapide/i })).toBeVisible();
};

test.skip(!isConfigured, SKIP_REASON);

test('versioning referentials flow covers imports, diff filters, before-after dialog and activation', async ({ page }) => {
  test.skip(role !== 'super_admin' && !process.env.E2E_ADMIN_EMAIL, 'scenario requires a super admin session');

  await installPricingReferenceMocks(page);
  await login(page);

  await page.goto('/remises/referentiels?tab=imports');
  await expect(page.getByRole('heading', { name: /référentiels cir/i })).toBeVisible();
  await expect(page.getByText('SEG_GRI_HA_07-07-2026_remises-mod.xlsx')).toBeVisible();
  await expect(page.getByText('Classification_produit_CIR_2026.xlsx').first()).toBeVisible();
  await expect(page.getByText('réutilisé').first()).toBeVisible();

  await page.getByRole('tab', { name: /changements/i }).click();
  await expect(page.getByRole('button', { name: /comparer le fichier segments & grilles fabricant/i })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByRole('combobox', { name: /version cible de la comparaison/i })).toContainText('SEG_GRI_HA_07-07-2026_remises-mod.xlsx');
  await expect(page.getByText('Impacts')).toBeVisible();

  await page.getByRole('button', { name: /filtrer la liste sur la colonne remise_ha/i }).click();
  await page.getByRole('button', { name: /^grilles achat\s+1$/i }).click();
  await expect(page.getByRole('button', { name: /voir le détail du changement/i }).first()).toBeVisible();
  await page.getByRole('button', { name: /voir le détail du changement/i }).first().click();

  const changeDialog = page.getByRole('dialog');
  await expect(changeDialog.getByText('Avant / après')).toBeVisible();
  await expect(changeDialog.getByText('remise_ha')).toBeVisible();
  await expect(changeDialog.getByText('12')).toBeVisible();
  await expect(changeDialog.getByText('15')).toBeVisible();
  await changeDialog.getByRole('button', { name: /fermer le détail du changement/i }).click();

  await page.getByRole('tab', { name: /imports/i }).click();
  await page.getByRole('button', { name: /voir le détail de l'import du 07\/07\/2026/i }).click();
  const importDialog = page.getByRole('dialog');
  await expect(importDialog.getByText(/^activée le/i)).toBeVisible();
  await importDialog.getByRole('button', { name: /réactiver cette version|activer cette version/i }).click();
  await expect(importDialog.getByText(/la version du/i)).toBeVisible();
  await importDialog.getByRole('button', { name: /confirmer la réactivation de cette version|confirmer l'activation de cette version/i }).click();
  await expect(importDialog).toHaveCount(0);
});
