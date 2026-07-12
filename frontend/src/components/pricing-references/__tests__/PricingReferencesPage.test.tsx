import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import PricingReferencesPage from '@/components/pricing-references/PricingReferencesPage';
import {
  activatePricingReferenceImport,
  analyzePricingReferenceImport,
  confirmPricingReferenceImportMapping,
  exportPricingReferenceAnomalies,
  getPricingReferenceAnomaliesSummary,
  getPricingReferenceDiffSummary,
  getPricingReferenceImport,
  getPricingReferenceSegmentDetail,
  listAllPricingReferenceClassification,
  listPricingReferenceAnomalies,
  listPricingReferenceImports,
  prepareUploadAndInspectPricingReferenceFile
} from '@/services/pricingReferences';
import { notifySuccess } from '@/services/errors/notifySuccess';
import type {
  PricingReferenceImportGetResponse,
  PricingReferenceImportsListResponse,
  PricingReferenceSegmentDetailResponse
} from '../../../../../shared/schemas/pricing/references.schema';

const importId = '00000000-0000-4000-8000-000000000001';
const snapshotId = '00000000-0000-4000-8000-000000000002';
const fileId = '00000000-0000-4000-8000-000000000006';
const sourceImportId = '00000000-0000-4000-8000-000000000009';
const archivedImportId = '00000000-0000-4000-8000-000000000010';

type ImportSummaryFixture = PricingReferenceImportsListResponse['imports'][number];

// Scenario "segments seul" : la classification est réutilisée d'un import antérieur.
const effectiveFilesFixture = [{
  file_kind: 'classification' as const,
  original_filename: 'classification.xlsx',
  size_bytes: 2048,
  sha256: 'a'.repeat(64),
  row_count: 12,
  source: 'reutilise' as const,
  source_import_id: sourceImportId,
  source_import_created_at: '2026-06-15T09:12:00.000Z'
}, {
  file_kind: 'segments_grids' as const,
  original_filename: 'segments.xlsx',
  size_bytes: 4096,
  sha256: 'b'.repeat(64),
  row_count: 34,
  source: 'fourni' as const,
  source_import_id: null,
  source_import_created_at: null
}];
const buildImportSummary = (
  overrides: Partial<ImportSummaryFixture> = {}
): ImportSummaryFixture => ({
  id: importId,
  status: 'analyse_ok',
  created_by: null,
  analyzed_by: null,
  created_at: '2026-06-22T10:00:00.000Z',
  updated_at: '2026-06-22T10:05:00.000Z',
  analysis_started_at: '2026-06-22T10:01:00.000Z',
  analysis_completed_at: '2026-06-22T10:05:00.000Z',
  error_code: null,
  error_message: null,
  classification_rows_count: 12,
  segments_rows_count: 34,
  anomalies_total: 1,
  is_active_version: true,
  snapshot_status: 'actif',
  activated_at: '2026-06-22T10:06:00.000Z',
  deactivated_at: null,
  files: effectiveFilesFixture,
  ...overrides
});

// Scénario rollback : l'import le plus récent a été remplacé par la
// réactivation de l'import initial (deactivated_at récent === activated_at actif).
const rollbackImportFixtures = (): ImportSummaryFixture[] => [
  buildImportSummary({
    id: archivedImportId,
    created_at: '2026-07-01T08:30:00.000Z',
    updated_at: '2026-07-01T08:35:00.000Z',
    analysis_started_at: '2026-07-01T08:31:00.000Z',
    analysis_completed_at: '2026-07-01T08:35:00.000Z',
    is_active_version: false,
    snapshot_status: 'archive',
    activated_at: '2026-07-01T09:00:00.000Z',
    deactivated_at: '2026-07-02T09:00:00.000Z'
  }),
  buildImportSummary({ activated_at: '2026-07-02T09:00:00.000Z' })
];

const defaultImportsList = async (): Promise<PricingReferenceImportsListResponse> => ({
  ok: true,
  imports: [buildImportSummary()],
  page: 1,
  page_size: 50,
  total: 1
});

const buildImportDetailResponse = (
  summary: ImportSummaryFixture
): PricingReferenceImportGetResponse => ({
  ok: true,
  import: {
    ...summary,
    files: [{
      id: '00000000-0000-4000-8000-000000000008',
      import_id: summary.id,
      file_kind: 'segments_grids',
      original_filename: 'segments.xlsx',
      storage_bucket: 'pricing-reference-sources',
      storage_path: 'imports/segments.xlsx',
      size_bytes: 4096,
      sha256: 'b'.repeat(64),
      content_type: null,
      sheet_name: 'Feuil1',
      detected_columns: [],
      row_count: 34,
      mapping_status: 'auto',
      created_at: summary.created_at
    }],
    effective_files: effectiveFilesFixture,
    health_report: null
  }
});

const defaultGetImport = async (): Promise<PricingReferenceImportGetResponse> =>
  buildImportDetailResponse(buildImportSummary());

const defaultGetSegmentDetail = async (): Promise<PricingReferenceSegmentDetailResponse> => ({
  ok: true,
  segment: {
    id: '00000000-0000-4000-8000-000000000004',
    snapshot_id: snapshotId,
    import_id: importId,
    source_file_id: fileId,
    source_row_number: 1,
    segment_key: 'BOSCH|CAT|001|42',
    segment: '001',
    idnumerique: '42',
    marque: 'BOSCH',
    cat_fab: 'CAT',
    cat_fab_l: 'Perceuses filaires',
    strategiq: 'S',
    codif_fair: 'FAIR-01',
    tarif_fab: 'T1',
    cir_key: '010203',
    link_status: 'complete_valid',
    purchase_grid_rows_count: 1,
    link_source_row_number: 2,
    mega_famille: '01',
    famille: '02',
    sous_famille: '03',
    mega_libelle: 'Outillage',
    famille_libelle: 'Electroportatif',
    sfam_libelle: 'Perceuses'
  },
  purchase_grid_rows: [{
    id: '00000000-0000-4000-8000-000000000011',
    snapshot_id: snapshotId,
    import_id: importId,
    segment_id: '00000000-0000-4000-8000-000000000004',
    source_file_id: fileId,
    source_row_number: 12,
    num_four: 'F001',
    remise_ha: '12',
    col_ha: 'A',
    priorite: '1',
    type_grill: 'standard',
    date_debut_raw: '2026-01-01',
    date_fin_raw: '2026-12-31',
    date_debut_normalized: '2026-01-01',
    date_fin_normalized: '2026-12-31',
    borne_acha: '100',
    coef_retro: '0.95',
    coef_ha: '1.10',
    coef_majvte: '1.20'
  }]
});

const classificationColumns = ['MEGA', 'FAM', 'SFA', 'MEGA_LIB', 'FAM_LIB', 'SFA_LIB'] as const;
const segmentsColumns = [
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

const buildInspection = (
  fileKind: 'classification' | 'segments_grids',
  detectedColumns: readonly string[] = fileKind === 'classification' ? classificationColumns : segmentsColumns,
  proposedMapping: Record<string, string> = Object.fromEntries(detectedColumns.map((column) => [column, column])),
  missingColumns: readonly string[] = []
) => {
  const expectedColumns = fileKind === 'classification' ? classificationColumns : segmentsColumns;
  return {
    ok: true as const,
    import_id: importId,
    file_id: fileId,
    file_kind: fileKind,
    original_filename: fileKind === 'classification' ? 'classification.xlsx' : 'segments.xlsx',
    sheet_name: 'Feuil1',
    worksheets: ['Feuil1'],
    expected_columns: [...expectedColumns],
    detected_columns: [...detectedColumns],
    row_count: 1,
    sample_rows: [Object.fromEntries(detectedColumns.map((column) => [column, '1']))],
    candidates: expectedColumns.map((column) => ({
      canonical_column: column,
      source_column: proposedMapping[column] ?? null,
      status: missingColumns.includes(column) ? 'manquant' as const : 'auto' as const,
      confidence: missingColumns.includes(column) ? 0 : 1,
      reason: missingColumns.includes(column) ? 'Aucune colonne source fiable detectee.' : 'Nom exact detecte.'
    })),
    proposed_mapping: proposedMapping,
    mapping_status: missingColumns.length > 0 ? 'invalide' as const : 'auto' as const,
    default_profile: null
  };
};

vi.mock('@/services/errors/handleUiError', () => ({
  handleUiError: vi.fn()
}));

vi.mock('@/services/ai', () => ({
  askAiAssistant: vi.fn(),
  getAiAssistantStatus: vi.fn(async () => ({ enabled: true, model_id: 'mistralai/mistral-small', reason: null }))
}));

vi.mock('@/services/errors/notifySuccess', () => ({
  notifySuccess: vi.fn()
}));

vi.mock('@/hooks/directory/views/useDirectorySavedViews', () => ({
  useDirectorySavedViews: vi.fn(() => ({
    data: { views: [] },
    isLoading: false
  }))
}));

vi.mock('@/hooks/directory/views/useSaveDirectorySavedView', () => ({
  useSaveDirectorySavedView: vi.fn(() => ({ mutateAsync: vi.fn(), isPending: false }))
}));

vi.mock('@/hooks/directory/views/useDeleteDirectorySavedView', () => ({
  useDeleteDirectorySavedView: vi.fn(() => ({ mutateAsync: vi.fn(), isPending: false }))
}));

vi.mock('@/hooks/directory/views/useSetDefaultDirectorySavedView', () => ({
  useSetDefaultDirectorySavedView: vi.fn(() => ({ mutateAsync: vi.fn(), isPending: false }))
}));

vi.mock('@/services/pricingReferences', () => ({
  // Références paresseuses : la factory est hoistée avant les consts du module.
  listPricingReferenceImports: vi.fn(async () => defaultImportsList()),
  getPricingReferenceImport: vi.fn(async () => defaultGetImport()),
  getPricingReferenceSegmentDetail: vi.fn(async () => defaultGetSegmentDetail()),
  activatePricingReferenceImport: vi.fn(async (input: { import_id: string }) => ({
    ok: true,
    import_id: input.import_id,
    snapshot_id: snapshotId,
    activated_at: '2026-07-03T10:00:00.000Z',
    previous_snapshot_id: null,
    previous_deactivated_at: null
  })),
  getPricingReferenceHealth: vi.fn(async () => ({
    ok: true,
    health_report: {
      generated_at: '2026-06-22T10:07:00.000Z',
      storage: {
        bucket: 'pricing-reference-sources',
        max_file_size_bytes: 52428800,
        allowed_extensions: ['.xlsx']
      },
      files: {
        classification: {
          file_kind: 'classification',
          original_filename: 'classification.xlsx',
          storage_path: null,
          sha256: 'a'.repeat(64),
          size_bytes: 10,
          sheet_name: 'Feuil1',
          rows_count: 12,
          columns_count: 6,
          columns: { expected: [], detected: [], missing: [] }
        },
        segments_grids: {
          file_kind: 'segments_grids',
          original_filename: 'segments.xlsx',
          storage_path: null,
          sha256: 'b'.repeat(64),
          size_bytes: 10,
          sheet_name: 'Feuil1',
          rows_count: 34,
          columns_count: 10,
          columns: { expected: [], detected: [], missing: [] }
        }
      },
      classification: {
        rows_count: 12,
        columns_count: 6,
        unique_cir_keys: 12,
        duplicate_cir_keys: 0,
        mandatory_empty_rows: 0
      },
      segments_grids: {
        rows_count: 34,
        columns_count: 10,
        unique_segment_identities: 34,
        identity_incomplete_rows: 0,
        classification_incomplete_rows: 0,
        cir_keys_not_validated_rows: 0,
        purchase_grid_missing_rows: 0
      },
      anomalies: {
        total: 1,
        bloquante: 0,
        haute: 0,
        moyenne: 1,
        faible: 0
      },
      anomaly_samples: []
    }
  })),
  listPricingReferenceClassification: vi.fn(async () => ({
    ok: true,
    rows: [{
      id: '00000000-0000-4000-8000-000000000003',
      snapshot_id: snapshotId,
      import_id: importId,
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
    page_size: 50,
    total: 1
  })),
  listAllPricingReferenceClassification: vi.fn(async () => ({
    ok: true,
    rows: [{
      id: '00000000-0000-4000-8000-000000000003',
      snapshot_id: snapshotId,
      import_id: importId,
      source_row_number: 1,
      cir_key: '010203',
      mega: '01',
      fam: '02',
      sfa: '03',
      mega_lib: 'Outillage',
      fam_lib: 'Electroportatif',
      sfa_lib: 'Perceuses'
    }],
    total: 1,
    truncated: false
  })),
  getPricingReferenceAnomaliesSummary: vi.fn(async (input?: { severities?: string[] }) => (
    input?.severities?.includes('bloquante')
      ? {
        ok: true,
        total: 0,
        groups_by_type: [],
        facets: { severities: [], types: [], marques: [] }
      }
      : {
        ok: true,
        total: 2,
        groups_by_type: [{
          type: 'purchase_grid_missing',
          label: 'Grille achat incomplète',
          action_label: 'Compléter les champs de grille achat structurels dans le fichier source.',
          count: 2,
          max_severity: 'moyenne'
        }],
        facets: {
          severities: [{
            value: 'moyenne',
            label: 'Moyenne',
            count: 2,
            max_severity: 'moyenne'
          }],
          types: [{
            value: 'purchase_grid_missing',
            label: 'Grille achat incomplète',
            count: 2,
            max_severity: 'moyenne'
          }],
          marques: [{
            value: 'BOSCH',
            label: 'BOSCH',
            count: 2,
            max_severity: 'moyenne'
          }]
        }
      }
  )),
  exportPricingReferenceAnomalies: vi.fn(async () => ({
    ok: true,
    request_id: 'test-request',
    files: [{
      file_kind: 'classification',
      download_url: 'https://example.test/classification.xlsx',
      expires_at: '2026-06-22T11:06:00.000Z',
      filename: 'anomalies-referentiel-classification-test.xlsx',
      row_count: 12
    }, {
      file_kind: 'segments_grids',
      download_url: 'https://example.test/segments-grilles.xlsx',
      expires_at: '2026-06-22T11:06:00.000Z',
      filename: 'anomalies-referentiel-segments-grilles-test.xlsx',
      row_count: 34
    }],
    row_count: 46
  })),
  listPricingReferenceSegments: vi.fn(async () => ({
    ok: true,
    rows: [{
      id: '00000000-0000-4000-8000-000000000004',
      snapshot_id: snapshotId,
      import_id: importId,
      source_row_number: 1,
      segment_key: 'BOSCH|CAT|001|42',
      segment: '001',
      idnumerique: '42',
      marque: 'BOSCH',
      cat_fab: 'CAT',
      cat_fab_l: 'Perceuses filaires',
      strategiq: null,
      codif_fair: null,
      tarif_fab: null,
      cir_key: '010203',
      link_status: 'complete_valid',
      mega_famille: '01',
      famille: '02',
      sous_famille: '03',
      mega_libelle: 'Outillage',
      famille_libelle: 'Electroportatif',
      sfam_libelle: 'Perceuses',
      purchase_grid_rows_count: 3
    }],
    page: 1,
    page_size: 50,
    total: 1
  })),
  listPricingReferenceAnomalies: vi.fn(async () => ({
    ok: true,
    rows: [{
      id: '00000000-0000-4000-8000-000000000005',
      import_id: importId,
      snapshot_id: snapshotId,
      source_file_id: fileId,
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
      details: {
        raw_values: {
          MARQUE: 'BOSCH',
          CAT_FAB: 'CAT',
          SEGMENT: '001',
          IDNUMERIQUE: '42'
        }
      },
      created_at: '2026-06-22T10:06:00.000Z'
    }, {
      id: '00000000-0000-4000-8000-000000000007',
      import_id: importId,
      snapshot_id: snapshotId,
      source_file_id: fileId,
      source_file: {
        file_kind: 'segments_grids',
        original_filename: 'segments.xlsx'
      },
      source_row_number: 12,
      type: 'purchase_grid_missing',
      severity: 'moyenne',
      object_type: null,
      object_id: null,
      columns: ['BORNE_ACHA'],
      message: 'Colonne borne achat vide pour la grille.',
      details: {
        raw_values: {
          MARQUE: 'BOSCH',
          CAT_FAB: 'CAT',
          SEGMENT: '002',
          IDNUMERIQUE: '57'
        }
      },
      created_at: '2026-06-22T10:06:00.000Z'
    }],
    page: 1,
    page_size: 50,
    total: 2
  })),
  getPricingReferenceDiffSummary: vi.fn(async () => ({
    ok: true,
    run_id: '00000000-0000-4000-8000-00000000000c',
    base_snapshot_id: '00000000-0000-4000-8000-00000000000b',
    target_snapshot_id: snapshotId,
    status: 'computed',
    initial_import: false,
    skipped_file_kinds: [],
    computed_at: '2026-06-22T10:08:00.000Z',
    total: 3,
    counts_by_type: [{ object_type: 'grille', diff_type: 'modifie', count: 3 }],
    counts_by_object_type: [{
      object_type: 'grille',
      total: 3,
      by_severity: [{ severity: 'moyenne', count: 3 }]
    }],
    changed_columns: [{ column: 'remise_ha', count: 3 }],
    financial_changes_count: 3,
    deviation_alerts: [],
    snapshot_counters: {
      base: { classifications: 12, segments: 34, liaisons: 34, grilles: 56, anomalies: 2 },
      target: { classifications: 12, segments: 34, liaisons: 34, grilles: 56, anomalies: 1 }
    }
  })),
  listPricingReferenceDiffs: vi.fn(async () => ({
    ok: true,
    run_id: '00000000-0000-4000-8000-00000000000c',
    base_snapshot_id: '00000000-0000-4000-8000-00000000000b',
    target_snapshot_id: snapshotId,
    rows: [{
      id: '00000000-0000-4000-8000-00000000000d',
      base_snapshot_id: '00000000-0000-4000-8000-00000000000b',
      target_snapshot_id: snapshotId,
      diff_type: 'modifie',
      object_type: 'grille',
      object_key: '001|42|BOSCH|CAT|10|1|A|∅|∅',
      severity: 'moyenne',
      changed_columns: ['remise_ha'],
      payload: {
        changed_columns: ['remise_ha'],
        before: { remise_ha: '12' },
        after: { remise_ha: '15' },
        labels: { segment_key: '001|42|BOSCH|CAT', segment: '001', marque: 'BOSCH', cat_fab: 'CAT' },
        source_row_numbers: { before: [20], after: [22] }
      },
      created_at: '2026-06-22T10:08:00.000Z'
    }],
    total: 3
  })),
  computePricingReferenceDiff: vi.fn(async () => ({
    ok: true,
    run_id: '00000000-0000-4000-8000-00000000000c',
    base_snapshot_id: '00000000-0000-4000-8000-00000000000b',
    target_snapshot_id: snapshotId,
    status: 'computed',
    initial_import: false,
    skipped_file_kinds: [],
    computed_at: '2026-06-22T10:08:00.000Z',
    total: 3,
    counts_by_type: [{ object_type: 'grille', diff_type: 'modifie', count: 3 }],
    counts_by_object_type: [{
      object_type: 'grille',
      total: 3,
      by_severity: [{ severity: 'moyenne', count: 3 }]
    }],
    changed_columns: [{ column: 'remise_ha', count: 3 }],
    financial_changes_count: 3,
    deviation_alerts: [],
    snapshot_counters: {
      base: { classifications: 12, segments: 34, liaisons: 34, grilles: 56, anomalies: 2 },
      target: { classifications: 12, segments: 34, liaisons: 34, grilles: 56, anomalies: 1 }
    },
    cache_status: 'computed'
  })),
  prepareUploadAndInspectPricingReferenceFile: vi.fn(async (fileKind: 'classification' | 'segments_grids') => ({
    import_id: importId,
    prepared_file: {
      id: fileId,
      file_kind: fileKind,
      original_filename: fileKind === 'classification' ? 'classification.xlsx' : 'segments.xlsx',
      storage_bucket: 'pricing-reference-sources',
      storage_path: 'imports/test.xlsx',
      size_bytes: 10,
      sha256: 'a'.repeat(64),
      content_type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      signed_upload_url: 'https://example.test/upload',
      signed_upload_token: 'token',
      signed_upload_expires_in_seconds: 7200
    },
    inspection: buildInspection(fileKind)
  })),
  inspectPricingReferenceImport: vi.fn(async () => buildInspection('classification')),
  confirmPricingReferenceImportMapping: vi.fn(async (input) => ({
    ok: true,
    import_id: input.import_id,
    file_id: input.file_id,
    file_kind: input.file_kind,
    mapping_status: 'confirme',
    column_mapping: input.column_mapping,
    saved_profile: null
  })),
  analyzePricingReferenceImport: vi.fn(async () => ({
    ok: true,
    import_id: importId,
    snapshot_id: snapshotId,
    status: 'analyse_ok',
    health_report: {
      generated_at: '2026-06-22T10:07:00.000Z',
      storage: {
        bucket: 'pricing-reference-sources',
        max_file_size_bytes: 52428800,
        allowed_extensions: ['.xlsx']
      },
      files: {
        classification: {
          file_kind: 'classification',
          original_filename: 'classification.xlsx',
          storage_path: null,
          sha256: 'a'.repeat(64),
          size_bytes: 10,
          sheet_name: 'Feuil1',
          rows_count: 12,
          columns_count: 6,
          columns: { expected: [], detected: [], missing: [] }
        },
        segments_grids: {
          file_kind: 'segments_grids',
          original_filename: 'segments.xlsx',
          storage_path: null,
          sha256: 'b'.repeat(64),
          size_bytes: 10,
          sheet_name: 'Feuil1',
          rows_count: 34,
          columns_count: 10,
          columns: { expected: [], detected: [], missing: [] }
        }
      },
      classification: {
        rows_count: 12,
        columns_count: 6,
        unique_cir_keys: 12,
        duplicate_cir_keys: 0,
        mandatory_empty_rows: 0
      },
      segments_grids: {
        rows_count: 34,
        columns_count: 10,
        unique_segment_identities: 34,
        identity_incomplete_rows: 0,
        classification_incomplete_rows: 0,
        cir_keys_not_validated_rows: 0,
        purchase_grid_missing_rows: 0
      },
      anomalies: {
        total: 1,
        bloquante: 0,
        haute: 1,
        moyenne: 0,
        faible: 0
      },
      anomaly_samples: []
    }
  }))
}));

const renderWithQueryClient = (children: ReactNode) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false }
    }
  });

  return render(
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
};

describe('PricingReferencesPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Certains tests remplacent l'implémentation entière : rétablir la base.
    vi.mocked(listPricingReferenceImports).mockImplementation(defaultImportsList);
    vi.mocked(getPricingReferenceImport).mockImplementation(defaultGetImport);
    vi.mocked(getPricingReferenceSegmentDetail).mockImplementation(defaultGetSegmentDetail);
  });

  it('uses the route tab as the controlled source of truth', async () => {
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false }
      }
    });
    const onRouteTabChange = vi.fn();
    const view = render(
      <QueryClientProvider client={queryClient}>
        <PricingReferencesPage userRole="agency_admin" routeTab="anomalies" onRouteTabChange={onRouteTabChange} />
      </QueryClientProvider>
    );

    expect(await screen.findByRole('tabpanel', { name: /anomalies/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /anomalies/i })).toHaveAttribute('aria-selected', 'true');

    view.rerender(
      <QueryClientProvider client={queryClient}>
        <PricingReferencesPage userRole="agency_admin" routeTab={undefined} onRouteTabChange={onRouteTabChange} />
      </QueryClientProvider>
    );

    expect(await screen.findByRole('tabpanel', { name: /segments/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /segments/i })).toHaveAttribute('aria-selected', 'true');
  });

  it('renders the CIR referentials workspace with import and consultation tabs', async () => {
    const user = userEvent.setup();
    renderWithQueryClient(<PricingReferencesPage userRole="agency_admin" />);

    expect(await screen.findByRole('heading', { name: 'Référentiels CIR' })).toBeInTheDocument();
    expect(screen.getAllByRole('tab')).toHaveLength(5);
    expect(screen.getByRole('tab', { name: /imports/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /classification/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /segments/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /anomalies/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /changements/i })).toBeInTheDocument();
    expect(screen.queryByRole('tab', { name: /liaisons/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('tab', { name: /historique/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /importer/i })).not.toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /segments/i })).toHaveAttribute('aria-selected', 'true');
    expect(await screen.findByTestId('pricing-references-status-line')).toBeInTheDocument();

    await user.click(screen.getByRole('tab', { name: /imports/i }));
    expect(await screen.findByText('Actif')).toBeInTheDocument();
    expect(screen.getByText('Historique')).toBeInTheDocument();
    expect(screen.queryByText('Réservé super admin')).not.toBeInTheDocument();
    const activeRow = await screen.findByRole('button', { name: /voir le détail de l'import du/i });
    expect(activeRow).toHaveTextContent(/analyse ok/i);
    expect(activeRow).not.toHaveTextContent(importId);

    // Identité des fichiers au premier regard : type, nom exact, provenance réutilisée.
    expect(within(activeRow).getByText('Classification')).toBeInTheDocument();
    expect(within(activeRow).getByText('Segments & grilles')).toBeInTheDocument();
    expect(within(activeRow).getByText('classification.xlsx')).toBeInTheDocument();
    expect(within(activeRow).getByText('segments.xlsx')).toBeInTheDocument();
    expect(within(activeRow).getByText('réutilisé')).toBeInTheDocument();
  });

  it('renders grouped anomaly triage with lazy rows and a navigable detail dialog', async () => {
    const user = userEvent.setup();
    renderWithQueryClient(<PricingReferencesPage userRole="agency_admin" />);

    await user.click(await screen.findByRole('tab', { name: /anomalies/i }));
    const anomalyPanel = await screen.findByRole('tabpanel', { name: /anomalies/i });

    expect(within(anomalyPanel).queryByRole('button', { name: /plan de correction/i })).not.toBeInTheDocument();
    expect(within(anomalyPanel).queryByRole('button', { name: /synthèse ia/i })).not.toBeInTheDocument();
    expect(within(anomalyPanel).getByRole('button', { name: /exporter complet annoté/i })).toBeEnabled();

    // Groups are visible without any click; the first group is open by default.
    const groupHeader = await within(anomalyPanel).findByRole('button', { name: /grille achat incomplète/i });
    expect(groupHeader).toHaveAttribute('aria-expanded', 'true');
    const firstRow = await within(anomalyPanel).findByRole('button', { name: /ligne 8/i });
    expect(listPricingReferenceAnomalies).toHaveBeenCalledWith(
      expect.objectContaining({ types: ['purchase_grid_missing'] })
    );

    await user.click(firstRow);
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText('Champ grille achat structurel manquant.')).toBeInTheDocument();
    expect(within(dialog).getByText('Segments / grilles fabricant - segments.xlsx')).toBeInTheDocument();
    expect(within(dialog).getByText(/valeurs excel brutes/i)).toBeInTheDocument();
    expect(within(dialog).getByText(/compléter les champs de grille achat structurels/i)).toBeInTheDocument();
    expect(within(dialog).getByText(/n° fournisseur/i)).toBeInTheDocument();

    // In-dialog navigation: j/k shortcuts, arrow keys and up/down buttons.
    await user.keyboard('j');
    expect(await within(dialog).findByText('Colonne borne achat vide pour la grille.')).toBeInTheDocument();
    await user.keyboard('{ArrowUp}');
    expect(await within(dialog).findByText('Champ grille achat structurel manquant.')).toBeInTheDocument();
    await user.click(within(dialog).getByRole('button', { name: /anomalie suivante/i }));
    expect(await within(dialog).findByText('Colonne borne achat vide pour la grille.')).toBeInTheDocument();

    // Closing hands focus back to the row of the last viewed anomaly.
    await user.click(within(dialog).getByRole('button', { name: /fermer le détail/i }));
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
    expect(within(anomalyPanel).getByRole('button', { name: /ligne 12/i })).toHaveFocus();

    // The group collapses and hides its rows.
    await user.click(groupHeader);
    expect(groupHeader).toHaveAttribute('aria-expanded', 'false');
    expect(within(anomalyPanel).queryByRole('button', { name: /ligne 8/i })).not.toBeInTheDocument();
  });

  it('combines facet filters and forwards them to the summary and list queries', async () => {
    const user = userEvent.setup();
    renderWithQueryClient(<PricingReferencesPage userRole="agency_admin" />);

    await user.click(await screen.findByRole('tab', { name: /anomalies/i }));
    const anomalyPanel = await screen.findByRole('tabpanel', { name: /anomalies/i });
    await within(anomalyPanel).findByRole('button', { name: /ligne 8/i });

    await user.click(within(anomalyPanel).getByRole('button', { name: 'Sévérité' }));
    await user.click(await screen.findByRole('option', { name: /moyenne/i }));

    await waitFor(() => {
      expect(getPricingReferenceAnomaliesSummary).toHaveBeenCalledWith(
        expect.objectContaining({ severities: ['moyenne'] })
      );
      expect(listPricingReferenceAnomalies).toHaveBeenCalledWith(
        expect.objectContaining({ severities: ['moyenne'], types: ['purchase_grid_missing'] })
      );
    });

    expect(
      within(anomalyPanel).getByRole('button', { name: /réinitialiser le filtre sévérité/i })
    ).toBeInTheDocument();
  });

  it('expose l onglet Changements avec compteur et surface de comparaison', async () => {
    const user = userEvent.setup();
    renderWithQueryClient(<PricingReferencesPage userRole="agency_admin" />);

    const changesTab = await screen.findByRole('tab', { name: /changements/i });
    // Compteur de l'onglet : total du run automatique de la cible par défaut.
    await waitFor(() => {
      expect(changesTab).toHaveTextContent('3');
    });

    await user.click(changesTab);
    const panel = await screen.findByRole('tabpanel', { name: /changements/i });
    expect(await within(panel).findByText('Impacts')).toBeInTheDocument();
    expect(
      within(panel).getByRole('combobox', { name: /version cible de la comparaison/i })
    ).toBeInTheDocument();
    expect(
      within(panel).getByRole('combobox', { name: /version de base de la comparaison/i })
    ).toBeInTheDocument();
    expect(getPricingReferenceDiffSummary).toHaveBeenCalledWith({
      target_snapshot_id: snapshotId
    });
  });

  it('exports anomalies through the toolbar button with the signed download URL', async () => {
    const anchorClick = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(() => {});
    const user = userEvent.setup();
    renderWithQueryClient(<PricingReferencesPage userRole="agency_admin" />);

    await user.click(await screen.findByRole('tab', { name: /anomalies/i }));
    const anomalyPanel = await screen.findByRole('tabpanel', { name: /anomalies/i });
    await user.click(await within(anomalyPanel).findByRole('button', { name: /exporter complet annoté/i }));

    await waitFor(() => {
      expect(exportPricingReferenceAnomalies).toHaveBeenCalledWith({});
      expect(notifySuccess).toHaveBeenCalled();
    });
    await waitFor(() => {
      expect(anchorClick).toHaveBeenCalledTimes(2);
    });
    anchorClick.mockRestore();
  });

  it('preselects the blocking severity when navigating from the header status line', async () => {
    const user = userEvent.setup();
    renderWithQueryClient(<PricingReferencesPage userRole="agency_admin" />);

    await user.click(await screen.findByRole('button', { name: /voir les anomalies bloquantes/i }));
    const anomalyPanel = await screen.findByRole('tabpanel', { name: /anomalies/i });

    await waitFor(() => {
      expect(getPricingReferenceAnomaliesSummary).toHaveBeenCalledWith(
        expect.objectContaining({ severities: ['bloquante'] })
      );
    });

    // No anomaly matches the preset: distinct filtered empty state with a reset.
    expect(
      await within(anomalyPanel).findByText(/aucune anomalie ne correspond aux filtres/i)
    ).toBeInTheDocument();
    await user.click(within(anomalyPanel).getByRole('button', { name: /réinitialiser les filtres/i }));
    expect(
      await within(anomalyPanel).findByRole('button', { name: /grille achat incomplète/i })
    ).toBeInTheDocument();
  });

  it('shows the healthy empty state when the referential has no anomalies', async () => {
    vi.mocked(getPricingReferenceAnomaliesSummary).mockResolvedValueOnce({
      ok: true,
      total: 0,
      groups_by_type: [],
      facets: { severities: [], types: [], marques: [] }
    });

    renderWithQueryClient(
      <PricingReferencesPage userRole="agency_admin" routeTab="anomalies" onRouteTabChange={vi.fn()} />
    );

    expect(await screen.findByText('Aucune anomalie détectée')).toBeInTheDocument();
    expect(screen.queryByText(/aucune anomalie ne correspond aux filtres/i)).not.toBeInTheDocument();
  });

  it('opens the segment detail dialog from a segment row instead of an inline panel', async () => {
    const user = userEvent.setup();
    renderWithQueryClient(<PricingReferencesPage userRole="agency_admin" />);

    const segmentRow = await screen.findByRole('row', { name: /voir le détail du segment/i });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    await user.click(segmentRow);

    const detailDialog = await screen.findByRole('dialog');
    expect(within(detailDialog).getByText(/BOSCH · Perceuses filaires/)).toBeInTheDocument();
    expect(within(detailDialog).getAllByText('BOSCH|CAT|001|42').length).toBeGreaterThan(0);
    expect(await within(detailDialog).findByText('Identité fabricant')).toBeInTheDocument();
    expect(within(detailDialog).getByText('Classification CIR')).toBeInTheDocument();
    expect(within(detailDialog).getByText('Statut liaison')).toBeInTheDocument();
    expect(within(detailDialog).getByText('Traçabilité source')).toBeInTheDocument();
    expect(within(detailDialog).getByText('Conditions d’achat & rétrocession')).toBeInTheDocument();
    expect(within(detailDialog).getByText('FAIR-01')).toBeInTheDocument();
    expect(within(detailDialog).getByText('Méga-famille')).toBeInTheDocument();
    expect(within(detailDialog).getByText('01 · Outillage')).toBeInTheDocument();
    expect(within(detailDialog).getByText('02 · Electroportatif')).toBeInTheDocument();
    expect(within(detailDialog).getByText('03 · Perceuses')).toBeInTheDocument();
    expect(within(detailDialog).getByText('N° fournisseur')).toBeInTheDocument();
    expect(within(detailDialog).getByText('F001')).toBeInTheDocument();
    expect(within(detailDialog).getByText('Remise HA')).toBeInTheDocument();
    expect(within(detailDialog).getAllByText('× 0,95').length).toBeGreaterThan(0);
    expect(within(detailDialog).getAllByText('-5 %').length).toBeGreaterThan(0);
    expect(getPricingReferenceSegmentDetail).toHaveBeenCalledWith({
      segment_id: '00000000-0000-4000-8000-000000000004'
    });

    await user.click(within(detailDialog).getByRole('button', { name: /fermer/i }));
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });

  it('opens the import detail dialog and scopes the workspace to the consulted import', async () => {
    const user = userEvent.setup();
    renderWithQueryClient(
      <PricingReferencesPage userRole="agency_admin" routeTab="imports" onRouteTabChange={vi.fn()} />
    );

    expect(await screen.findByText('Snapshot actif')).toBeInTheDocument();
    await user.click(await screen.findByRole('button', { name: /voir le détail de l'import du/i }));

    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText('classification.xlsx')).toBeInTheDocument();
    expect(within(dialog).getByText('segments.xlsx')).toBeInTheDocument();
    expect(within(dialog).getByText(importId)).toBeInTheDocument();
    // Fichiers effectifs : provenance fourni/réutilisé, mapping et SHA-256 copiables.
    expect(within(dialog).getByText(/réutilisé de l'import du/i)).toBeInTheDocument();
    expect(within(dialog).getByText(/fourni dans cet import/i)).toBeInTheDocument();
    expect(within(dialog).getByText(/mapping automatique/i)).toBeInTheDocument();
    expect(
      within(dialog).getByRole('button', { name: "Copier l'identifiant de l'import" })
    ).toBeInTheDocument();
    expect(
      within(dialog).getByRole('button', { name: /copier l'identifiant de l'import d'origine/i })
    ).toBeInTheDocument();
    expect(
      within(dialog).getAllByRole('button', { name: /copier le sha-256 du fichier/i })
    ).toHaveLength(2);

    await user.click(within(dialog).getByRole('button', { name: /consulter cet import/i }));
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
    expect(screen.getByText('Import sélectionné')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /revenir au snapshot actif/i }));
    expect(screen.getByText('Snapshot actif')).toBeInTheDocument();
    expect(screen.queryByText('Import sélectionné')).not.toBeInTheDocument();
  });

  it('warns when the classification drilldown is capped by the backend contract', async () => {
    vi.mocked(listAllPricingReferenceClassification).mockResolvedValueOnce({
      ok: true,
      rows: [{
        id: '00000000-0000-4000-8000-000000000003',
        snapshot_id: snapshotId,
        import_id: importId,
        source_row_number: 1,
        cir_key: '010203',
        mega: '01',
        fam: '02',
        sfa: '03',
        mega_lib: 'Outillage',
        fam_lib: 'Electroportatif',
        sfa_lib: 'Perceuses'
      }],
      total: 5001,
      truncated: true
    });

    renderWithQueryClient(
      <PricingReferencesPage userRole="agency_admin" routeTab="classification" onRouteTabChange={vi.fn()} />
    );

    const truncationStatus = await screen.findByRole('status');
    expect(truncationStatus).toHaveTextContent(/vue hiérarchique limitée/i);
    expect(truncationStatus).toHaveTextContent(/5.?001/);
  });

  it('allows importing only the classification XLSX with mapping confirmation', async () => {
    const user = userEvent.setup();
    renderWithQueryClient(<PricingReferencesPage userRole="super_admin" />);

    await user.click(await screen.findByRole('button', { name: /^importer$/i }));
    await user.click(await screen.findByRole('menuitem', { name: /classification produit cir/i }));

    const previewButton = await screen.findByRole('button', { name: /previsualiser/i });
    const classificationInput = screen.getByLabelText('Classification produit CIR');

    expect(previewButton).toBeDisabled();

    await user.upload(
      classificationInput,
      new File(['classification'], 'classification.xlsx', {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      })
    );
    expect(previewButton).toBeEnabled();

    await user.click(previewButton);

    expect(await screen.findByText('Mapping complet')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /confirmer le mapping/i }));
    await user.click(await screen.findByRole('button', { name: /analyser l import/i }));

    await waitFor(() => {
      expect(prepareUploadAndInspectPricingReferenceFile).toHaveBeenCalledWith(
        'classification',
        expect.any(File),
        undefined,
        expect.any(Function)
      );
      expect(confirmPricingReferenceImportMapping).toHaveBeenCalledWith(expect.objectContaining({
        file_kind: 'classification',
        column_mapping: expect.objectContaining({ MEGA: 'MEGA' })
      }));
      expect(analyzePricingReferenceImport).toHaveBeenCalledWith(importId);
    });
  });

  it('allows importing only the segments/grids XLSX', async () => {
    const user = userEvent.setup();
    renderWithQueryClient(<PricingReferencesPage userRole="super_admin" />);

    await user.click(await screen.findByRole('button', { name: /^importer$/i }));
    await user.click(await screen.findByRole('menuitem', { name: /segments & grilles fabricant/i }));
    const previewButton = await screen.findByRole('button', { name: /previsualiser/i });
    const segmentsInput = screen.getByLabelText('Segments et grilles fabricant');
    await user.upload(
      segmentsInput,
      new File(['segments'], 'segments.xlsx', {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      })
    );
    await user.click(previewButton);

    await waitFor(() => {
      expect(prepareUploadAndInspectPricingReferenceFile).toHaveBeenCalledWith(
        'segments_grids',
        expect.any(File),
        undefined,
        expect.any(Function)
      );
    });
  });

  it('enables confirmation after a manual mapping for a renamed column', async () => {
    vi.mocked(prepareUploadAndInspectPricingReferenceFile).mockResolvedValueOnce({
      import_id: importId,
      prepared_file: {
        id: fileId,
        file_kind: 'classification',
        original_filename: 'classification.xlsx',
        storage_bucket: 'pricing-reference-sources',
        storage_path: 'imports/test.xlsx',
        size_bytes: 10,
        sha256: 'a'.repeat(64),
        content_type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        signed_upload_url: 'https://example.test/upload',
        signed_upload_token: 'token',
        signed_upload_expires_in_seconds: 7200
      },
      inspection: buildInspection(
        'classification',
        ['MEGA', 'FAM', 'SFA', 'LIB MEGA', 'FAM_LIB', 'SFA_LIB'],
        { MEGA: 'MEGA', FAM: 'FAM', SFA: 'SFA', FAM_LIB: 'FAM_LIB', SFA_LIB: 'SFA_LIB' },
        ['MEGA_LIB']
      )
    });

    const user = userEvent.setup();
    renderWithQueryClient(<PricingReferencesPage userRole="super_admin" />);
    await user.click(await screen.findByRole('button', { name: /^importer$/i }));
    await user.click(await screen.findByRole('menuitem', { name: /classification produit cir/i }));
    await user.upload(
      screen.getByLabelText('Classification produit CIR'),
      new File(['classification'], 'classification.xlsx', {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      })
    );
    await user.click(await screen.findByRole('button', { name: /previsualiser/i }));

    expect(await screen.findByText(/Colonnes obligatoires non mappees: MEGA_LIB/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /confirmer le mapping/i })).toBeDisabled();

    await user.selectOptions(screen.getByLabelText('Colonne source pour MEGA_LIB'), 'LIB MEGA');
    expect(screen.getByRole('button', { name: /confirmer le mapping/i })).toBeEnabled();
    await user.click(screen.getByRole('button', { name: /confirmer le mapping/i }));

    await waitFor(() => {
      expect(confirmPricingReferenceImportMapping).toHaveBeenCalledWith(expect.objectContaining({
        column_mapping: expect.objectContaining({ MEGA_LIB: 'LIB MEGA' })
      }));
    });
  });

  it("pilote la section ACTIF par is_active_version, pas par le premier import analysé", async () => {
    vi.mocked(listPricingReferenceImports).mockImplementation(async () => ({
      ok: true,
      imports: rollbackImportFixtures(),
      page: 1,
      page_size: 50,
      total: 2
    }));

    renderWithQueryClient(
      <PricingReferencesPage userRole="agency_admin" routeTab="imports" onRouteTabChange={vi.fn()} />
    );

    // L'import le plus récent (01/07) est analyse_ok mais archivé : il reste
    // dans l'historique. La vraie version active (22/06) porte la section ACTIF.
    const activeSection = await screen.findByRole('region', { name: /snapshot actif/i });
    expect(activeSection).toHaveTextContent(/import du 22\/06\/2026/i);
    expect(within(activeSection).getByTitle(/version activée le/i)).toBeInTheDocument();

    const historySection = screen.getByRole('region', { name: /historique des imports/i });
    expect(historySection).toHaveTextContent(/import du 01\/07\/2026/i);
    expect(historySection).not.toHaveTextContent(/import du 22\/06\/2026/i);
    expect(within(historySection).getByTitle(/version archivée le/i)).toBeInTheDocument();
  });

  it('affiche le cycle de vie et navigue dans la chaîne remplacée par / remplace', async () => {
    const user = userEvent.setup();
    vi.mocked(listPricingReferenceImports).mockImplementation(async () => ({
      ok: true,
      imports: rollbackImportFixtures(),
      page: 1,
      page_size: 50,
      total: 2
    }));
    vi.mocked(getPricingReferenceImport).mockImplementation(async ({ import_id }) => {
      const summary = rollbackImportFixtures().find((row) => row.id === import_id);
      return buildImportDetailResponse(summary ?? buildImportSummary());
    });

    renderWithQueryClient(
      <PricingReferencesPage userRole="super_admin" routeTab="imports" onRouteTabChange={vi.fn()} />
    );

    const historySection = await screen.findByRole('region', { name: /historique des imports/i });
    await user.click(
      within(historySection).getByRole('button', { name: /voir le détail de l'import du/i })
    );

    const dialog = await screen.findByRole('dialog');
    expect(await within(dialog).findByText('Archivée')).toBeInTheDocument();
    expect(dialog).toHaveTextContent(/activée le/i);
    expect(dialog).toHaveTextContent(/désactivée le/i);

    // deactivated_at (archivée) === activated_at (active) : chaîne sûre, cliquable.
    await user.click(within(dialog).getByRole('button', { name: /remplacée par l'import du/i }));
    expect(await within(dialog).findByText('Active')).toBeInTheDocument();
    expect(
      within(dialog).getByRole('button', { name: /remplace l'import du/i })
    ).toBeInTheDocument();
  });

  it('réactive une version archivée après confirmation explicite (rollback)', async () => {
    const user = userEvent.setup();
    vi.mocked(listPricingReferenceImports).mockImplementation(async () => ({
      ok: true,
      imports: rollbackImportFixtures(),
      page: 1,
      page_size: 50,
      total: 2
    }));
    vi.mocked(getPricingReferenceImport).mockImplementation(async ({ import_id }) => {
      const summary = rollbackImportFixtures().find((row) => row.id === import_id);
      return buildImportDetailResponse(summary ?? buildImportSummary());
    });

    renderWithQueryClient(
      <PricingReferencesPage userRole="super_admin" routeTab="imports" onRouteTabChange={vi.fn()} />
    );

    const historySection = await screen.findByRole('region', { name: /historique des imports/i });
    await user.click(
      within(historySection).getByRole('button', { name: /voir le détail de l'import du/i })
    );

    const dialog = await screen.findByRole('dialog');
    await user.click(await within(dialog).findByRole('button', { name: 'Réactiver cette version' }));

    // Confirmation intégrée au dialog : wording explicite de réactivation.
    expect(dialog).toHaveTextContent(/vous réactivez une version antérieure/i);
    expect(dialog).toHaveTextContent(/sera archivée mais restera consultable pour audit/i);

    await user.click(
      within(dialog).getByRole('button', { name: 'Confirmer la réactivation de cette version' })
    );
    await waitFor(() => {
      expect(activatePricingReferenceImport).toHaveBeenCalledWith({ import_id: archivedImportId });
    });
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });

  it("masque les actions d'activation pour un admin d'agence", async () => {
    const user = userEvent.setup();
    vi.mocked(listPricingReferenceImports).mockImplementation(async () => ({
      ok: true,
      imports: rollbackImportFixtures(),
      page: 1,
      page_size: 50,
      total: 2
    }));
    vi.mocked(getPricingReferenceImport).mockImplementation(async ({ import_id }) => {
      const summary = rollbackImportFixtures().find((row) => row.id === import_id);
      return buildImportDetailResponse(summary ?? buildImportSummary());
    });

    renderWithQueryClient(
      <PricingReferencesPage userRole="agency_admin" routeTab="imports" onRouteTabChange={vi.fn()} />
    );

    const historySection = await screen.findByRole('region', { name: /historique des imports/i });
    await user.click(
      within(historySection).getByRole('button', { name: /voir le détail de l'import du/i })
    );

    const dialog = await screen.findByRole('dialog');
    // Le cycle de vie reste consultable, l'action d'activation est réservée super_admin.
    expect(await within(dialog).findByText('Archivée')).toBeInTheDocument();
    expect(
      within(dialog).queryByRole('button', { name: /réactiver cette version/i })
    ).not.toBeInTheDocument();
    expect(
      within(dialog).queryByRole('button', { name: /activer cette version/i })
    ).not.toBeInTheDocument();
  });

  it("termine le flux d'import sur le résumé des changements et active la version", async () => {
    const user = userEvent.setup();
    renderWithQueryClient(<PricingReferencesPage userRole="super_admin" />);

    await user.click(await screen.findByRole('button', { name: /^importer$/i }));
    await user.click(await screen.findByRole('menuitem', { name: /classification produit cir/i }));
    await user.upload(
      screen.getByLabelText('Classification produit CIR'),
      new File(['classification'], 'classification.xlsx', {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      })
    );
    await user.click(await screen.findByRole('button', { name: /previsualiser/i }));
    await screen.findByText('Mapping complet');
    await user.click(screen.getByRole('button', { name: /confirmer le mapping/i }));
    await user.click(await screen.findByRole('button', { name: /analyser l import/i }));

    // Écran final : mini-résumé du run de diff automatique de l'analyse.
    expect(await screen.findByText('Analyse terminée')).toBeInTheDocument();
    expect(screen.getByText('Changements détectés')).toBeInTheDocument();
    expect(
      await screen.findByText('3 changements par rapport à la version de référence')
    ).toBeInTheDocument();
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveTextContent('Modifié');
    expect(dialog).toHaveTextContent(/colonnes financières/i);

    await user.click(screen.getByRole('button', { name: 'Activer cette version' }));
    expect(dialog).toHaveTextContent(/deviendra la référence pour toute l'application/i);
    expect(dialog).toHaveTextContent(/sera archivée mais restera consultable pour audit/i);

    await user.click(
      screen.getByRole('button', { name: "Confirmer l'activation de cette version" })
    );
    await waitFor(() => {
      expect(activatePricingReferenceImport).toHaveBeenCalledWith({ import_id: importId });
    });
    await waitFor(() => {
      expect(screen.queryByText('Analyse terminée')).not.toBeInTheDocument();
    });
  });

  it("bascule sur l'onglet Changements scopé depuis la fin du flux d'import", async () => {
    const user = userEvent.setup();
    renderWithQueryClient(<PricingReferencesPage userRole="super_admin" />);

    await user.click(await screen.findByRole('button', { name: /^importer$/i }));
    await user.click(await screen.findByRole('menuitem', { name: /classification produit cir/i }));
    await user.upload(
      screen.getByLabelText('Classification produit CIR'),
      new File(['classification'], 'classification.xlsx', {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      })
    );
    await user.click(await screen.findByRole('button', { name: /previsualiser/i }));
    await screen.findByText('Mapping complet');
    await user.click(screen.getByRole('button', { name: /confirmer le mapping/i }));
    await user.click(await screen.findByRole('button', { name: /analyser l import/i }));
    await screen.findByText('Analyse terminée');

    await user.click(screen.getByRole('button', { name: 'Voir les changements' }));
    await waitFor(() => {
      expect(screen.queryByText('Analyse terminée')).not.toBeInTheDocument();
    });
    expect(screen.getByRole('tab', { name: /changements/i })).toHaveAttribute(
      'aria-selected',
      'true'
    );
    expect(await screen.findByRole('tabpanel', { name: /changements/i })).toBeInTheDocument();
    // L'import analysé scope la page (pastille « Import sélectionné »).
    expect(screen.getByText('Import sélectionné')).toBeInTheDocument();
  });
});
