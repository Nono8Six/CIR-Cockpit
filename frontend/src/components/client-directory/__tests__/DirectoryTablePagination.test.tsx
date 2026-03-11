import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import DirectoryTablePagination from '../data-table/DirectoryTablePagination';

describe('DirectoryTablePagination', () => {
  it('fournit un nom accessible aux controles de pagination', () => {
    render(
      <DirectoryTablePagination
        page={1}
        pageSize={50}
        total={120}
        onPageChange={vi.fn()}
        onPageSizeChange={vi.fn()}
      />
    );

    expect(screen.getByRole('combobox', { name: 'Nombre de lignes par page' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Première page' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Page précédente' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Page suivante' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Dernière page' })).toBeInTheDocument();
  });
});
