import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { DirectoryListRow, DirectorySortingRule } from 'shared/schemas/directory.schema';

import ClientDirectoryTable from '../ClientDirectoryTable';

const baseRow: DirectoryListRow = {
  id: '11111111-1111-1111-1111-111111111111',
  entity_type: 'Client',
  client_kind: 'company',
  client_number: '116277',
  account_type: 'cash',
  name: 'SEA',
  city: 'Gradignan',
  department: '33',
  agency_id: '22222222-2222-2222-2222-222222222222',
  agency_name: 'CIR Bordeaux',
  cir_commercial_id: null,
  cir_commercial_name: null,
  archived_at: null,
  updated_at: '2026-03-07T10:00:00.000Z'
};

interface RenderTableOptions {
  sorting?: DirectorySortingRule[];
  onSortChange?: (sorting: DirectorySortingRule[]) => void;
  onOpenRecord?: (row: DirectoryListRow) => void;
  rows?: DirectoryListRow[];
}

const renderTable = ({
  sorting = [{ id: 'updated_at', desc: false }],
  onSortChange = vi.fn(),
  onOpenRecord = vi.fn(),
  rows = [baseRow]
}: RenderTableOptions = {}) => {
  render(
    <ClientDirectoryTable
      rows={rows}
      sorting={sorting}
      page={1}
      pageSize={50}
      total={rows.length}
      isFetching={false}
      isInitialLoading={false}
      columnVisibility={{}}
      density="comfortable"
      onSortChange={onSortChange}
      onPageChange={vi.fn()}
      onPageSizeChange={vi.fn()}
      onOpenRecord={onOpenRecord}
    />
  );

  return { onSortChange, onOpenRecord };
};

describe('ClientDirectoryTable', () => {
  it('declenche un tri ascendant quand on clique sur une nouvelle colonne', async () => {
    const user = userEvent.setup();
    const { onSortChange } = renderTable();

    await user.click(screen.getByRole('button', { name: 'Trier la colonne Nom' }));

    expect(onSortChange).toHaveBeenCalledWith([{ id: 'name', desc: false }]);
  });

  it('inverse le tri quand la colonne est deja active', async () => {
    const user = userEvent.setup();
    const { onSortChange } = renderTable({
      sorting: [{ id: 'name', desc: false }]
    });

    await user.click(screen.getByRole('button', { name: 'Trier la colonne Nom' }));

    expect(onSortChange).toHaveBeenCalledWith([{ id: 'name', desc: true }]);
  });

  it('ajoute un tri secondaire avec shift+clic', () => {
    const { onSortChange } = renderTable({
      sorting: [{ id: 'updated_at', desc: false }]
    });

    fireEvent.click(screen.getByRole('button', { name: 'Trier la colonne Ville' }), { shiftKey: true });

    expect(onSortChange).toHaveBeenCalledWith([
      { id: 'updated_at', desc: false },
      { id: 'city', desc: false }
    ]);
  });

  it("n'ouvre pas la fiche quand on clique sur un header", async () => {
    const user = userEvent.setup();
    const { onOpenRecord } = renderTable();

    await user.click(screen.getByRole('button', { name: 'Trier la colonne Nom' }));

    expect(onOpenRecord).not.toHaveBeenCalled();
  });

  it('ouvre la fiche depuis le bouton du nom', async () => {
    const user = userEvent.setup();
    const { onOpenRecord } = renderTable();

    await user.click(screen.getByRole('button', { name: 'Ouvrir la fiche SEA' }));

    expect(onOpenRecord).toHaveBeenCalledWith(baseRow);
  });

  it('affiche un badge Archive quand archived_at est renseigne', () => {
    renderTable({
      rows: [{
        ...baseRow,
        archived_at: '2026-01-15T00:00:00.000Z'
      }]
    });

    expect(screen.getByText('Archive')).toBeInTheDocument();
  });

  it('affiche un badge Client pour chaque ligne active', () => {
    renderTable();

    expect(screen.getByText('Client')).toBeInTheDocument();
  });

  it('affiche un badge Prospect pour les libelles derives du helper partage', () => {
    renderTable({
      rows: [{
        ...baseRow,
        entity_type: 'Particulier prospect',
        client_number: null
      }]
    });

    expect(screen.getByText('Prospect')).toBeInTheDocument();
  });

  it('laisse les cellules manquantes vides sans tiret', () => {
    renderTable({
      rows: [{
        ...baseRow,
        client_number: null,
        city: null,
        department: null
      }]
    });

    expect(screen.queryByText('—')).not.toBeInTheDocument();
  });
});
