import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { Table, TableBody, TableCell, TableRow } from '../data-display/Table';
import { Button } from '../inputs/basic/Button';
import { Input } from '../inputs/basic/Input';

describe('dense UI primitives', () => {
  it('keeps icon buttons on the 32px control grid', () => {
    render(<Button aria-label="Action rapide" size="icon" />);

    const button = screen.getByRole('button', { name: 'Action rapide' });
    expect(button.className).toContain('h-8');
    expect(button.className).toContain('w-8');
    expect(button.className).toContain('rounded-lg');
    expect(button.className).toContain('focus-visible:ring-2');
  });

  it('keeps toolbar inputs at 32px with the shared focus ring', () => {
    render(<Input aria-label="Recherche" density="toolbar" />);

    const input = screen.getByRole('textbox', { name: 'Recherche' });
    expect(input.className).toContain('h-8');
    expect(input.className).toContain('rounded-lg');
    expect(input.className).toContain('focus-visible:ring-2');
  });

  it('allows callers to remove the internal table scroll wrapper', () => {
    const { container } = render(
      <Table scrollArea={false}>
        <TableBody>
          <TableRow>
            <TableCell>Cellule</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    );

    expect(container.firstElementChild?.className).toContain('overflow-visible');
    expect(screen.getByText('Cellule').className).toContain('h-8');
  });
});
