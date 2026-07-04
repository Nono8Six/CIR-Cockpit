import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import PricingReferencesPage from '@/components/pricing-references/PricingReferencesPage';
import {
  analyzePricingReferenceImport,
  confirmPricingReferenceImportMapping,
  listAllPricingReferenceClassification,
  prepareUploadAndInspectPricingReferenceFile
} from '@/services/pricingReferences';

const importId = '00000000-0000-4000-8000-000000000001';
const snapshotId = '00000000-0000-4000-8000-000000000002';
const fileId = '00000000-0000-4000-8000-000000000006';
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

vi.mock('@/services/errors/notifySuccess', () => ({
  notifySuccess: vi.fn()
}));

vi.mock('@/services/ai', () => ({
  getAiSettings: vi.fn(async () => ({
    ok: true,
    providers: [],
    models: [],
    quotas: []
  })),
  listAiPrompts: vi.fn(async () => ({
    ok: true,
    prompts: [{
      id: '00000000-0000-4000-8000-000000000020',
      feature: 'pricing.references.diagnose',
      label: 'Diagnostic référentiels',
      description: null,
      variables: ['health_report'],
      created_at: '2026-06-27T16:00:00.000Z',
      updated_at: '2026-06-27T16:00:00.000Z',
      versions: [{
        id: '00000000-0000-4000-8000-000000000021',
        template_id: '00000000-0000-4000-8000-000000000020',
        version: 1,
        status: 'published',
        body: 'Prompt test',
        change_note: 'Version initiale',
        created_by: null,
        published_by: null,
        published_at: '2026-06-27T16:00:00.000Z',
        created_at: '2026-06-27T16:00:00.000Z',
        updated_at: '2026-06-27T16:00:00.000Z'
      }],
      published_version: {
        id: '00000000-0000-4000-8000-000000000021',
        template_id: '00000000-0000-4000-8000-000000000020',
        version: 1,
        status: 'published',
        body: 'Prompt test',
        change_note: 'Version initiale',
        created_by: null,
        published_by: null,
        published_at: '2026-06-27T16:00:00.000Z',
        created_at: '2026-06-27T16:00:00.000Z',
        updated_at: '2026-06-27T16:00:00.000Z'
      },
      draft_version: null
    }]
  })),
  saveAiPromptDraft: vi.fn(),
  publishAiPrompt: vi.fn(),
  restoreAiPrompt: vi.fn()
}));

vi.mock('@/services/pricingReferences', () => ({
  listPricingReferenceImports: vi.fn(async () => ({
    ok: true,
    imports: [{
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
      anomalies_total: 1
    }],
    page: 1,
    page_size: 50,
    total: 1
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
  getPricingReferenceAnomaliesSummary: vi.fn(async () => ({
    ok: true,
    total: 1,
    marques: [{
      marque: 'BOSCH',
      max_severity: 'moyenne',
      anomaly_count: 1,
      types: [{
        type: 'purchase_grid_missing',
        max_severity: 'moyenne',
        anomaly_count: 1
      }]
    }]
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
    }],
    page: 1,
    page_size: 50,
    total: 1
  })),
  getPricingReferenceCorrectionPlan: vi.fn(async () => ({
    ok: true,
    request_id: 'test-request',
    import_id: importId,
    snapshot_id: snapshotId,
    generated_at: '2026-06-22T10:08:00.000Z',
    totals: {
      total: 1,
      bloquante: 0,
      haute: 0,
      moyenne: 1,
      faible: 0
    },
    groups: [{
      id: 'grp-1',
      rank: 1,
      type: 'purchase_grid_missing',
      severity: 'moyenne',
      marque: 'BOSCH',
      segment: '001',
      category: 'CAT',
      columns: ['NUM_FOUR'],
      anomaly_count: 1,
      impacted_rows: 1,
      source_rows: [8],
      source_files: [{
        file_kind: 'segments_grids',
        original_filename: 'segments.xlsx'
      }],
      message: 'Champ grille achat structurel manquant.',
      evidence: ['1 anomalie(s) dans ce groupe.', 'Marque: BOSCH.', 'Lignes sources: 8.'],
      excel_action: 'Completer dans Excel les champs de grille achat manquants: NUM_FOUR.',
      can_suggest_values: false,
      value_suggestion_reason: 'Aucune valeur proposee sans preuve deterministe majoritaire ou historique valide.'
    }],
    deterministic_recommendations: [
      'Traiter les groupes les plus volumineux avant le reimport.',
      'Commencer par le groupe #1: Champ grille achat structurel manquant.',
      'Relancer un import controle apres correction du fichier Excel source.'
    ],
    ai_policy: {
      mode: 'secondary_interpretation_only',
      can_modify_source: false,
      can_modify_database: false,
      can_invent_values: false
    }
  })),
  getPricingReferenceBatchCorrectionProposals: vi.fn(async () => ({
    ok: true,
    request_id: 'test-request',
    import_id: importId,
    snapshot_id: snapshotId,
    generated_at: '2026-06-22T10:08:00.000Z',
    proposals: [{
      id: 'batch-grp-1',
      group_id: 'grp-1',
      label: 'BOSCH · Champ grille achat structurel manquant.',
      anomaly_count: 1,
      columns: ['NUM_FOUR'],
      source_rows: [8],
      manual_excel_action: 'Completer dans Excel les champs de grille achat manquants: NUM_FOUR.',
      proposed_values: [],
      status: 'proof_required',
      application_mode: 'manual_excel_only'
    }],
    automatic_apply_available: false
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

    expect(await screen.findByRole('tabpanel', { name: /imports/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /imports/i })).toHaveAttribute('aria-selected', 'true');
  });

  it('renders the CIR referentials workspace with import and consultation tabs', async () => {
    renderWithQueryClient(<PricingReferencesPage userRole="agency_admin" />);

    expect(await screen.findByRole('heading', { name: 'Référentiels CIR' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /imports/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /classification cir/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /segments fabricant/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /liaisons/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /importer la classification/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /importer les segments/i })).toBeDisabled();
    expect(screen.getAllByText('Réservé super admin')).toHaveLength(2);
    expect(await screen.findByText(/analyse ok/i)).toBeInTheDocument();
  });

  it('renders factual anomaly diagnostics and opens anomaly details', async () => {
    const user = userEvent.setup();
    renderWithQueryClient(<PricingReferencesPage userRole="agency_admin" />);

    await user.click(await screen.findByRole('tab', { name: /anomalies/i }));
    const anomalyPanel = await screen.findByRole('tabpanel', { name: /anomalies/i });

    const correctionPlanButton = await within(anomalyPanel).findByRole('button', { name: /plan de correction/i });
    expect(correctionPlanButton).toBeInTheDocument();
    expect(within(anomalyPanel).queryByRole('button', { name: /synthèse ia/i })).not.toBeInTheDocument();
    expect(within(anomalyPanel).queryByText('anomalies à corriger dans le fichier source')).not.toBeInTheDocument();
    expect(within(anomalyPanel).queryByText('Bloquantes')).not.toBeInTheDocument();
    expect(within(anomalyPanel).queryByText('Hautes')).not.toBeInTheDocument();
    expect(within(anomalyPanel).queryByText('Moyennes')).not.toBeInTheDocument();
    expect(within(anomalyPanel).queryByText('Faibles')).not.toBeInTheDocument();

    await user.click(correctionPlanButton);
    expect(await screen.findByRole('heading', { name: /plan de correction/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /interpréter avec ia/i })).toBeInTheDocument();
    expect(screen.getByText(/regroupement deterministe/i)).toBeInTheDocument();
    expect(screen.getAllByText(/aucune valeur proposee sans preuve deterministe/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/intérêt du plan/i)).toBeInTheDocument();
    expect(screen.getByText(/la page standard montre les anomalies ligne par ligne/i)).toBeInTheDocument();
    expect(screen.getByText(/lot sélectionné/i)).toBeInTheDocument();
    expect(screen.getByText(/où corriger/i)).toBeInTheDocument();
    expect(screen.getAllByText(/segments et grilles fabricant/i).length).toBeGreaterThan(0);
    expect(screen.getByText('segments.xlsx')).toBeInTheDocument();
    expect(screen.getAllByText(/lignes excel/i).length).toBeGreaterThan(0);
    expect(screen.getByLabelText(/rechercher dans les groupes/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/filtrer par sévérité/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/trier les groupes/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/groupes par page/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /précédent/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /suivant/i })).toBeDisabled();
    await user.type(screen.getByLabelText(/rechercher dans les groupes/i), 'rexr');
    expect(screen.getByText(/aucun groupe ne correspond aux filtres/i)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /fermer/i }));

    expect(screen.queryByText('Message détecté')).not.toBeInTheDocument();

    await user.type(screen.getByPlaceholderText('Filtrer marque...'), 'BOSCH');
    await user.click(await within(anomalyPanel).findByRole('button', { name: /BOSCH/i }));
    await user.type(screen.getByPlaceholderText('Filtrer type...'), 'grille');
    await user.click(await within(anomalyPanel).findByRole('button', { name: /grille achat incomplète/i }));
    await user.type(screen.getByPlaceholderText('Filtrer par ligne, msg...'), '8');
    await user.click(await within(anomalyPanel).findByRole('button', { name: /ligne 8/i }));

    expect(await screen.findByText('Message détecté')).toBeInTheDocument();
    expect(screen.getAllByText('Champ grille achat structurel manquant.').length).toBeGreaterThan(0);
    expect(screen.getByText('Segments / grilles fabricant - segments.xlsx')).toBeInTheDocument();
    expect(screen.getByText('Marque')).toBeInTheDocument();
    expect(screen.getByText('Catégorie fabricant')).toBeInTheDocument();
    expect(screen.getByText('ID numérique')).toBeInTheDocument();
    expect(screen.getAllByText('BOSCH').length).toBeGreaterThan(0);
    expect(screen.getByText(/correction dans le fichier excel source/i)).toBeInTheDocument();
    expect(screen.getByText(/champs excel à compléter/i)).toBeInTheDocument();
    expect(screen.getByText(/n° fournisseur/i)).toBeInTheDocument();
    expect(screen.getByText(/compléter les champs de grille achat structurels/i)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /fermer le détail de l'anomalie/i }));
    expect(screen.queryByText('Message détecté')).not.toBeInTheDocument();
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

    expect(await screen.findByText(/vue hiérarchique limitée/i)).toBeInTheDocument();
    expect(screen.getByText(/5.?001/)).toBeInTheDocument();
  });

  it('allows importing only the classification XLSX with mapping confirmation', async () => {
    const user = userEvent.setup();
    renderWithQueryClient(<PricingReferencesPage userRole="super_admin" />);

    const openDialogButton = await screen.findByRole('button', { name: /importer la classification/i });
    await user.click(openDialogButton);

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

    await user.click(await screen.findByRole('button', { name: /segments et grilles/i }));
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
    await user.click(await screen.findByRole('button', { name: /importer la classification/i }));
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
});
