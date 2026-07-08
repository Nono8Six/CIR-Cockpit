import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ChangesTriage } from '@/components/pricing-references/components/changes/changes-triage';
import { createAppError } from '@/services/errors/AppError';
import {
  computePricingReferenceDiff,
  getPricingReferenceDiffSummary,
  listPricingReferenceDiffs
} from '@/services/pricingReferences';

const importA = '00000000-0000-4000-8000-0000000000a1';
const importB = '00000000-0000-4000-8000-0000000000b2';
const snapshotA = '00000000-0000-4000-8000-0000000000a9';
const snapshotB = '00000000-0000-4000-8000-0000000000b9';
const runId = '00000000-0000-4000-8000-0000000000c9';

const buildImportRow = (id: string, completedAt: string, segFilename: string, segSha: string) => ({
  id,
  status: 'analyse_ok' as const,
  created_by: null,
  analyzed_by: null,
  created_at: completedAt,
  updated_at: completedAt,
  analysis_started_at: completedAt,
  analysis_completed_at: completedAt,
  error_code: null,
  error_message: null,
  classification_rows_count: 12,
  segments_rows_count: 34,
  anomalies_total: 0,
  is_active_version: false as const,
  snapshot_status: null,
  activated_at: null,
  deactivated_at: null,
  files: [{
    // Classification réutilisée à l'identique entre les imports : une seule version.
    file_kind: 'classification' as const,
    original_filename: 'classification.xlsx',
    size_bytes: 2048,
    sha256: 'a'.repeat(64),
    row_count: 12,
    source: 'fourni' as const,
    source_import_id: null,
    source_import_created_at: null
  }, {
    file_kind: 'segments_grids' as const,
    original_filename: segFilename,
    size_bytes: 4096,
    sha256: segSha,
    row_count: 34,
    source: 'fourni' as const,
    source_import_id: null,
    source_import_created_at: null
  }]
});

const segmentRow1 = {
  id: '00000000-0000-4000-8000-0000000000d1',
  base_snapshot_id: snapshotB,
  target_snapshot_id: snapshotA,
  diff_type: 'modifie' as const,
  object_type: 'segment' as const,
  object_key: '001|42|BOSCH|CAT',
  severity: 'faible' as const,
  changed_columns: ['cat_fab_l'],
  payload: {
    changed_columns: ['cat_fab_l'],
    before: { cat_fab_l: 'Perceuses filaires' },
    after: { cat_fab_l: 'Perceuses sans fil' },
    labels: { segment_key: '001|42|BOSCH|CAT', segment: '001', marque: 'BOSCH', cat_fab: 'CAT' },
    source_row_numbers: { before: [8], after: [9] }
  },
  created_at: '2026-07-06T21:00:00.000Z'
};

const segmentRow2 = {
  ...segmentRow1,
  id: '00000000-0000-4000-8000-0000000000d2',
  object_key: '002|57|MAKITA|CAT2',
  payload: {
    ...segmentRow1.payload,
    before: { cat_fab_l: 'Visseuses' },
    after: { cat_fab_l: 'Visseuses à choc' },
    labels: { segment_key: '002|57|MAKITA|CAT2', segment: '002', marque: 'MAKITA', cat_fab: 'CAT2' }
  }
};

const grilleModifie = {
  id: '00000000-0000-4000-8000-0000000000d3',
  base_snapshot_id: snapshotB,
  target_snapshot_id: snapshotA,
  diff_type: 'modifie' as const,
  object_type: 'grille' as const,
  object_key: '001|42|BOSCH|CAT|10|1|A|2026-01-01|∅',
  severity: 'moyenne' as const,
  changed_columns: ['remise_ha', 'coef_retro'],
  payload: {
    changed_columns: ['remise_ha', 'coef_retro'],
    before: { remise_ha: '12', coef_retro: '1.5' },
    after: { remise_ha: '15', coef_retro: '1.8' },
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
  created_at: '2026-07-06T21:00:00.000Z'
};

const grilleSupprime = {
  ...grilleModifie,
  id: '00000000-0000-4000-8000-0000000000d4',
  diff_type: 'supprime' as const,
  object_key: '003|11|BOSCH|CAT|10|2|A|2026-01-01|∅',
  severity: 'haute' as const,
  changed_columns: ['remise_ha'],
  payload: {
    ...grilleModifie.payload,
    changed_columns: ['remise_ha'],
    before: { remise_ha: '18' },
    after: null,
    identity_note:
      'Identite grille: une modification de priorite ou de date apparait en suppression + ajout.',
    source_row_numbers: { before: [30], after: [] }
  }
};

const grilleAjoute = {
  ...grilleModifie,
  id: '00000000-0000-4000-8000-0000000000d5',
  diff_type: 'ajoute' as const,
  object_key: '003|11|BOSCH|CAT|10|3|A|2026-02-01|∅',
  severity: 'faible' as const,
  changed_columns: ['remise_ha'],
  payload: {
    ...grilleModifie.payload,
    changed_columns: ['remise_ha'],
    before: null,
    after: { remise_ha: '18' },
    source_row_numbers: { before: [], after: [31] }
  }
};

const summaryFixture = {
  ok: true as const,
  run_id: runId,
  base_snapshot_id: snapshotB,
  target_snapshot_id: snapshotA,
  status: 'computed' as const,
  initial_import: false,
  skipped_file_kinds: [],
  computed_at: '2026-07-06T21:00:00.000Z',
  total: 5,
  counts_by_type: [
    { object_type: 'segment' as const, diff_type: 'modifie' as const, count: 2 },
    { object_type: 'grille' as const, diff_type: 'modifie' as const, count: 1 },
    { object_type: 'grille' as const, diff_type: 'supprime' as const, count: 1 },
    { object_type: 'grille' as const, diff_type: 'ajoute' as const, count: 1 }
  ],
  counts_by_object_type: [
    {
      object_type: 'segment' as const,
      total: 2,
      by_severity: [{ severity: 'faible' as const, count: 2 }]
    },
    {
      object_type: 'grille' as const,
      total: 3,
      by_severity: [
        { severity: 'haute' as const, count: 1 },
        { severity: 'moyenne' as const, count: 1 },
        { severity: 'faible' as const, count: 1 }
      ]
    }
  ],
  changed_columns: [
    { column: 'cat_fab_l', count: 2 },
    { column: 'remise_ha', count: 3 },
    { column: 'coef_retro', count: 1 }
  ],
  financial_changes_count: 3,
  deviation_alerts: [{
    object_type: 'grille' as const,
    base_count: 4,
    deleted_count: 1,
    suppression_rate: 0.25,
    severity: 'haute' as const,
    message: 'Plus de 20 % des grilles achat ont été supprimées entre les deux versions.'
  }],
  snapshot_counters: {
    base: { classifications: 12, segments: 34, liaisons: 34, grilles: 56, anomalies: 2 },
    target: { classifications: 12, segments: 34, liaisons: 34, grilles: 55, anomalies: 1 }
  }
};

vi.mock('@/services/errors/handleUiError', () => ({
  handleUiError: vi.fn()
}));

vi.mock('@/services/pricingReferences', () => ({
  listPricingReferenceImports: vi.fn(async () => ({
    ok: true,
    imports: [
      buildImportRow(importA, '2026-07-06T18:57:00.000Z', 'segments-v2.xlsx', 'b'.repeat(64)),
      buildImportRow(importB, '2026-06-22T10:05:00.000Z', 'segments-v1.xlsx', 'c'.repeat(64))
    ],
    page: 1,
    page_size: 20,
    total: 2
  })),
  listPricingReferenceClassification: vi.fn(async (input: {
    import_id?: string;
    snapshot_id?: string;
  }) => {
    const snapshotByImport: Record<string, string> = {
      [importA]: snapshotA,
      [importB]: snapshotB
    };
    const importBySnapshot: Record<string, string> = {
      [snapshotA]: importA,
      [snapshotB]: importB
    };
    const snapshotId = input.import_id
      ? snapshotByImport[input.import_id]
      : input.snapshot_id;
    const importId = input.import_id ?? (input.snapshot_id ? importBySnapshot[input.snapshot_id] : undefined);
    return {
      ok: true,
      rows: snapshotId && importId
        ? [{
            id: '00000000-0000-4000-8000-0000000000e1',
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
          }]
        : [],
      page: 1,
      page_size: 1,
      total: snapshotId ? 1 : 0
    };
  }),
  getPricingReferenceDiffSummary: vi.fn(async () => summaryFixture),
  listPricingReferenceDiffs: vi.fn(async (input: { object_types?: string[] }) => {
    const objectType = input.object_types?.[0];
    const rows = objectType === 'segment'
      ? [segmentRow1, segmentRow2]
      : objectType === 'grille'
        ? [grilleModifie, grilleSupprime, grilleAjoute]
        : [];
    return {
      ok: true,
      run_id: runId,
      base_snapshot_id: snapshotB,
      target_snapshot_id: snapshotA,
      rows,
      total: rows.length
    };
  }),
  computePricingReferenceDiff: vi.fn(async () => ({
    ...summaryFixture,
    cache_status: 'computed'
  }))
}));

const renderTriage = (userRole: 'super_admin' | 'agency_admin' = 'agency_admin') => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false }
    }
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <ChangesTriage userRole={userRole} selectedImportId={null} />
    </QueryClientProvider>
  );
};

const missingRunError = () =>
  createAppError({
    code: 'PRICING_REFERENCE_DIFF_FAILED',
    message: 'Comparaison referentiel introuvable.',
    source: 'edge'
  });

describe('ChangesTriage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('affiche le résumé des impacts, les raccourcis financiers, l alerte de déviation et l aide D3', async () => {
    renderTriage();

    expect(await screen.findByText('Impacts')).toBeInTheDocument();
    expect(screen.getAllByText('Grilles achat').length).toBeGreaterThan(0);
    expect(
      screen.getByRole('button', { name: /grilles achat, 1 supprimé$/i })
    ).toBeInTheDocument();

    // Colonnes financières en tête, même avec moins d'occurrences que les libellés.
    const columnChips = screen.getAllByRole('button', { name: /filtrer la liste sur la colonne/i });
    expect(columnChips[0]).toHaveTextContent('remise_ha');
    expect(columnChips[1]).toHaveTextContent('coef_retro');

    // Alerte de déviation D2 (ambre, non bloquante) et aide D3 pour les grilles.
    expect(
      screen.getByText(/plus de 20 % des grilles achat ont été supprimées/i)
    ).toBeInTheDocument();
    expect(screen.getByText(/suppression \+ ajout, pas en modification/i)).toBeInTheDocument();

    // Sélecteurs de versions et date de calcul.
    expect(
      screen.getByRole('combobox', { name: /version cible de la comparaison/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('combobox', { name: /version de base de la comparaison/i })
    ).toBeInTheDocument();
    expect(screen.getByText(/calculée le/i)).toBeInTheDocument();
  });

  it('cadre la comparaison sur un seul fichier via le sélecteur de périmètre', async () => {
    const user = userEvent.setup();
    renderTriage();

    // Par défaut : périmètre Segments & grilles → seules ces données sont comparées.
    expect(await screen.findByText('Impacts')).toBeInTheDocument();
    expect(screen.getAllByText('Grilles achat').length).toBeGreaterThan(0);

    // Le sélecteur Cible pointe sur une version du fichier segments (nom exact),
    // jamais sur le fichier de classification.
    const targetSelect = screen.getByRole('combobox', {
      name: /version cible de la comparaison/i
    });
    expect(targetSelect).toHaveTextContent('segments-v2.xlsx');
    expect(targetSelect).not.toHaveTextContent('classification.xlsx');

    // Bascule sur la classification : le fichier segments n'est plus affiché du tout.
    await user.click(
      screen.getByRole('button', { name: /comparer le fichier classification produit cir/i })
    );
    expect(
      await screen.findByText(/aucun changement sur « classification produit cir »/i)
    ).toBeInTheDocument();
    expect(screen.queryByText('Grilles achat')).not.toBeInTheDocument();
    expect(screen.queryByText('Impacts')).not.toBeInTheDocument();
  });

  it('applique les filtres depuis les compteurs du résumé et depuis les chips de colonnes', async () => {
    const user = userEvent.setup();
    renderTriage();

    await user.click(
      await screen.findByRole('button', { name: /grilles achat, 1 supprimé$/i })
    );
    await waitFor(() => {
      expect(listPricingReferenceDiffs).toHaveBeenCalledWith(
        expect.objectContaining({ object_types: ['grille'], diff_types: ['supprime'] })
      );
    });

    await user.click(screen.getByRole('button', { name: /filtrer la liste sur la colonne remise_ha/i }));
    await waitFor(() => {
      expect(listPricingReferenceDiffs).toHaveBeenCalledWith(
        expect.objectContaining({ changed_columns: ['remise_ha'] })
      );
    });
  });

  it('priorise les colonnes financières dans la facette Colonne impactée', async () => {
    const user = userEvent.setup();
    renderTriage();

    await screen.findByText('Impacts');
    await user.click(screen.getByRole('button', { name: 'Colonne impactée' }));
    const options = await screen.findAllByRole('option');
    expect(options[0]).toHaveTextContent('remise_ha');
    expect(options[1]).toHaveTextContent('coef_retro');
    expect(options[2]).toHaveTextContent('cat_fab_l');
  });

  it('ouvre le dialog avant/après et navigue au clavier sans le fermer', async () => {
    const user = userEvent.setup();
    renderTriage();

    // Le premier groupe visible (Segments) est ouvert par défaut.
    const firstRow = await screen.findByRole('button', {
      name: /voir le détail du changement \(modifié\) : 001\|42\|BOSCH\|CAT/i
    });
    await user.click(firstRow);

    const dialog = await screen.findByRole('dialog');
    const before = within(dialog).getByText('Perceuses filaires');
    const after = within(dialog).getByText('Perceuses sans fil');
    expect(before).toHaveClass('line-through');
    expect(before).toHaveClass('text-stone-500');
    expect(after).toHaveClass('font-medium');
    expect(after).toHaveClass('text-stone-950');
    expect(within(dialog).getByText('L. 8')).toBeInTheDocument();
    expect(within(dialog).getByText('L. 9')).toBeInTheDocument();

    // ArrowDown passe au changement suivant du groupe, ArrowUp revient.
    await user.keyboard('{ArrowDown}');
    expect(await within(dialog).findByText('002|57|MAKITA|CAT2')).toBeInTheDocument();
    await user.keyboard('{ArrowUp}');
    expect(await within(dialog).findByText('001|42|BOSCH|CAT')).toBeInTheDocument();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('affiche la note d identité D3 dans le dialog d une grille supprimée', async () => {
    const user = userEvent.setup();
    renderTriage();

    await user.click(await screen.findByRole('button', { name: /^grilles achat/i }));
    const row = await screen.findByRole('button', {
      name: /voir le détail du changement \(supprimé\)/i
    });
    await user.click(row);

    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText(/suppression \+ ajout/i)).toBeInTheDocument();
    const removed = within(dialog).getByText('18');
    expect(removed).toHaveClass('line-through');
  });

  it('traite le premier import de référence sans jamais afficher « aucun changement »', async () => {
    vi.mocked(getPricingReferenceDiffSummary).mockResolvedValueOnce({
      ...summaryFixture,
      initial_import: true,
      base_snapshot_id: null,
      total: 0,
      counts_by_type: [],
      counts_by_object_type: [],
      changed_columns: [],
      financial_changes_count: 0,
      deviation_alerts: [],
      snapshot_counters: { ...summaryFixture.snapshot_counters, base: null }
    });
    renderTriage();

    expect(await screen.findByText('Premier import de référence')).toBeInTheDocument();
    expect(screen.getByText(/aucune comparaison n'existe encore/i)).toBeInTheDocument();
    expect(screen.queryByText(/aucun changement/i)).not.toBeInTheDocument();
  });

  it('affiche l empty state « aucun changement » pour un couple identique', async () => {
    vi.mocked(getPricingReferenceDiffSummary).mockResolvedValueOnce({
      ...summaryFixture,
      total: 0,
      counts_by_type: [],
      counts_by_object_type: [],
      changed_columns: [],
      financial_changes_count: 0,
      deviation_alerts: [],
      skipped_file_kinds: ['classification', 'segments_grids']
    });
    renderTriage();

    expect(
      await screen.findByText('Aucun changement sur « Segments & grilles fabricant »')
    ).toBeInTheDocument();
    expect(screen.getByText(/identique \(sha-256\)/i)).toBeInTheDocument();
  });

  it('réserve le calcul d une comparaison manquante au super admin', async () => {
    const user = userEvent.setup();
    vi.mocked(getPricingReferenceDiffSummary).mockRejectedValueOnce(missingRunError());
    renderTriage('super_admin');

    expect(await screen.findByText('Comparaison non calculée')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Calculer la comparaison' }));
    await waitFor(() => {
      expect(computePricingReferenceDiff).toHaveBeenCalledWith({
        target_snapshot_id: snapshotA,
        force: false
      });
    });
  });

  it('masque le bouton de calcul pour un rôle non super admin', async () => {
    vi.mocked(getPricingReferenceDiffSummary).mockRejectedValueOnce(missingRunError());
    renderTriage('agency_admin');

    expect(await screen.findByText('Comparaison non calculée')).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Calculer la comparaison' })
    ).not.toBeInTheDocument();
    expect(
      screen.getByText(/un super administrateur peut lancer le calcul/i)
    ).toBeInTheDocument();
  });
});
