import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { ImportRow } from '@/components/pricing-references/components/imports/import-row';
import type { PricingReferenceImportsListResponse } from '../../../../../shared/schemas/pricing/references.schema';

type ImportSummary = PricingReferenceImportsListResponse['imports'][number];

const buildRow = (overrides: Partial<ImportSummary> = {}): ImportSummary => ({
  id: '00000000-0000-4000-8000-000000000001',
  status: 'analyse_ok',
  created_by: null,
  analyzed_by: null,
  created_at: '2026-07-01T08:30:00.000Z',
  updated_at: '2026-07-01T08:35:00.000Z',
  analysis_started_at: '2026-07-01T08:31:00.000Z',
  analysis_completed_at: '2026-07-01T08:35:00.000Z',
  error_code: null,
  error_message: null,
  classification_rows_count: 497,
  segments_rows_count: 12635,
  anomalies_total: 0,
  is_active_version: false,
  snapshot_status: null,
  activated_at: null,
  deactivated_at: null,
  files: [{
    file_kind: 'classification',
    original_filename: 'classification_cir_juillet.xlsx',
    size_bytes: 2048,
    sha256: 'a'.repeat(64),
    row_count: 497,
    source: 'fourni',
    source_import_id: null,
    source_import_created_at: null
  }, {
    file_kind: 'segments_grids',
    original_filename: 'tarifs_fabricant_juillet.xlsx',
    size_bytes: 409600,
    sha256: 'b'.repeat(64),
    row_count: 12635,
    source: 'fourni',
    source_import_id: null,
    source_import_created_at: null
  }],
  ...overrides
});

describe('ImportRow', () => {
  it('affiche le type, le nom exact et la date-heure pour deux fichiers fournis', () => {
    render(<ImportRow row={buildRow()} onOpenDetail={vi.fn()} />);

    const row = screen.getByRole('button', { name: /voir le détail de l'import du/i });
    expect(row).toHaveTextContent(/import du/i);
    expect(screen.getByText('Classification')).toBeInTheDocument();
    expect(screen.getByText('Segments & grilles')).toBeInTheDocument();
    expect(screen.getByText('classification_cir_juillet.xlsx')).toBeInTheDocument();
    expect(screen.getByText('tarifs_fabricant_juillet.xlsx')).toBeInTheDocument();
    expect(screen.queryByText('réutilisé')).not.toBeInTheDocument();
    expect(
      screen.getByTitle(/Classification CIR — classification_cir_juillet\.xlsx/)
    ).toBeInTheDocument();
  });

  it("signale la provenance d'un fichier réutilisé avec son import d'origine en tooltip", () => {
    const row = buildRow({
      files: [{
        file_kind: 'classification',
        original_filename: 'classification_cir_juin.xlsx',
        size_bytes: 2048,
        sha256: 'c'.repeat(64),
        row_count: 497,
        source: 'reutilise',
        source_import_id: '00000000-0000-4000-8000-000000000002',
        source_import_created_at: '2026-06-15T09:12:00.000Z'
      }, {
        file_kind: 'segments_grids',
        original_filename: 'tarifs_fabricant_juillet.xlsx',
        size_bytes: 409600,
        sha256: 'b'.repeat(64),
        row_count: 12635,
        source: 'fourni',
        source_import_id: null,
        source_import_created_at: null
      }]
    });
    render(<ImportRow row={row} onOpenDetail={vi.fn()} />);

    expect(screen.getByText('réutilisé')).toBeInTheDocument();
    expect(screen.getByTitle(/Réutilisé de l'import du/)).toBeInTheDocument();
  });

  it("mentionne le cycle de vie de version : activée le / archivée le", () => {
    const { rerender } = render(
      <ImportRow
        row={buildRow({
          is_active_version: true,
          snapshot_status: 'actif',
          activated_at: '2026-07-02T10:00:00.000Z'
        })}
        isActive
        onOpenDetail={vi.fn()}
      />
    );
    expect(screen.getByTitle(/version activée le/i)).toBeInTheDocument();

    rerender(
      <ImportRow
        row={buildRow({
          snapshot_status: 'archive',
          activated_at: '2026-07-01T10:00:00.000Z',
          deactivated_at: '2026-07-02T10:00:00.000Z'
        })}
        onOpenDetail={vi.fn()}
      />
    );
    expect(screen.getByTitle(/version archivée le/i)).toBeInTheDocument();
    expect(screen.queryByTitle(/version activée le/i)).not.toBeInTheDocument();
  });

  it("affiche un repli lisible quand aucun fichier n'est rattaché", () => {
    render(<ImportRow row={buildRow({ status: 'brouillon', files: [] })} onOpenDetail={vi.fn()} />);

    expect(screen.getByText('Aucun fichier rattaché')).toBeInTheDocument();
  });

  it("affiche le message d'erreur et ouvre le détail au clic", async () => {
    const user = userEvent.setup();
    const onOpenDetail = vi.fn();
    const row = buildRow({
      status: 'analyse_erreur',
      error_message: 'Colonne obligatoire absente du fichier segments.'
    });
    render(<ImportRow row={row} onOpenDetail={onOpenDetail} />);

    expect(
      screen.getByText('Colonne obligatoire absente du fichier segments.')
    ).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /voir le détail de l'import du/i }));
    expect(onOpenDetail).toHaveBeenCalledWith(row.id);
  });
});
